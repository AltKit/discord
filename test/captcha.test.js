'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { test } = require('node:test');
const { MockAgent } = require('undici');
const Client = require('../src/client/Client');
const ClientVoiceManager = require('../src/client/voice/ClientVoiceManager');
const VoiceConnection = require('../src/client/voice/VoiceConnection');
const APIRequest = require('../src/rest/APIRequest');
const DiscordAPIError = require('../src/rest/DiscordAPIError');
const HTTPError = require('../src/rest/HTTPError');
const RESTManager = require('../src/rest/RESTManager');
const RequestHandler = require('../src/rest/RequestHandler');
const Options = require('../src/util/Options');
const { VoiceStatus } = require('../src/util/Constants');
const handleVoiceServerUpdate = require('../src/client/websocket/handlers/VOICE_SERVER_UPDATE');

const challenge = {
  captcha_key: ['captcha-required'],
  captcha_sitekey: 'site-key',
  captcha_service: 'hcaptcha',
  captcha_rqdata: 'sensitive-rqdata',
  captcha_rqtoken: 'sensitive-rqtoken',
};

function jsonResponse(data, status = 400, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function createHarness({ captchaSolver = null, captchaRetryLimit = 3, responses = [] } = {}) {
  const client = new EventEmitter();
  client.options = {
    captchaSolver,
    captchaRetryLimit,
    retryLimit: 1,
    restTimeOffset: 0,
    invalidRequestWarningInterval: 0,
    rejectOnRateLimit: null,
    TOTPKey: null,
  };

  const manager = {
    client,
    globalLimit: Infinity,
    globalRemaining: Infinity,
    globalReset: null,
    globalDelay: null,
  };
  const calls = [];
  const request = {
    method: 'post',
    path: '/test',
    route: '/test',
    options: { data: { value: true } },
    retries: 0,
    captchaRetries: 0,
    fullUserAgent: 'test-agent',
    async make(captchaKey, captchaRqToken) {
      calls.push({ captchaKey, captchaRqToken });
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return response;
    },
  };

  return { calls, client, handler: new RequestHandler(manager), request };
}

test('surfaces CAPTCHA details when no callback is configured', async () => {
  const { handler, request } = createHarness({ responses: [jsonResponse(challenge)] });

  await assert.rejects(handler.execute(request), error => {
    assert.ok(error instanceof DiscordAPIError);
    assert.deepEqual(error.captcha, challenge);
    return true;
  });
});

test('accepts a malformed captcha_key shape without hiding the challenge', async () => {
  const malformedChallenge = { ...challenge, captcha_key: null };
  const debugMessages = [];
  const { calls, client, handler, request } = createHarness({
    captchaSolver: async () => 'captcha-response',
    responses: [jsonResponse(malformedChallenge), jsonResponse({ ok: true }, 200)],
  });
  client.on('debug', message => debugMessages.push(message));

  assert.deepEqual(await handler.execute(request), { ok: true });
  assert.deepEqual(calls[1], {
    captchaKey: 'captcha-response',
    captchaRqToken: 'sensitive-rqtoken',
  });
  assert.equal(request.captchaRetries, 1);
  assert.equal(request.retries, 0);
  assert.ok(debugMessages.every(message => !message.includes('captcha-response')));
  assert.ok(debugMessages.every(message => !message.includes('sensitive-rqtoken')));
  assert.ok(debugMessages.every(message => !message.includes('sensitive-rqdata')));
});

test('preserves callback failures', async () => {
  const solverError = new Error('solver unavailable');
  const { handler, request } = createHarness({
    captchaSolver: async () => {
      throw solverError;
    },
    responses: [jsonResponse(challenge)],
  });

  await assert.rejects(handler.execute(request), error => error === solverError);
});

test('rejects an invalid callback result', async () => {
  const { handler, request } = createHarness({
    captchaSolver: async () => ({ token: 'wrong shape' }),
    responses: [jsonResponse(challenge)],
  });

  await assert.rejects(handler.execute(request), {
    name: 'TypeError',
    message: 'CAPTCHA_SOLVER_INVALID_RESPONSE',
  });
});

test('redacts generated MFA codes from debug output', async () => {
  const debug = [];
  const mfaChallenge = {
    code: 60003,
    message: 'Two factor is required for this operation',
    mfa: { ticket: 'ticket', methods: [{ type: 'totp' }] },
  };
  const { client, handler, request } = createHarness({
    responses: [jsonResponse(mfaChallenge), jsonResponse({ ok: true }, 200)],
  });
  client.options.TOTPKey = 'TOTP_SECRET';
  client.authenticator = { generate: () => 'ONE_TIME_SECRET' };
  client.api = { mfa: { finish: { post: async () => ({ token: 'mfa-token' }) } } };
  client.on('debug', message => debug.push(message));

  assert.deepEqual(await handler.execute(request), { ok: true });
  assert.equal(debug.join('\n').includes('ONE_TIME_SECRET'), false);
});

test('does not replay after an ambiguous transport failure', async () => {
  const transportError = new Error('connection reset');
  const { calls, handler, request } = createHarness({
    captchaSolver: async () => 'captcha-response',
    responses: [jsonResponse(challenge), transportError, jsonResponse({ ok: true }, 200)],
  });

  await assert.rejects(handler.execute(request), error => {
    assert.ok(error instanceof HTTPError);
    assert.equal(error.cause, transportError);
    return true;
  });
  assert.equal(calls.length, 2);
  assert.equal(request.retries, 0);
});

test('uses separate HTTP dispatchers for separate REST managers', async t => {
  function createRest() {
    const dispatchers = [];
    const dispatcher = {};
    const client = {
      options: {
        http: {
          agent: {},
          api: 'https://discord.com/api',
          headers: { 'User-Agent': 'test-agent' },
          version: 9,
        },
        restRequestTimeout: 1_000,
        ws: { properties: {} },
      },
    };
    const rest = {
      client,
      async fetch(_url, options) {
        dispatchers.push(options.dispatcher);
        return jsonResponse({ ok: true }, 200);
      },
      getAuth: () => 'token',
      getDispatcher: () => dispatcher,
    };
    return { dispatchers, rest };
  }

  const first = createRest();
  const second = createRest();
  const options = { auth: false, route: '/test' };
  await new APIRequest(first.rest, 'get', '/test', options).make();
  await new APIRequest(first.rest, 'get', '/test', options).make();
  await new APIRequest(second.rest, 'get', '/test', options).make();

  assert.equal(first.dispatchers[0], first.dispatchers[1]);
  assert.notEqual(first.dispatchers[0], second.dispatchers[0]);

  t.after(() => {});
});

test('uses custom REST origins and releases manager-owned resources', async () => {
  const origin = 'https://api.example.test';
  const mockAgent = new MockAgent();
  mockAgent.disableNetConnect();
  mockAgent
    .get(origin)
    .intercept({ path: '/health', method: 'GET' })
    .reply(200, { ok: true }, { headers: { 'content-type': 'application/json' } });
  const client = new EventEmitter();
  client.token = 'token';
  client.options = {
    http: {
      agent: {},
      api: origin,
      headers: { 'User-Agent': 'test-agent' },
      version: 9,
    },
    restGlobalRateLimit: 0,
    restRequestTimeout: 1_000,
    restSweepInterval: 0,
    ws: { properties: {} },
  };
  const rest = new RESTManager(client);
  rest.dispatcher = mockAgent;
  const result = await new APIRequest(rest, 'get', '/health', {
    auth: false,
    route: '/health',
    versioned: false,
  }).make();
  assert.deepEqual(await result.json(), { ok: true });

  rest.cookieJar.setCookieSync('session=secret', origin);
  rest.destroy();
  rest.destroy();
  assert.equal(rest.cookieJar.getCookiesSync(origin).length, 0);

  const directRest = new RESTManager(client);
  const dispatcher = directRest.getDispatcher();
  directRest.destroy();
  assert.equal(dispatcher.destroyed, true);

  const proxiedClient = {
    ...client,
    options: {
      ...client.options,
      http: { ...client.options.http, agent: 'http://127.0.0.1:65535' },
    },
  };
  const proxiedRest = new RESTManager(proxiedClient);
  assert.equal(proxiedRest.getDispatcher().constructor.name, 'ProxyAgent');
  proxiedRest.destroy();
});

test('validates retry and rate-limit options before use', () => {
  for (const options of [
    { retryLimit: -1 },
    { retryLimit: 1.5 },
    { retryLimit: NaN },
    { captchaRetryLimit: -1 },
    { captchaRetryLimit: 1.5 },
    { restRequestTimeout: Infinity },
    { rejectOnRateLimit: ['/channels', 1] },
  ]) {
    assert.throws(() => new Client(options), /CLIENT_INVALID_OPTION/);
  }

  const client = new Client({ retryLimit: Infinity, captchaRetryLimit: 0 });
  client.destroy();
});

test('defaults REST and gateway traffic to Discord API v10 and generates TOTP codes with otplib v13', () => {
  const options = Options.createDefault();
  assert.equal(options.http.version, 10);
  assert.equal(options.ws.version, 10);

  const client = new Client();
  assert.match(client.authenticator.generate('JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'), /^\d{6}$/);
  client.destroy();
});

test('redacts authentication and voice credentials from debug output', async () => {
  const loginToken = 'login-secret-token';
  const debug = [];
  const client = new Client();
  client.ws.connect = async () => {};
  client.on('debug', message => debug.push(message));
  await client.login(loginToken);
  client.destroy();

  const voiceClient = new EventEmitter();
  voiceClient.guilds = { cache: new Map() };
  voiceClient.channels = { cache: new Map() };
  voiceClient.user = { id: 'user' };
  const voiceDebug = [];
  voiceClient.on('debug', message => voiceDebug.push(message));
  const manager = new ClientVoiceManager(voiceClient);
  manager.onVoiceServer({ guild_id: 'guild', token: 'voice-secret', endpoint: 'voice.example.test' });
  manager.onVoiceStateUpdate({
    guild_id: 'guild',
    session_id: 'session-secret',
    channel_id: 'channel',
    user_id: 'user',
  });

  const connectionDebug = [];
  const connection = {
    authentication: { token: null, endpoint: null, sessionId: null },
    status: VoiceStatus.AUTHENTICATING,
    emit: (_event, message) => connectionDebug.push(message),
    checkAuthenticated: () => {},
    authenticateFailed: () => {},
  };
  VoiceConnection.prototype.setTokenAndEndpoint.call(connection, 'voice-secret', 'voice.example.test:443');
  VoiceConnection.prototype.setSessionId.call(connection, 'session-secret');

  const output = [...debug, ...voiceDebug, ...connectionDebug].join('\n');
  for (const secret of [loginToken, 'voice-secret', 'voice.example.test', 'session-secret']) {
    assert.equal(output.includes(secret), false, secret);
  }
});

test('redacts credentials from raw voice server diagnostics', () => {
  const debug = [];
  const packet = {
    d: {
      guild_id: 'guild',
      token: 'voice-server-token',
      endpoint: 'voice.example.test',
    },
  };
  const client = {
    emit(event, value) {
      if (event === 'debug') debug.push(value);
    },
    voice: {
      onVoiceServer(payload) {
        assert.equal(payload, packet.d);
      },
    },
  };

  handleVoiceServerUpdate(client, packet);

  const output = debug.join('\n');
  assert.equal(output.includes(packet.d.token), false);
  assert.equal(output.includes(packet.d.endpoint), false);
});
