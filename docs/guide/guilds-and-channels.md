# Guilds, channels, and managers

Guild and channel structures are organized through managers. Understanding the difference between a cache lookup, resolution, and an API fetch prevents many common `undefined` errors.

## Cache, resolve, or fetch?

Use the least expensive operation that still gives the guarantees you need:

| Operation                  | Behavior                                                             |
| -------------------------- | -------------------------------------------------------------------- |
| `manager.cache.get(id)`    | Synchronous; returns only an already-cached object                   |
| `manager.resolve(value)`   | Synchronous; accepts a supported structure or ID and checks cache    |
| `manager.resolveId(value)` | Synchronous; extracts an ID from a supported resolvable              |
| `manager.fetch(id)`        | Asynchronous; may use cache or request Discord, depending on options |

```js
const cached = client.channels.cache.get(process.env.CHANNEL_ID);
const channel = cached ?? (await client.channels.fetch(process.env.CHANNEL_ID));
```

Do not treat cache absence as proof that a resource does not exist.

## Guild managers

Every connected client exposes `client.guilds`. A `Guild` then exposes managers for its related resources:

```js
const guild = client.guilds.cache.get(process.env.GUILD_ID);

const member = await guild.members.fetch(process.env.USER_ID);
const channel = await guild.channels.fetch(process.env.CHANNEL_ID);
const role = await guild.roles.fetch(process.env.ROLE_ID);
const invites = await guild.invites.fetch();
```

Important guild managers include:

- `members`, `roles`, `channels`, and `voiceStates`;
- `bans`, `invites`, `emojis`, and `stickers`;
- `scheduledEvents`, `stageInstances`, and `autoModerationRules`;
- `presences` and thread managers exposed through channel collections.

Each manager has its own fetch options and permission requirements. Use its generated API page before assuming every manager supports identical arguments.

## Channel type guards

Channels share a base class, but only some support text, voice, threads, or guild operations. Narrow the type before calling subtype methods:

```js
const channel = await client.channels.fetch(process.env.CHANNEL_ID);

if (!channel?.isTextBased()) {
  throw new TypeError('Expected a text-based channel');
}

await channel.send('Hello');
```

Common categories include:

- guild text and announcement channels;
- voice and stage channels;
- forums and media channels;
- public, private, and announcement threads;
- direct messages and group direct messages;
- categories and directory-like channel types.

## Guild versus global channel fetches

`client.channels.fetch(id)` is convenient when only a channel ID is known. `guild.channels.fetch(id)` anchors the operation to a particular guild and exposes guild-channel creation, editing, ordering, webhook, and follower operations.

```js
const created = await guild.channels.create('project-updates', {
  type: 'GUILD_TEXT',
  reason: 'Project workspace',
});
```

Creating or editing guild resources depends on the logged-in account's permissions and Discord's current user-account behavior.

## Guild metadata and previews

`Guild` exposes metadata, managers, and helpers for widgets, templates, welcome screens, audit logs, vanity URLs, and discovery data.

```js
const owner = await guild.fetchOwner();
const preview = await guild.fetchPreview();
const widget = await guild.fetchWidget();
```

At the client level, `fetchGuildPreview()` can retrieve previews for joined guilds and discoverable guilds without requiring a fully cached `Guild` structure.

## Ephemeral voice channel information

Voice channel status and session start time are not included in ordinary channel payloads. Request them over the v10 Gateway after the client is ready:

```js
guild.requestChannelInfo(['status', 'voice_start_time']);

client.on('channelUpdate', (oldChannel, channel) => {
  if (!channel.isVoice()) return;
  console.log(channel.status, channel.voiceStartAt);
});
```

The request uses official Gateway opcode 43. `CHANNEL_INFO`, `VOICE_CHANNEL_STATUS_UPDATE`, and `VOICE_CHANNEL_START_TIME_UPDATE` packets update the cached channel and emit `channelUpdate`.

## Positions and bulk changes

Channel and role positions are interdependent. Prefer manager bulk-position helpers when reordering multiple entries so the intended final order is sent together.

```js
await guild.channels.setPositions([
  { channel: firstChannelId, position: 1 },
  { channel: secondChannelId, position: 2 },
]);
```

Always re-fetch or inspect the returned structures after a bulk mutation rather than assuming local objects already reflect Discord's final normalization.

## Useful API pages

- [Guild](/api/classes/guild)
- [GuildManager](/api/classes/guildmanager)
- [ChannelManager](/api/classes/channelmanager)
- [GuildChannelManager](/api/classes/guildchannelmanager)
- [TextBasedChannel](/api/interfaces/textbasedchannel)
- [ThreadChannel](/api/classes/threadchannel)
