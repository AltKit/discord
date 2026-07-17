# Package overview

Altkit Discord is an unofficial CommonJS library that adapts the Discord.js v14 programming model to normal Discord user accounts. It combines familiar Discord.js structures and managers with account-oriented features that upstream Discord.js does not provide.

::: danger Terms of Service
Automating a normal Discord user account violates Discord's Terms of Service and may result in account termination. Altkit Discord is not affiliated with or supported by Discord.
:::

## What the package provides

At a high level, the package covers five areas:

| Area | Important capabilities |
| --- | --- |
| Gateway | Login, reconnects, events, partial structures, presence, and cache updates |
| REST | Rate-limit-aware Discord API requests, managers, fetches, and mutations |
| Discord data | Guilds, channels, messages, users, members, roles, polls, and attachments |
| User-account features | Relationships, notes, settings, invites, authorized applications, rich presence, and slash-command invocation |
| Media | Voice messages, voice connections, audio/video dispatch, receive streams, and recording helpers |

The package also re-exports formatters, API enums, REST helpers, collections, and WebSocket utilities used by Discord.js 14.27.

## The mental model

Most applications begin with one `Client`:

```js
const { Client, Events } = require('@altkit/discord');

const client = new Client();

client.once(Events.ClientReady, readyClient => {
  console.log(readyClient.user.tag);
});

client.login(process.env.DISCORD_TOKEN);
```

From there, four concepts appear throughout the API:

### Structures

Structures represent Discord objects such as `Guild`, `Message`, `User`, and `Role`. They expose the object's current data plus operations that naturally belong to it.

```js
console.log(message.author.tag);
await message.reply('Hello');
```

### Managers

Managers resolve IDs, maintain caches, fetch fresh data, and perform collection-level operations. Managers normally belong to the client or another structure.

```js
const channel = await client.channels.fetch(process.env.CHANNEL_ID);
const member = await guild.members.fetch(process.env.USER_ID);
```

### Collections

Manager caches use `Collection`, a Map-like class with helpers such as `filter()`, `find()`, `map()`, and `first()`.

```js
const textChannels = guild.channels.cache.filter(channel => channel.isTextBased());
```

### Events

The gateway emits events when Discord state changes. Event handlers should be attached before login and must account for partial or uncached data.

```js
client.on(Events.MessageCreate, message => {
  console.log(message.content);
});
```

## How it differs from upstream Discord.js

Altkit aims for source-level familiarity, not perfect behavioral identity. Upstream Discord.js assumes a bot token, application installation, and bot permissions. Altkit uses a user-account gateway and adds APIs for account settings, relationships, invite acceptance, application authorization, rich presence, and user-side command invocation.

This means:

- many common classes and builders look familiar;
- bot-only examples may not work for a user account;
- user-account endpoints can change without appearing in Discord's public bot API documentation;
- some legacy fork names remain as compatibility aliases;
- the fork's implementation takes precedence when user-account behavior differs.

Read [Discord.js compatibility](./compatibility) and the [v4 migration guide](/migrate) before porting an existing application.

## Supported module styles

The runtime is CommonJS:

```js
const { Client } = require('@altkit/discord');
```

TypeScript declarations are included and do not require `@types`:

```ts
import { Client, Events, type ClientOptions } from '@altkit/discord';
```

## What the package does not do

- It does not make selfbot use compliant with Discord's Terms of Service.
- It does not remove Discord permissions, verification, rate limits, or account restrictions.
- It does not guarantee that undocumented user-account endpoints remain stable.
- It does not safely manage your credentials for you.
- It does not automatically encode arbitrary media into every Discord-compatible format.
- It does not make every upstream Discord.js bot example applicable to user accounts.
- It does not register application commands or create and handle bot-owned buttons, select menus, or modals.

## Recommended reading path

1. [Getting started](./getting-started)
2. [Security and account safety](./security)
3. [Client configuration](./client-configuration)
4. [Events and partials](./events-and-partials)
5. [Guilds, channels, and managers](./guilds-and-channels)
6. The feature page matching your application
7. The generated [API reference](/api/)
