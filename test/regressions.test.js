'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { readdirSync } = require('node:fs');
const { dirname, extname, join, resolve } = require('node:path');
const { test } = require('node:test');
const { Collection } = require('@discordjs/collection');
const { Client, RichPresence } = require('../src');
const handleRelationshipUpdate = require('../src/client/websocket/handlers/RELATIONSHIP_UPDATE');
const Shard = require('../src/sharding/Shard');
const VoiceState = require('../src/structures/VoiceState');

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

  assert.equal(
    await client.settings.setCustomStatus({ text: 'Working', status: 'idle' }),
    client.settings,
  );
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
