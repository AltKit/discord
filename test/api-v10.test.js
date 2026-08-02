'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { test } = require('node:test');
require('../src');
const buildRoute = require('../src/rest/APIRouter');
const HTTPError = require('../src/rest/HTTPError');
const RequestHandler = require('../src/rest/RequestHandler');
const handleChannelInfo = require('../src/client/websocket/handlers/CHANNEL_INFO');
const handleVoiceStartTime = require('../src/client/websocket/handlers/VOICE_CHANNEL_START_TIME_UPDATE');
const GuildInviteManager = require('../src/managers/GuildInviteManager');
const GuildChannelManager = require('../src/managers/GuildChannelManager');
const Application = require('../src/structures/interfaces/Application');
const MessageAttachment = require('../src/structures/MessageAttachment');
const MessagePayload = require('../src/structures/MessagePayload');
const ModalInputComponent = require('../src/structures/ModalInputComponent');
const DataResolver = require('../src/util/DataResolver');
const { Events, MessageComponentTypes, Opcodes } = require('../src/util/Constants');

function createRequestHarness(method, responses) {
  const client = new EventEmitter();
  client.options = {
    retryLimit: 1,
    restTimeOffset: 0,
    invalidRequestWarningInterval: 0,
    rejectOnRateLimit: null,
    captchaSolver: null,
    captchaRetryLimit: 0,
    TOTPKey: null,
  };
  const manager = {
    client,
    globalLimit: Infinity,
    globalRemaining: Infinity,
    globalReset: null,
    globalDelay: null,
    updateBucketHash() {},
  };
  const calls = [];
  const request = {
    method,
    path: '/test',
    route: '/test',
    routeId: `${method}:/test`,
    majorParameter: 'global',
    options: {},
    retries: 0,
    captchaRetries: 0,
    async make() {
      calls.push(method);
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return response;
    },
  };
  return { calls, handler: new RequestHandler(manager), request };
}

test('REST routes include method-ready bucket data and redact webhook tokens', async () => {
  const calls = [];
  const manager = {
    versioned: true,
    request(method, path, options) {
      calls.push({ method, path, options });
      return options;
    },
  };
  const channelId = '111111111111111111';
  const messageId = '222222222222222222';
  const webhookId = '333333333333333333';

  await buildRoute(manager).channels(channelId).messages(messageId).get({});
  await buildRoute(manager).webhooks(webhookId)('secret-token').messages('@original').patch({});

  assert.equal(calls[0].options.route, `/channels/${channelId}/messages/:id`);
  assert.equal(calls[0].options.bucketRoute, '/channels/:id/messages/:id');
  assert.equal(calls[0].options.majorParameter, `channels:${channelId}`);
  assert.equal(calls[1].options.route.includes('secret-token'), false);
  assert.equal(calls[1].options.bucketRoute, '/webhooks/:id/:token/messages/@original');
  assert.equal(calls[1].options.majorParameter, `webhooks:${webhookId}:secret-token`);
});

test('429 responses can use the JSON retry_after field', async () => {
  const responses = [
    new Response(JSON.stringify({ message: 'limited', retry_after: 0.001, global: false }), {
      status: 429,
      headers: {
        'content-type': 'application/json',
        'x-ratelimit-scope': 'shared',
        'x-ratelimit-bucket': 'shared-bucket',
      },
    }),
    new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } }),
  ];
  const { calls, handler, request } = createRequestHarness('get', responses);

  assert.deepEqual(await handler.execute(request), { ok: true });
  assert.equal(calls.length, 2);
});

test('ambiguous failures retry idempotent requests but do not replay posts', async () => {
  const post = createRequestHarness('post', [new Error('reset'), new Response(null, { status: 204 })]);
  await assert.rejects(post.handler.execute(post.request), error => error instanceof HTTPError && Boolean(error.cause));
  assert.equal(post.calls.length, 1);

  const get = createRequestHarness('get', [new Error('reset'), new Response(null, { status: 204 })]);
  assert.equal(await get.handler.execute(get.request), undefined);
  assert.equal(get.calls.length, 2);

  const uppercaseGet = createRequestHarness('GET', [new Error('reset'), new Response(null, { status: 204 })]);
  assert.equal(await uppercaseGet.handler.execute(uppercaseGet.request), undefined);
  assert.equal(uppercaseGet.calls.length, 2);
});

test('community invites use v10 role and target-user payloads', async () => {
  const calls = [];
  const manager = Object.create(GuildInviteManager.prototype);
  manager.client = {
    users: { resolveId: user => (user == null ? null : (user.id ?? user)) },
    api: {
      channels: channelId => ({
        invites: {
          post: options => {
            calls.push({ operation: 'create', channelId, options });
            return { code: 'invite', roles: [] };
          },
        },
      }),
      invites: code => ({
        'target-users': {
          get: () => Buffer.from('user_id\n111111111111111111\n222222222222222222\n'),
          put: options => calls.push({ operation: 'update', code, options }),
          'job-status': { get: () => ({ status: 3, total_users: 2, processed_users: 2 }) },
        },
      }),
    },
  };
  manager.guild = {
    channels: { resolveId: channel => channel },
    roles: { resolveId: role => role.id ?? role },
  };

  const invite = await manager.create('333333333333333333', {
    roleIds: [{ id: '444444444444444444' }],
    targetUsersFile: [{ id: '111111111111111111' }, '222222222222222222'],
  });
  assert.equal(invite.code, 'invite');
  assert.deepEqual(calls[0].options.data.role_ids, ['444444444444444444']);
  assert.equal(calls[0].options.files[0].key, 'target_users_file');
  assert.equal(calls[0].options.files[0].file.toString(), 'user_id\n111111111111111111\n222222222222222222\n');

  assert.deepEqual(await manager.fetchTargetUsers('invite'), ['111111111111111111', '222222222222222222']);
  await manager.updateTargetUsers('invite', ['111111111111111111']);
  assert.equal(calls[1].options.files[0].file.toString(), 'user_id\n111111111111111111\n');
  assert.equal((await manager.fetchTargetUsersJobStatus('invite')).status, 3);
});

test('application payloads retain full flags_new precision', () => {
  const application = new Application(
    {},
    {
      id: '111111111111111111',
      flags: 1 << 24,
      flags_new: '4611686018444165120',
    },
  );

  assert.equal(application.flags.has('ACTIVE'), true);
  assert.equal(application.flagsNew, 4_611_686_018_444_165_120n);
});

test('attachment payloads send explicit spoiler metadata', async () => {
  const attachment = new MessageAttachment(Buffer.from('file'), 'example.txt').setSpoiler(true);
  const target = { client: { options: { allowedMentions: undefined } } };
  const payload = MessagePayload.create(target, { files: [attachment] }).resolveData();

  assert.equal(payload.data.attachments[0].is_spoiler, true);
  assert.equal(attachment.name, 'SPOILER_example.txt');
  attachment.setSpoiler(false);
  assert.equal(attachment.spoiler, false);
  assert.equal(attachment.name, 'example.txt');
});

test('modal input components serialize current v10 request shapes', () => {
  const upload = new ModalInputComponent({ type: 'FILE_UPLOAD', custom_id: 'files', min_values: 1, max_values: 10 });
  const checkbox = new ModalInputComponent({ type: 'CHECKBOX', custom_id: 'confirm', default: true });

  assert.deepEqual(upload.toJSON(), {
    type: MessageComponentTypes.FILE_UPLOAD,
    custom_id: 'files',
    min_values: 1,
    max_values: 10,
  });
  assert.deepEqual(checkbox.toJSON(), {
    type: MessageComponentTypes.CHECKBOX,
    custom_id: 'confirm',
    default: true,
  });
});

test('file upload components serialize v10 file_types restrictions', () => {
  const upload = new ModalInputComponent({ type: 'FILE_UPLOAD', custom_id: 'files', file_types: ['image', '.png'] });
  const restricted = new ModalInputComponent({ type: 'FILE_UPLOAD', custom_id: 'media' }).setFileTypes('video', '.mov');

  assert.deepEqual(upload.fileTypes, ['image', '.png']);
  assert.deepEqual(upload.toJSON(), {
    type: MessageComponentTypes.FILE_UPLOAD,
    custom_id: 'files',
    file_types: ['image', '.png'],
  });
  assert.deepEqual(restricted.toJSON().file_types, ['video', '.mov']);
  assert.deepEqual(new ModalInputComponent({ type: 'FILE_UPLOAD', custom_id: 'any' }).toJSON(), {
    type: MessageComponentTypes.FILE_UPLOAD,
    custom_id: 'any',
  });
});

test('channel flags include the v10 spoiler channel flag', () => {
  const ChannelFlags = require('../src/util/ChannelFlags');

  assert.equal(ChannelFlags.FLAGS.PINNED, 2);
  assert.equal(ChannelFlags.FLAGS.REQUIRE_TAG, 16);
  assert.equal(ChannelFlags.FLAGS.HIDE_MEDIA_DOWNLOAD_OPTIONS, 32_768);
  assert.equal(ChannelFlags.FLAGS.IS_SPOILER_CHANNEL, 2_097_152);
  assert.equal(new ChannelFlags(2_097_152).has('IS_SPOILER_CHANNEL'), true);
});

test('API error constants mirror the v10 JSON error code table', () => {
  const { APIErrors } = require('../src/util/Constants');

  // Recent additions from discord-api-types 0.38.49+
  assert.equal(APIErrors.GENERAL_ERROR, 0);
  assert.equal(APIErrors.THIS_ACTION_REQUIRES_A_PREMIUM_SUBSCRIPTION, 20015);
  assert.equal(APIErrors.ONLY_ONE_CHANNEL_CAN_HAVE_A_PARENT_ID_MODIFIED_AT_A_TIME, 40009);
  assert.equal(APIErrors.CLOUDFLARE_IS_BLOCKING_YOUR_REQUEST, 40333);
  assert.equal(APIErrors.CANNOT_SEND_VOICE_EFFECT_WHEN_USER_IS_SERVER_MUTED_DEAFENED_OR_SUPPRESSED, 50167);
  assert.equal(APIErrors.ACCESS_TO_JOINING_NEW_SERVERS_HAS_BEEN_LIMITED_FOR_THE_USER, 340015);
  assert.equal(APIErrors.ACCESS_TO_FILE_UPLOADS_HAS_BEEN_LIMITED_FOR_THIS_GUILD, 400001);
  assert.equal(APIErrors.CANNOT_FORWARD_MESSAGE_WITH_UNREADABLE_CONTENT, 160014);

  // Every value in the table is unique
  const values = Object.values(APIErrors);
  assert.equal(new Set(values).size, values.length);
});

test('channel creation forwards channel flags in the request body', async () => {
  const calls = [];
  const manager = Object.create(GuildChannelManager.prototype);
  manager.client = {
    channels: { resolveId: channel => channel },
    api: {
      guilds: () => ({
        channels: {
          post: options => {
            calls.push(options);
            return {};
          },
        },
      }),
    },
    actions: {
      ChannelCreate: {
        handle: data => ({ channel: { id: 'new-channel', ...data } }),
      },
    },
  };
  manager.guild = {
    id: '111111111111111111',
    channels: { resolveId: channel => channel },
  };
  const ChannelFlags = require('../src/util/ChannelFlags');

  await manager.create('spoilers', { flags: [ChannelFlags.FLAGS.IS_SPOILER_CHANNEL] });
  assert.equal(calls[0].data.flags, 2_097_152);

  await manager.create('plain');
  assert.equal(calls[1].data.flags, undefined);
});

test('image buffers use a matching data URI MIME type', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const gif = Buffer.from('GIF89a', 'ascii');
  const jpeg = Buffer.from([0xff, 0xd8, 0xff]);

  assert.match(DataResolver.resolveBase64(png), /^data:image\/png;base64,/);
  assert.match(DataResolver.resolveBase64(gif), /^data:image\/gif;base64,/);
  assert.match(DataResolver.resolveBase64(jpeg), /^data:image\/jpeg;base64,/);
  assert.throws(() => DataResolver.resolveBase64(Buffer.from('not an image')), /Invalid image format/);
});

test('official channel info Gateway packets update ephemeral voice state', () => {
  const updates = [];
  const channel = {
    status: null,
    voiceStartTimestamp: null,
    _clone() {
      return { status: this.status, voiceStartTimestamp: this.voiceStartTimestamp };
    },
    _patch(data) {
      if ('status' in data) this.status = data.status;
      if ('voice_start_time' in data) {
        this.voiceStartTimestamp = data.voice_start_time == null ? null : data.voice_start_time * 1_000;
      }
    },
  };
  const client = new EventEmitter();
  client.channels = { cache: new Map([['channel', channel]]) };
  client.on(Events.CHANNEL_UPDATE, (old, current) => updates.push({ old, current }));

  handleChannelInfo(client, {
    d: { guild_id: 'guild', channels: [{ id: 'channel', status: 'Playing', voice_start_time: 123 }] },
  });
  handleVoiceStartTime(client, { d: { guild_id: 'guild', id: 'channel', voice_start_time: null } });

  assert.equal(Opcodes.REQUEST_CHANNEL_INFO, 43);
  assert.equal(channel.status, 'Playing');
  assert.equal(channel.voiceStartTimestamp, null);
  assert.equal(updates.length, 2);
});
