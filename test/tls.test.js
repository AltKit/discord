'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const https = require('node:https');
const { test } = require('node:test');
const RESTManager = require('../src/rest/RESTManager');
const { ciphers } = require('../src/util/Constants');
const Util = require('../src/util/Util');

function createRESTClient(agent, tls = {}) {
  return {
    options: {
      http: {
        agent,
        tls,
        api: 'https://discord.com/api',
        cdn: 'https://cdn.discordapp.com',
      },
      restGlobalRateLimit: 0,
      restSweepInterval: 0,
    },
  };
}

function readSymbol(object, description) {
  const symbol = Object.getOwnPropertySymbols(object).find(candidate => String(candidate) === `Symbol(${description})`);
  return symbol ? object[symbol] : undefined;
}

test('creates secure TLS defaults while allowing explicit overrides', () => {
  const defaults = Util.createTLSOptions();
  assert.equal(defaults.minVersion, 'TLSv1.2');
  assert.equal(defaults.honorCipherOrder, true);
  assert.equal(defaults.ciphers, ciphers.join(':'));

  const configured = Util.createTLSOptions({
    ciphers: 'CUSTOM-CIPHER',
    honorCipherOrder: false,
    minVersion: 'TLSv1.3',
    rejectUnauthorized: false,
  });
  assert.deepEqual(configured, {
    ciphers: 'CUSTOM-CIPHER',
    honorCipherOrder: false,
    minVersion: 'TLSv1.3',
    rejectUnauthorized: false,
  });

  const legacyProtocol = Util.createTLSOptions({ secureProtocol: 'TLSv1_2_method' });
  assert.equal(legacyProtocol.secureProtocol, 'TLSv1_2_method');
  assert.equal('minVersion' in legacyProtocol, false);
});

test('resolves WebSocket TLS options and concrete HTTPS proxy agents', t => {
  const httpAgent = new http.Agent();
  const httpsAgent = new https.Agent();
  t.after(() => {
    httpAgent.destroy();
    httpsAgent.destroy();
  });

  const proxied = Util.resolveWebSocketTLS({
    agent: { httpAgent, httpsAgent },
    tls: { minVersion: 'TLSv1.3', rejectUnauthorized: false },
  });
  assert.equal(proxied.agent, httpsAgent);
  assert.equal(proxied.minVersion, 'TLSv1.3');
  assert.equal(proxied.rejectUnauthorized, false);

  const legacy = Util.resolveWebSocketTLS({ agent: { ca: 'legacy-ca' } });
  assert.equal(legacy.ca, 'legacy-ca');
  assert.equal(legacy.minVersion, 'TLSv1.2');
  assert.equal(Util.verifyProxyAgent(null), false);
});

test('passes destination TLS settings through an Undici proxy agent', () => {
  const client = createRESTClient(
    {
      uri: 'http://127.0.0.1:65535',
      requestTls: { ca: 'destination-ca', minVersion: 'TLSv1.3' },
      proxyTls: { ca: 'proxy-ca' },
    },
    { ciphers: 'CUSTOM-CIPHER', rejectUnauthorized: false },
  );
  const rest = new RESTManager(client);
  const dispatcher = rest.getDispatcher();

  assert.equal(dispatcher.constructor.name, 'ProxyAgent');
  assert.deepEqual(readSymbol(dispatcher, 'request tls settings'), {
    ca: 'destination-ca',
    ciphers: 'CUSTOM-CIPHER',
    honorCipherOrder: true,
    minVersion: 'TLSv1.3',
    rejectUnauthorized: false,
  });
  assert.deepEqual(readSymbol(dispatcher, 'proxy tls settings'), { ca: 'proxy-ca' });

  rest.destroy();
});
