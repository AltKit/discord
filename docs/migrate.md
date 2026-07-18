# AltKit Migration

::: info Compatibility target
Altkit Discord v4 moves the fork from its previous Discord.js 14.21-compatible surface to **Discord.js 14.27.0** while retaining its user-account transport and selfbot-specific APIs.
:::

|                         | Version                      |
| ----------------------- | ---------------------------- |
| Altkit Discord          | `{{ altkitDiscordVersion }}` |
| Discord.js API target   | `14.27.0`                    |
| Discord API / Gateway   | `v10`                        |
| Minimum Node.js version | `20.19.0`                    |
| Tested Node.js versions | `20`, `22`, `24`             |
| Package/import name     | `@altkit/discord`            |

::: danger Account safety
Automating a normal Discord user account violates Discord's Terms of Service and can result in account termination. Never share or commit a user token, TOTP secret, or proxy credential.
:::

## Contents

- [Before upgrading](#before-upgrading)
- [Discord.js 14.27 parity](#discordjs-1427-parity)
- [API v10 and transport updates](#api-v10-and-transport-updates)
- [Compatibility exports](#compatibility-exports)
- [Poll updates](#poll-updates)
- [Fixes and behavior changes](#fixes-and-behavior-changes)
- [Dependency alignment](#dependency-alignment)
- [Migration guide](#migration-guide)
- [Upstream reference](#upstream-reference)

## Before upgrading

Use this checklist when moving an existing v3 project to v4:

- [ ] Upgrade Node.js to 20.19 or newer.
- [ ] Replace package imports with `@altkit/discord`.
- [ ] Install dependencies again so the 14.27 companion packages are resolved.
- [ ] Prefer `Events` and `Partials` for new code.
- [ ] Add poll partials if uncached poll vote events are required.
- [ ] Review non-idempotent REST retry behavior if the application relied on automatic `POST` or `PATCH` replay.
- [ ] Move custom certificate or proxy TLS settings to `http.tls`, `ws.tls`, `requestTls`, or `proxyTls` as appropriate.
- [ ] Keep tokens and other credentials in the environment, not source files.
- [ ] Run the application's tests against Altkit Discord v4 before deploying.

```sh
npm uninstall discord.js-selfbot-v13
npm install @altkit/discord
```

::: tip Incremental migration
Selected legacy names, string events, and partial identifiers remain available for gradual migration. New code should use the Discord.js v14-style exports.
:::

## Discord.js 14.27 parity

### New API surface

| Feature              | Altkit Discord v4 behavior                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| Voice messages       | Sends Ogg/Opus attachments with waveform and duration metadata using `IS_VOICE_MESSAGE`.          |
| Stage bitrate        | Adds `Guild#maximumStageBitrate`.                                                                 |
| Role member counts   | Adds `RoleManager#fetchMemberCounts()`.                                                           |
| Voice server events  | Emits `voiceServerUpdate` with raw gateway voice-server update data.                              |
| Member collectibles  | Exposes collectible nameplate data through `GuildMember#collectibles`.                            |
| Shared client themes | Reads `Message#sharedClientTheme` and accepts `sharedClientTheme` when creating messages.         |
| Activity instances   | Adds `Application#fetchActivityInstance(instanceId)`, `ActivityInstance`, and `ActivityLocation`. |

### Voice message example

```js
const { AttachmentBuilder, MessageFlags } = require('@altkit/discord');

const attachment = new AttachmentBuilder('./voice-message.ogg', 'voice-message.ogg', {
  waveform: 'AAAAAAAAAAAA',
  duration_secs: 1,
});

await channel.send({
  files: [attachment],
  flags: MessageFlags.FLAGS.IS_VOICE_MESSAGE,
});
```

## API v10 and transport updates

Altkit now follows current Discord API and Gateway v10 behavior in the user-account workflows supported by this fork.
Authentication remains a raw user token with a user-client Gateway session; this work does not enable bot tokens, bot
intents, command registration, or bot-owned interaction callbacks.

| Area                      | Updated behavior                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| REST rate limits          | Discovers `X-RateLimit-Bucket`, separates methods and major resources, and honors user, global, and shared scopes.        |
| HTTP 429 responses        | Accepts retry timing from either `Retry-After` or the JSON `retry_after` field.                                           |
| Retries                   | Automatically retries idempotent operations; ambiguous `POST` and `PATCH` failures are returned without replay.           |
| Empty responses           | Successful `204` and `205` responses resolve to `undefined` instead of an empty `ArrayBuffer`.                            |
| Attachments               | Sends and edits explicit `is_spoiler` metadata while retaining support for the legacy `SPOILER_` filename prefix.         |
| Application flags         | Adds `Application#flagsNew` as a `bigint` so response bits above bit 30 retain full precision.                            |
| Voice channel information | Adds Gateway opcode 43, `Guild#requestChannelInfo()`, channel status, and voice session start-time caching.               |
| Modal components          | Adds current Label, File Upload, Radio Group, Checkbox Group, and Checkbox runtime and declaration shapes.                |
| Community invites         | Adds role IDs, target-user CSV uploads, target-user reads and updates, and processing job status.                         |
| Images                    | Detects JPEG, PNG, and GIF data-URI MIME types and accepts only documented power-of-two CDN sizes from 16 through 4096.   |
| TLS                       | Uses TLS 1.2 or newer by default for REST, Gateway, voice, and remote-auth connections, with explicit override locations. |

::: warning Guild creation
`GuildManager#create()` remains available only as an undocumented user-account compatibility helper. Discord removed
`POST /guilds` from the public application API, so new code should not depend on it.
:::

### TLS configuration

REST and WebSocket transports now share secure TLS defaults: a minimum of TLS 1.2, the library's browser-like cipher
ordering, and certificate verification supplied by Node.js. Configure REST and WebSocket destinations independently:

```js
const client = new Client({
  http: {
    tls: {
      ca: process.env.REST_CA_CERT,
      minVersion: 'TLSv1.3',
    },
  },
  ws: {
    tls: {
      ca: process.env.GATEWAY_CA_CERT,
      minVersion: 'TLSv1.2',
    },
  },
});
```

`ws.tls` applies to Gateway and voice WebSocket connections. For REST proxies, the settings have distinct targets:

```js
const client = new Client({
  http: {
    agent: {
      uri: process.env.HTTP_PROXY,
      requestTls: { ca: process.env.DISCORD_CA_CERT },
      proxyTls: { ca: process.env.PROXY_CA_CERT },
    },
    tls: {
      minVersion: 'TLSv1.3',
    },
  },
});
```

- `http.tls` configures the TLS connection to Discord and overrides matching `requestTls` fields.
- `http.agent.requestTls` configures the proxy-to-Discord destination connection.
- `http.agent.proxyTls` configures an HTTPS proxy connection itself.
- A legacy plain object passed as `ws.agent` is still interpreted as TLS/HTTPS-agent options, but `ws.tls` is clearer.
- Supplying `secureProtocol` without `minVersion` uses Node's legacy protocol selector and removes the default `minVersion`
  to avoid an invalid combination.

::: danger Certificate verification
Do not set `rejectUnauthorized: false` in production. It disables certificate verification and permits man-in-the-middle
interception of the account token and Discord traffic.
:::

## Compatibility exports

### Events and partials

| Modern v14 API                                   | Legacy compatibility                              |
| ------------------------------------------------ | ------------------------------------------------- |
| `Events.ClientReady` / `clientReady`             | `ready` continues to be emitted.                  |
| `Events.WebhooksUpdate` / `webhooksUpdate`       | `webhookUpdate` continues to be emitted.          |
| `Events.VoiceServerUpdate` / `voiceServerUpdate` | New in the v4 compatibility surface.              |
| Numeric `Partials` values                        | Legacy uppercase string partials remain accepted. |

### Root export aliases

The following Discord.js v14 names resolve to the fork's existing implementations:

| v14 export             | Altkit Discord implementation |
| ---------------------- | ----------------------------- |
| `AttachmentBuilder`    | `MessageAttachment`           |
| `BaseChannel`          | `Channel`                     |
| `IntentsBitField`      | `Intents`                     |
| `MessageFlagsBitField` | `MessageFlags`                |
| `PermissionsBitField`  | `Permissions`                 |
| `UserFlagsBitField`    | `UserFlags`                   |

Altkit Discord re-exports formatters, shared utilities, and Discord API v10 types from its package root. Upstream
`@discordjs/rest` and `@discordjs/ws` transports are intentionally not re-exported because they provide independent
bot-account authentication and Gateway paths.

`HolographicStyle` now exposes the v14-style `Primary`, `Secondary`, and `Tertiary` role color values.

## Poll updates

::: tip Poll partials
Configure `Partials.Message`, `Partials.Poll`, and `Partials.PollAnswer` when vote events must work for uncached messages.
:::

```js
const { Client, Partials } = require('@altkit/discord');

const client = new Client({
  partials: [Partials.Message, Partials.Poll, Partials.PollAnswer],
});
```

- `Poll` and `PollAnswer` can now be partial when a vote event arrives without cached poll data.
- `Poll#fetch()` hydrates a partial poll through its message.
- `PollAnswer#voters` is a `PollAnswerVoterManager` with a voter cache and `fetch()` method.
- Vote add/remove events update the voter cache.
- Vote removal never decrements the vote count below zero.

## Fixes and behavior changes

::: details Events and gateway

- Emits the v14 `clientReady` and `webhooksUpdate` names alongside their legacy equivalents.
- Emits `voiceServerUpdate` from gateway voice-server updates.
- Handles gateway `RATE_LIMITED` packets with debug output and a one-time process warning per affected opcode.
- Handles `CHANNEL_INFO` and voice channel status/start-time updates and refreshes the cached voice channel.

:::

::: details Guilds, roles, and members

- Stage instance creation resolves `guildScheduledEvent` through the guild scheduled-event manager.
- Passing `null` for a secondary or tertiary role color clears that gradient color.
- Guild-channel manageability and empty `@everyone` overwrite checks follow the corrected 14.27 permission behavior.
- `GuildMember#joinedTimestamp` is `null` for a missing or invalid join date instead of `NaN`.
- Team members always initialize the legacy `permissions` array.

:::

::: details Messages and attachments

- `Message#pinnable` checks `READ_MESSAGE_HISTORY` and `PIN_MESSAGES` and excludes voice channels.
- Attachment spoiler detection recognizes both the `SPOILER_` filename prefix and Discord's spoiler attachment flag.
- `AttachmentBuilder#setSpoiler()` now sends `is_spoiler` for new files and message edits instead of relying only on the
  filename prefix.
- Attachment flags include clip, thumbnail, remix, spoiler, and animated values.
- Declaration fixes cover raw message data and direct-message send return types where applicable to this fork.

:::

## Dependency alignment

Runtime packages shared with Discord.js are aligned with the 14.27.0 release:

| Package                 | Version/range | Notes                                        |
| ----------------------- | ------------- | -------------------------------------------- |
| `@discordjs/builders`   | `^1.14.1`     | v14 builders                                 |
| `@discordjs/collection` | `1.5.3`       | Pinned to the major used by Discord.js 14.27 |
| `@discordjs/formatters` | `^0.6.2`      | Root re-exports                              |
| `@discordjs/rest`       | `^2.6.2`      | Internal dependency; not re-exported         |
| `@discordjs/util`       | `^1.2.0`      | Includes disposal polyfill support           |
| `@discordjs/ws`         | `^1.2.3`      | Internal dependency; not re-exported         |
| `discord-api-types`     | `^0.38.49`    | Discord API v10 types and enums              |
| `undici`                | `^7.28.0`     | HTTP transport and proxy support             |
| `otplib`                | `^13.4.1`     | TOTP generation for eligible MFA flows       |
| `tslib`                 | `^2.6.3`      | Shared TypeScript runtime helpers            |

::: info Collection compatibility
`@discordjs/collection` intentionally remains on `1.5.3` instead of silently moving applications to Collection v2.
:::

## Migration guide

### Recommended migration strategy

Upgrade in small steps instead of renaming every API at once:

1. Upgrade Node.js and replace the package dependency.
2. Confirm the existing application can connect without changing legacy event names.
3. Move imports to the v14-compatible aliases.
4. Migrate events and partials.
5. Review REST retry behavior and API v10 payload changes.
6. Move custom TLS and proxy settings to their explicit transport options.
7. Adopt the new poll, attachment, activity, voice-channel information, and invite APIs only where needed.
8. Run type checks and exercise login, messaging, command invocation, reconnect, and proxy behavior.

This order makes package/runtime problems easier to distinguish from API migration problems.

### 1. Upgrade the runtime and package

Altkit Discord v4 requires Node.js 20.19 or newer:

```sh
node --version
npm uninstall discord.js-selfbot-v13
npm install @altkit/discord
```

After installation, confirm the resolved versions:

```sh
npm list @altkit/discord @discordjs/collection @discordjs/rest @discordjs/ws
```

::: warning Reinstall dependencies
Do not copy the old `node_modules` directory into a v4 deployment. Install from the updated `package.json` and lockfile so packages from the previous compatibility baseline cannot remain in the dependency tree.
:::

### 2. Update package imports

#### CommonJS

```diff
- const { Client } = require('discord.js-selfbot-v13');
+ const { Client, Events, Partials } = require('@altkit/discord');
```

#### TypeScript

```diff
- import { Client } from 'discord.js-selfbot-v13';
+ import { Client, Events, Partials } from '@altkit/discord';
```

Altkit Discord continues to ship declarations through `typings/index.d.ts`. Applications using `moduleResolution: "node"` can
consume the declarations without a separate `@types` package.

### 3. Migrate public class names

Legacy names remain usable, but these aliases make shared Discord.js v14 code easier to port:

| Legacy fork name    | Preferred v14-compatible name | Migration required?                                |
| ------------------- | ----------------------------- | -------------------------------------------------- |
| `MessageAttachment` | `AttachmentBuilder`           | No; both names resolve to the same implementation. |
| `Channel`           | `BaseChannel`                 | No; `BaseChannel` is an alias.                     |
| `Intents`           | `IntentsBitField`             | No; existing intent values remain accepted.        |
| `MessageFlags`      | `MessageFlagsBitField`        | No; the legacy class remains exported.             |
| `Permissions`       | `PermissionsBitField`         | No; permission values remain bigint-based.         |
| `UserFlags`         | `UserFlagsBitField`           | No; the legacy class remains exported.             |

::: info Aliases retain their implementation
These are compatibility aliases, not replacements with different constructors. You can migrate names incrementally.
:::

### 4. Prefer modern event constants

```diff
- client.once('ready', () => {
-   console.log(`${client.user.tag} is ready`);
+ client.once(Events.ClientReady, readyClient => {
+   console.log(`${readyClient.user.tag} is ready`);
  });
```

Relevant event changes:

| Legacy listener           | Preferred listener                               | Notes                                   |
| ------------------------- | ------------------------------------------------ | --------------------------------------- |
| `ready`                   | `Events.ClientReady` (`clientReady`)             | Both are emitted in v4.                 |
| `webhookUpdate`           | `Events.WebhooksUpdate` (`webhooksUpdate`)       | Both are emitted in v4.                 |
| _None_                    | `Events.VoiceServerUpdate` (`voiceServerUpdate`) | Receives raw voice-server gateway data. |
| `'messageCreate'`         | `Events.MessageCreate`                           | Same event payload.                     |
| `'messagePollVoteAdd'`    | `Events.MessagePollVoteAdd`                      | May contain partial poll data.          |
| `'messagePollVoteRemove'` | `Events.MessagePollVoteRemove`                   | May contain partial poll data.          |

String event listeners do not have to be rewritten immediately. Constants are recommended because TypeScript can associate
the constant with the corresponding `ClientEvents` tuple.

### 5. Migrate partial configuration

Legacy string partials and modern numeric partials are both accepted:

```diff
- const { Client, Constants } = require('discord.js-selfbot-v13');
+ const { Client, Partials } = require('@altkit/discord');

  const client = new Client({
-   partials: [Constants.PartialTypes.MESSAGE, Constants.PartialTypes.REACTION],
+   partials: [Partials.Message, Partials.Reaction],
  });
```

The complete mapping is:

| Legacy partial          | Modern partial                 |
| ----------------------- | ------------------------------ |
| `USER`                  | `Partials.User`                |
| `CHANNEL`               | `Partials.Channel`             |
| `GUILD_MEMBER`          | `Partials.GuildMember`         |
| `MESSAGE`               | `Partials.Message`             |
| `REACTION`              | `Partials.Reaction`            |
| `GUILD_SCHEDULED_EVENT` | `Partials.GuildScheduledEvent` |
| `THREAD_MEMBER`         | `Partials.ThreadMember`        |
| `SOUNDBOARD_SOUND`      | `Partials.SoundboardSound`     |
| `POLL`                  | `Partials.Poll`                |
| `POLL_ANSWER`           | `Partials.PollAnswer`          |

Enable poll partials when vote events must work for uncached messages:

```js
const client = new Client({
  partials: [Partials.Message, Partials.Poll, Partials.PollAnswer],
});
```

Event handlers should hydrate partial polls before reading fields that may be absent:

```js
client.on(Events.MessagePollVoteAdd, async answer => {
  const poll = answer.poll.partial ? await answer.poll.fetch() : answer.poll;
  console.log(poll.question.text, answer.id);
});
```

### 6. Migrate attachments and voice messages

`AttachmentBuilder` is an alias of the existing `MessageAttachment`, so ordinary file uploads can change imports without
changing behavior:

```diff
- const { MessageAttachment } = require('discord.js-selfbot-v13');
- const attachment = new MessageAttachment('./image.png', 'image.png');
+ const { AttachmentBuilder } = require('@altkit/discord');
+ const attachment = new AttachmentBuilder('./image.png', 'image.png');
```

Voice messages require all of the following:

- An Ogg/Opus input file
- A `.ogg` attachment filename
- Waveform and duration metadata
- The `IS_VOICE_MESSAGE` message flag

```js
const { AttachmentBuilder, MessageFlags } = require('@altkit/discord');

const attachment = new AttachmentBuilder('./voice-message.ogg', 'voice-message.ogg', {
  waveform: 'AAAAAAAAAAAA',
  duration_secs: 1,
});

await channel.send({
  files: [attachment],
  flags: MessageFlags.FLAGS.IS_VOICE_MESSAGE,
});
```

Spoilers now use the v10 attachment request field while retaining the filename prefix for older client behavior:

```js
const attachment = new AttachmentBuilder('./map.png', 'map.png').setSpoiler();

await channel.send({ files: [attachment] });
```

### 7. Migrate poll access

Poll answers now expose a voter manager. Existing `fetchVoters()` calls still work, while new code can use the manager and
its cache:

```diff
- const voters = await answer.fetchVoters({ limit: 100 });
+ const voters = await answer.voters.fetch({ limit: 100 });
+ console.log(answer.voters.cache.size);
```

When a poll is partial:

```js
if (message.poll?.partial) {
  await message.poll.fetch();
}

for (const answer of message.poll?.answers.values() ?? []) {
  console.log(answer.id, answer.voteCount, answer.partial);
}
```

### 8. Adopt new 14.27 data safely

Several properties are nullable or depend on Discord including them in a payload. Use guards when adopting them:

```js
const theme = message.sharedClientTheme;
const nameplate = member.collectibles?.nameplate;

if (theme) {
  console.log(theme.colors, theme.gradientAngle);
}
```

Activity instances are fetched through the application:

```js
const authorized = await client.authorizedApplications();
const { application } = authorized.get(applicationId);
const instance = await application.fetchActivityInstance(instanceId);

console.log(instance.location.channel, instance.users);
```

### 9. Adopt current API v10 fields

Application payloads can expose flag bits that do not fit in the legacy numeric field. Continue using `flags` for existing
named flags and use `flagsNew` when the complete response bitfield matters:

```js
console.log(application.flags.has('ACTIVE'));
console.log(application.flagsNew); // bigint
```

Request ephemeral voice-channel fields after the client is ready. The response and later update dispatches refresh cached
voice channels and emit `channelUpdate`:

```js
guild.requestChannelInfo(['status', 'voice_start_time']);

client.on('channelUpdate', (oldChannel, channel) => {
  if (channel.isVoice()) console.log(channel.status, channel.voiceStartAt);
});
```

Community invites can assign roles and restrict acceptance to a CSV or an array of users:

```js
const invite = await guild.invites.create(channelId, {
  roleIds: [memberRoleId],
  targetUsersFile: [allowedUserId],
  unique: true,
});

const allowedUsers = await guild.invites.fetchTargetUsers(invite.code);
const processing = await guild.invites.fetchTargetUsersJobStatus(invite.code);
```

### 10. Review REST behavior changes

- Successful endpoints documented with no response body now resolve to `undefined`.
- `POST` and `PATCH` requests are not automatically replayed after an ambiguous network failure or server error.
- Shared-scope 429 responses are excluded from the invalid-request warning counter.
- Webhook tokens are redacted from route diagnostics and isolated as internal rate-limit major parameters.
- Raw image buffers used in image-data fields must contain JPEG, PNG, or GIF signatures; unknown data now throws instead
  of being incorrectly labeled as JPEG.
- CDN image sizes such as `56`, `96`, `300`, and `600` are no longer accepted because v10 documents only powers of two.

### 11. Configure TLS and proxies

Most applications need no TLS configuration. If the previous version placed certificate fields directly in a plain
`http.agent` or `ws.agent` object, move them to the explicit destination option:

```diff
 const client = new Client({
   http: {
-    agent: { ca: process.env.CA_CERT },
+    tls: { ca: process.env.CA_CERT },
   },
   ws: {
-    agent: { ca: process.env.CA_CERT },
+    tls: { ca: process.env.CA_CERT },
   },
 });
```

Keep proxy connection options in `http.agent`, and use `requestTls` versus `proxyTls` according to which side of the proxy
needs the custom trust configuration. See [client configuration](/guide/client-configuration#tls-configuration) for the
complete precedence rules.

### 12. Move credentials out of source code

Replace literal tokens with the environment variable supported by `Client`:

```diff
- client.login('user-token');
+ client.login(process.env.DISCORD_TOKEN);
```

Copy the repository template and use Node's built-in environment loader:

```sh
cp .env.example .env
node --env-file=.env index.js
```

See [`.env.example`](https://github.com/altkit/discord/blob/selfbotjs/.env.example) for every example variable and credential-handling guidance.

### 13. Verify the migrated application

At minimum, check the installed compatibility target and root exports:

```js
const altkitDiscord = require('@altkit/discord');

console.log({
  version: altkitDiscord.version,
  discordJsVersion: altkitDiscord.discordJsVersion,
  hasEvents: Boolean(altkitDiscord.Events),
  hasPartials: Boolean(altkitDiscord.Partials),
});
```

Expected compatibility values for this release:

```text
version: {{ altkitDiscordVersion }}
discordJsVersion: 14.27.0
```

Use this final rollout checklist:

- [ ] `npm list @altkit/discord` resolves one v4 installation.
- [ ] The client reaches `Events.ClientReady` after login.
- [ ] Message create/update listeners still receive the expected payloads.
- [ ] Reconnect and resume behavior works without duplicate listeners.
- [ ] REST limits from different methods, channels, guilds, and webhooks do not block unrelated requests.
- [ ] Custom REST and WebSocket TLS settings reach the intended destination or proxy connection.
- [ ] Poll handlers account for partial data.
- [ ] Attachment create/edit operations preserve the intended spoiler state.
- [ ] Voice channel information updates `status` and `voiceStartAt` after `requestChannelInfo()`.
- [ ] Voice message attachments are valid Ogg/Opus files.
- [ ] TypeScript and declaration tests pass without imports from the old package.
- [ ] No token, TOTP secret, or proxy credential appears in committed files or logs.

### Compatibility caveats

::: info Compatibility caveats
Altkit Discord targets the public Discord.js 14.27 API surface where it applies to this fork. It is not a drop-in replacement for every bot-only behavior in upstream Discord.js.
:::

- User accounts do not have the same gateway intent and application-command lifecycle as bot users.
- User accounts cannot register application commands or create and handle bot-owned buttons, select menus, or modals.
- `sendSlash()` invokes commands exposed by installed applications; it does not register them.
- Fork-specific methods such as `acceptInvite()`, `authorizeURL()`, rich presence helpers, and voice/video helpers remain
  outside the upstream Discord.js API.
- Existing uppercase flag names such as `MessageFlags.FLAGS.IS_VOICE_MESSAGE` remain part of the fork's compatibility layer.
- API enums and compatible utilities are re-exported from companion packages, while selfbot-specific structures take
  precedence when an export name overlaps.
- Undocumented Discord payloads can change independently of Altkit Discord or Discord.js releases.

### Complete migrated example

```js
const { Client, Events, Partials } = require('@altkit/discord');

const client = new Client({
  partials: [Partials.Message, Partials.Poll, Partials.PollAnswer],
});

client.once(Events.ClientReady, readyClient => {
  console.log(`${readyClient.user.tag} is ready`);
});

client.login(process.env.DISCORD_TOKEN);
```

For runnable feature demonstrations, see the [example gallery](/examples/).

## Upstream reference

- [Discord API v10 reference](https://docs.discord.com/developers/reference)
- [Discord rate limits](https://docs.discord.com/developers/topics/rate-limits)
- [Discord Gateway events](https://docs.discord.com/developers/events/gateway-events)
- [Node.js TLS options](https://nodejs.org/api/tls.html#tlsconnectoptions-callback)
- [Discord.js 14.27.0 release notes](https://github.com/discordjs/discord.js/releases/tag/14.27.0)
- [Altkit Discord README](https://github.com/altkit/discord/blob/selfbotjs/README.md)
- [Altkit Discord examples](/examples/)

Altkit Discord implements the parts of Discord.js 14.27 applicable to this fork. Bot-only guide changes and webhook-only typing
changes do not alter the selfbot runtime API.
