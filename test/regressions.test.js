'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { readdirSync } = require('node:fs');
const { dirname, extname, join, resolve } = require('node:path');
const { test } = require('node:test');
const { Collection } = require('@discordjs/collection');
const library = require('../src');
const { accountType, AttachmentBuilder, Client, Constants, Permissions, RichPresence, supportsBotAccounts } = library;
const handleRelationshipUpdate = require('../src/client/websocket/handlers/RELATIONSHIP_UPDATE');
const PacketHandlers = require('../src/client/websocket/handlers');
const WebSocketShard = require('../src/client/websocket/WebSocketShard');
const ApplicationCommandManager = require('../src/managers/ApplicationCommandManager');
const ApplicationCommandPermissionsManager = require('../src/managers/ApplicationCommandPermissionsManager');
const MessageManager = require('../src/managers/MessageManager');
const RoleManager = require('../src/managers/RoleManager');
const GuildChannel = require('../src/structures/GuildChannel');
const { GuildMember } = require('../src/structures/GuildMember');
const MessagePayload = require('../src/structures/MessagePayload');
const { StageInstance } = require('../src/structures/StageInstance');
const User = require('../src/structures/User');
const AutocompleteInteraction = require('../src/structures/AutocompleteInteraction');
const InteractionWebhook = require('../src/structures/InteractionWebhook');
const InteractionResponses = require('../src/structures/interfaces/InteractionResponses');
const Shard = require('../src/sharding/Shard');
const ShardingManager = require('../src/sharding/ShardingManager');
const VoiceState = require('../src/structures/VoiceState');
const Util = require('../src/util/Util');

const snowflakes = {
  client: '11111111111111111',
  other: '22222222222222222',
  guild: '33333333333333333',
};

test('restricted guild settings use the initialized cache and do not mutate it before success', async t => {
  const client = new Client();
  t.after(() => client.destroy());
  const edits = [];
  client.settings.edit = async data => {
    edits.push(data);
    client.settings._patch(data);
    return client.settings;
  };

  assert.equal(await client.settings.addRestrictedGuild(snowflakes.guild), client.settings);
  assert.deepEqual(edits[0], { restricted_guilds: [snowflakes.guild] });
  assert.equal(client.settings.disableDMfromGuilds.has(snowflakes.guild), true);

  assert.equal(await client.settings.removeRestrictedGuild(snowflakes.guild), client.settings);
  assert.deepEqual(edits[1], { restricted_guilds: [] });
  assert.equal(client.settings.disableDMfromGuilds.has(snowflakes.guild), false);
  assert.throws(() => client.settings.removeRestrictedGuild(snowflakes.guild), /Guild is not restricted/);
});

test('custom status and presence status are updated in one request', async t => {
  const client = new Client();
  t.after(() => client.destroy());
  const edits = [];
  client.settings.edit = async data => {
    edits.push(data);
    return client.settings;
  };

  assert.equal(await client.settings.setCustomStatus({ text: 'Working', status: 'idle' }), client.settings);
  assert.deepEqual(edits, [
    {
      status: 'idle',
      custom_status: { emoji_name: null, expires_at: null, text: 'Working' },
    },
  ]);
});

test('posting a stream preview is limited to the client user voice state', () => {
  const voiceState = Object.create(VoiceState.prototype);
  voiceState.client = { user: { id: snowflakes.client } };
  voiceState.id = snowflakes.other;
  voiceState.streaming = true;

  assert.throws(() => voiceState.postPreview('data:image/jpeg;base64,image'), /VOICE_STATE_NOT_OWN/);
});

test('pending shard operations reject and clean up when the child exits', async () => {
  const manager = {
    mode: 'process',
    shardArgs: [],
    execArgv: [],
    totalShards: 1,
    token: null,
    respawn: false,
  };
  const shard = new Shard(manager, 0);
  const child = new EventEmitter();
  child.send = (_message, callback) => callback();
  shard.process = child;
  const originalMaxListeners = child.getMaxListeners();

  const fetch = shard.fetchClientValue('guilds.cache.size');
  const evaluation = shard.eval('this.guilds.cache.size');
  assert.equal(child.listenerCount('message'), 2);

  shard._handleExit(false);

  await assert.rejects(fetch, /pending operation completed/);
  await assert.rejects(evaluation, /pending operation completed/);
  assert.equal(child.listenerCount('message'), 0);
  assert.equal(child.getMaxListeners(), originalMaxListeners);
  assert.equal(shard._fetches.size, 0);
  assert.equal(shard._evals.size, 0);
});

test('relationship updates clear nullable values instead of retaining stale cache entries', () => {
  const client = new EventEmitter();
  client.relationships = {
    cache: new Collection([[snowflakes.other, 1]]),
    friendNicknames: new Collection([[snowflakes.other, 'old nickname']]),
    sinceCache: new Collection([[snowflakes.other, new Date('2025-01-01')]]),
  };

  handleRelationshipUpdate(client, {
    d: { id: snowflakes.other, type: 0, nickname: null, since: null },
  });

  assert.equal(client.relationships.cache.get(snowflakes.other), 0);
  assert.equal(client.relationships.friendNicknames.has(snowflakes.other), false);
  assert.equal(client.relationships.sinceCache.get(snowflakes.other).getTime(), 0);
});

test('rich presence buttons are validated atomically and limited after flattening', () => {
  const presence = Object.create(RichPresence.prototype);
  presence.buttons = ['existing'];
  presence.metadata = { button_urls: ['https://example.com/existing'] };
  const threeButtons = [
    { name: 'one', url: 'https://example.com/one' },
    { name: 'two', url: 'https://example.com/two' },
    { name: 'three', url: 'https://example.com/three' },
  ];

  assert.throws(() => presence.setButtons(threeButtons), /up to 2 buttons/);
  assert.deepEqual(presence.buttons, ['existing']);
  assert.deepEqual(presence.metadata.button_urls, ['https://example.com/existing']);

  presence.setButtons(...threeButtons.slice(0, 2));
  assert.deepEqual(presence.buttons, ['one', 'two']);
  assert.throws(() => presence.addButton('three', 'https://example.com/three'), /up to 2 buttons/);
  assert.deepEqual(presence.buttons, ['one', 'two']);
});

test('gateway v10 close codes include invalid API versions as unrecoverable', () => {
  assert.equal(Constants.WSCodes[4_012], 'INVALID_API_VERSION');
});

test('gateway heartbeats use jitter before starting the recurring interval', async t => {
  const shard = new WebSocketShard({ debug() {} }, 0);
  let heartbeatCount = 0;
  let resolveFirstHeartbeat;
  const firstHeartbeat = new Promise(resolve => {
    resolveFirstHeartbeat = resolve;
  });
  shard.sendHeartbeat = () => {
    heartbeatCount++;
    resolveFirstHeartbeat();
  };

  const originalRandom = Math.random;
  Math.random = () => 0.5;
  t.after(() => {
    Math.random = originalRandom;
    shard.setHeartbeatTimer(-1);
  });

  shard.setHeartbeatTimer(40);
  Math.random = originalRandom;
  assert.equal(heartbeatCount, 0);
  assert.notEqual(shard.heartbeatTimeout, null);
  assert.equal(shard.heartbeatInterval, null);

  shard.heartbeatTimeout.ref();
  await firstHeartbeat;
  assert.equal(heartbeatCount, 1);
  assert.equal(shard.heartbeatTimeout, null);
  assert.notEqual(shard.heartbeatInterval, null);
});

test('voice channel manageability requires view, manage, and connect permissions', () => {
  let checkedPermissions;
  const channel = Object.create(GuildChannel.prototype);
  channel.client = { user: { id: snowflakes.client } };
  channel.guild = {
    ownerId: snowflakes.other,
    members: { me: { communicationDisabledUntilTimestamp: null } },
  };
  channel.type = 'GUILD_VOICE';
  channel.permissionsFor = () => ({
    has(bitfield) {
      if (bitfield === Permissions.FLAGS.ADMINISTRATOR) return false;
      checkedPermissions = bitfield;
      return true;
    },
  });

  assert.equal(channel.manageable, true);
  assert.equal(
    checkedPermissions,
    Permissions.FLAGS.VIEW_CHANNEL | Permissions.FLAGS.MANAGE_CHANNELS | Permissions.FLAGS.CONNECT,
  );
});

test('bot-owned interaction responses are inactive for user accounts', async () => {
  const interaction = { deferred: false, replied: false };
  const autocomplete = Object.create(AutocompleteInteraction.prototype);
  const webhook = Object.create(InteractionWebhook.prototype);

  await assert.rejects(
    InteractionResponses.prototype.update.call(interaction),
    error => error.code === 'BOT_ONLY_API_DISABLED',
  );
  assert.throws(
    () => InteractionResponses.prototype.fetchReply.call(interaction),
    error => error.code === 'BOT_ONLY_API_DISABLED',
  );
  assert.equal(interaction.replied, false);
  await assert.rejects(autocomplete.respond([]), error => error.code === 'BOT_ONLY_API_DISABLED');
  await assert.rejects(webhook.send('blocked'), error => error.code === 'BOT_ONLY_API_DISABLED');
  await assert.rejects(webhook.fetchMessage('1'), error => error.code === 'BOT_ONLY_API_DISABLED');
});

test('the package and client explicitly support user accounts only', async t => {
  const client = new Client({ shards: [0, 1], shardCount: 2 });
  t.after(() => client.destroy());
  client.token = null;

  assert.equal(accountType, 'user');
  assert.equal(supportsBotAccounts, false);
  assert.equal(client.accountType, 'user');
  assert.equal(client.supportsBotAccounts, false);
  assert.equal(client.options.intents, 0);
  assert.deepEqual(client.options.shards, [0]);
  assert.equal(client.options.shardCount, 1);
  assert.equal(library.REST, undefined);
  assert.equal(library.SimpleShardingStrategy, undefined);
  await assert.rejects(client.login('Bot bot-token'), error => error.code === 'BOT_ACCOUNT_UNSUPPORTED');
  await assert.rejects(client.login('Bearer oauth-token'), error => error.code === 'BOT_ACCOUNT_UNSUPPORTED');
  assert.equal(client.token, null);
});

test('raw bot tokens are rejected by account preflight before gateway login', async t => {
  const client = new Client();
  t.after(() => client.destroy());
  let gatewayConnected = false;
  client.rest.request = async () => ({ bot: true });
  client.ws.connect = async () => {
    gatewayConnected = true;
  };

  await assert.rejects(client.login('raw-token'), error => error.code === 'BOT_ACCOUNT_UNSUPPORTED');
  assert.equal(gatewayConnected, false);
});

test('bot-owned command management and sharding fail before network access', async () => {
  const commands = Object.create(ApplicationCommandManager.prototype);
  const permissions = Object.create(ApplicationCommandPermissionsManager.prototype);
  const sharding = Object.create(ShardingManager.prototype);
  sharding.totalShards = 1;

  await assert.rejects(commands.fetch(), error => error.code === 'BOT_ONLY_API_DISABLED');
  await assert.rejects(commands.create({ name: 'blocked' }), error => error.code === 'BOT_ONLY_API_DISABLED');
  await assert.rejects(permissions.fetch(), error => error.code === 'BOT_ONLY_API_DISABLED');
  await assert.rejects(sharding.spawn(), error => error.code === 'BOT_ONLY_API_DISABLED');
  assert.throws(
    () => sharding.createShard(0),
    error => error.code === 'BOT_ONLY_API_DISABLED',
  );
});

test('bot-only gateway dispatch handlers are inactive', () => {
  for (const event of [
    'APPLICATION_COMMAND_CREATE',
    'APPLICATION_COMMAND_DELETE',
    'APPLICATION_COMMAND_UPDATE',
    'APPLICATION_COMMAND_PERMISSIONS_UPDATE',
    'AUTO_MODERATION_ACTION_EXECUTION',
    'AUTO_MODERATION_RULE_CREATE',
    'AUTO_MODERATION_RULE_DELETE',
    'AUTO_MODERATION_RULE_UPDATE',
    'GUILD_AUDIT_LOG_ENTRY_CREATE',
  ]) {
    assert.equal(PacketHandlers[event], undefined);
  }
});

test('message edits omit attachments unless explicitly changed', async () => {
  let patchData;
  const manager = Object.create(MessageManager.prototype);
  manager.channel = { id: snowflakes.guild };
  manager.client = {
    options: { allowedMentions: undefined },
    api: {
      channels: {
        [snowflakes.guild]: {
          messages: {
            [snowflakes.other]: {
              patch: async ({ data }) => {
                patchData = data;
                return { id: snowflakes.other };
              },
            },
          },
        },
      },
    },
  };
  Object.defineProperty(manager, '_cache', { value: new Collection() });
  manager.resolveId = () => snowflakes.other;
  manager._add = data => data;

  await manager.edit(snowflakes.other, { content: 'edited' });

  assert.equal(patchData.attachments, undefined);
});

test('message edits retain existing attachments when adding v10 uploads', async t => {
  let patchData;
  const manager = Object.create(MessageManager.prototype);
  manager.channel = { id: snowflakes.guild };
  manager.client = {
    options: { allowedMentions: undefined },
    api: {
      channels: {
        [snowflakes.guild]: {
          messages: {
            [snowflakes.other]: {
              patch: async ({ data }) => {
                patchData = data;
                return { id: snowflakes.other };
              },
            },
          },
        },
      },
    },
  };
  Object.defineProperty(manager, '_cache', { value: new Collection() });
  manager.resolveId = () => snowflakes.other;
  manager._add = data => data;

  const originalGetUploadURL = Util.getUploadURL;
  const originalUploadFile = Util.uploadFile;
  Util.getUploadURL = async () => [{ id: '0', upload_url: 'https://upload.example', upload_filename: 'remote' }];
  Util.uploadFile = async () => {};
  t.after(() => {
    Util.getUploadURL = originalGetUploadURL;
    Util.uploadFile = originalUploadFile;
  });

  await manager.edit(snowflakes.other, {
    attachments: [{ id: snowflakes.guild, name: 'existing.png', description: 'kept' }],
    files: [{ attachment: Buffer.from('new'), name: 'new.png' }],
  });

  assert.deepEqual(patchData.attachments, [
    { id: snowflakes.guild, filename: 'existing.png', description: 'kept' },
    {
      id: '0',
      filename: 'new.png',
      uploaded_filename: 'remote',
      description: undefined,
      title: undefined,
      duration_secs: undefined,
      waveform: undefined,
    },
  ]);
});

test('message payloads retain cached attachments when adding files', () => {
  const target = Object.create(require('../src/structures/Message').Message.prototype);
  target.client = { options: { allowedMentions: undefined } };
  target.attachments = new Collection([
    [snowflakes.guild, { id: snowflakes.guild, name: 'existing.png', description: 'kept' }],
  ]);
  const payload = MessagePayload.create(target, {
    files: [{ attachment: Buffer.from('new'), name: 'new.png' }],
  }).resolveData();

  assert.deepEqual(payload.data.attachments, [
    { id: snowflakes.guild, filename: 'existing.png', description: 'kept' },
    {
      id: '0',
      description: undefined,
      title: undefined,
      waveform: undefined,
      duration_secs: undefined,
    },
  ]);
});

test('v14.27 attachment builders carry voice message metadata', async () => {
  const attachment = new AttachmentBuilder(Buffer.from('voice'), 'voice.ogg')
    .setTitle('Voice note')
    .setWaveform('AAECAw==')
    .setDuration(1.25);
  const target = { client: { options: { allowedMentions: undefined } } };
  const payload = MessagePayload.create(target, { files: [attachment] }).resolveData();
  await payload.resolveFiles();

  assert.deepEqual(payload.data.attachments, [
    {
      id: '0',
      description: undefined,
      title: 'Voice note',
      waveform: 'AAECAw==',
      duration_secs: 1.25,
    },
  ]);
  assert.equal(payload.files[0].title, 'Voice note');
  assert.equal(payload.files[0].waveform, 'AAECAw==');
  assert.equal(payload.files[0].duration_secs, 1.25);
});

test('v14.27 collectibles are transformed and cleared for users and guild members', () => {
  const client = { users: { _add: data => new User(client, data) } };
  const guild = { id: snowflakes.guild };
  const nameplate = {
    sku_id: snowflakes.guild,
    asset: 'asset-path',
    label: 'Nameplate',
    palette: 'crimson',
  };
  const member = new GuildMember(
    client,
    {
      user: { id: snowflakes.other, username: 'member', discriminator: '0' },
      roles: [],
      joined_at: null,
      collectibles: { nameplate },
    },
    guild,
  );

  assert.deepEqual(member.collectibles, {
    nameplate: {
      skuId: snowflakes.guild,
      asset: 'asset-path',
      label: 'Nameplate',
      palette: 'crimson',
    },
  });

  const changed = member._clone();
  changed.collectibles = null;
  assert.equal(member.equals(changed), false);

  member._patch({ collectibles: null });
  assert.equal(member.collectibles, null);
  member.user._patch({ collectibles: { nameplate } });
  assert.notEqual(member.user.collectibles, null);
  member.user._patch({ collectibles: null });
  assert.equal(member.user.collectibles, null);
});

test('v14.27 role member counts return a collection', async () => {
  const manager = Object.create(RoleManager.prototype);
  manager.guild = { id: snowflakes.guild };
  manager.client = {
    api: {
      guilds: () => ({
        roles: () => ({ get: async () => ({ [snowflakes.other]: 42 }) }),
      }),
    },
  };

  const counts = await manager.fetchMemberCounts();

  assert.equal(counts instanceof Collection, true);
  assert.equal(counts.get(snowflakes.other), 42);
});

test('v14.27 role colors accept null gradient components', async () => {
  let requestData;
  const manager = Object.create(RoleManager.prototype);
  manager.guild = { id: snowflakes.guild, emojis: { resolve: () => null } };
  manager.client = {
    actions: { GuildRoleCreate: { handle: ({ role }) => ({ role }) } },
    api: {
      guilds: () => ({
        roles: {
          post: async ({ data }) => {
            requestData = data;
            return { id: snowflakes.other };
          },
        },
      }),
    },
  };

  await manager.create({
    colors: { primaryColor: null, secondaryColor: null, tertiaryColor: null },
  });

  assert.deepEqual(requestData.colors, {
    primary_color: null,
    secondary_color: null,
    tertiary_color: null,
  });
});

test('v14.27 stage instances resolve their scheduled event', () => {
  const scheduledEvent = { id: snowflakes.other };
  const guild = { scheduledEvents: { resolve: id => (id === scheduledEvent.id ? scheduledEvent : null) } };
  const stage = new StageInstance(
    { guilds: { resolve: id => (id === snowflakes.guild ? guild : null) } },
    {
      id: snowflakes.client,
      guild_id: snowflakes.guild,
      channel_id: snowflakes.client,
      guild_scheduled_event_id: snowflakes.other,
    },
  );

  assert.equal(stage.guildScheduledEvent, scheduledEvent);
});

test('all relative source imports resolve to files', () => {
  const sourceRoot = resolve(__dirname, '..', 'src');
  const files = [];
  const visit = directory => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) visit(entryPath);
      else if (extname(entry.name) === '.js') files.push(entryPath);
    }
  };
  visit(sourceRoot);

  const missing = [];
  const relativeRequire = /require\((['"])(\.\.?\/[^'"]+)\1\)/g;
  for (const file of files) {
    const source = require('node:fs').readFileSync(file, 'utf8');
    for (const match of source.matchAll(relativeRequire)) {
      try {
        require.resolve(resolve(dirname(file), match[2]));
      } catch {
        missing.push(`${file}: ${match[2]}`);
      }
    }
  }

  assert.deepEqual(missing, []);
});
