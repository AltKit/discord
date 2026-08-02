# Altkit Discord

An unofficial, user-account-only Discord.js v14.27-compatible library for Discord API v10 and Gateway v10.

[![npm](https://img.shields.io/npm/v/%40altkit%2Fdiscord.svg)](https://www.npmjs.com/package/@altkit/discord)
[![CI](https://github.com/altkit/discord/actions/workflows/ci.yml/badge.svg)](https://github.com/altkit/discord/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.19-339933)](https://nodejs.org/)
[![Discord.js compatibility](https://img.shields.io/badge/discord.js-14.27.0-5865f2)](https://github.com/discordjs/discord.js/releases/tag/14.27.0)
[![License](https://img.shields.io/badge/license-GPL--3.0--only-blue.svg)](LICENSE)

> [!CAUTION]
> Automating a normal Discord user account violates Discord's Terms of Service and may result in account termination.
> Altkit Discord is unofficial, is not supported by Discord, and is used entirely at your own risk.

## Overview

Altkit Discord adapts the familiar Discord.js programming model to user-account workflows while retaining account-specific
features from the original `discord.js-selfbot-v13` project. Version 4 targets the Discord.js 14.27 public surface where it
applies to this fork and defaults REST and Gateway traffic to Discord API v10.

|                         | Support                                |
| ----------------------- | -------------------------------------- |
| Package                 | `@altkit/discord`                      |
| Discord.js surface      | `14.27.0`                              |
| Discord API and Gateway | `v10`                                  |
| Node.js                 | `20.19.0` or newer                     |
| Runtime module format   | CommonJS, with TypeScript declarations |
| Account type            | Discord user accounts only             |
| License                 | GPL-3.0-only                           |

Bot tokens, bot Gateway intents, application-command registration, interaction callbacks, and multi-process sharding are
intentionally unsupported. APIs that depend on those workflows fail locally instead of silently attempting a bot request.
Builders and Discord API types may still be exported for payload compatibility; an export does not make its bot-only
endpoint available to user accounts.

Read the [v4 migration guide](docs/migrate.md) before upgrading an existing v3 application.

## Install

```sh
npm install @altkit/discord
```

The package includes its own TypeScript declarations. A separate `@types` package is not required.

## Quick start

Create `index.js`:

```js
'use strict';

const { Client, Events } = require('@altkit/discord');

const client = new Client();

client.once(Events.ClientReady, readyClient => {
  console.log(`${readyClient.user.tag} is ready`);
});

client.on(Events.MessageCreate, async message => {
  if (message.author.id === client.user.id && message.content === '!ping') {
    await message.reply('Pong!');
  }
});

client.login(process.env.DISCORD_TOKEN).catch(error => {
  console.error('Login failed:', error.message);
  process.exitCode = 1;
});
```

Create a local `.env` file that is excluded from version control:

```dotenv
DISCORD_TOKEN=
```

Then use Node's built-in environment-file loader:

```sh
node --env-file=.env index.js
```

Never hard-code, commit, log, or paste an account token into an issue. This project intentionally does not document token
extraction. Rotate the token immediately if it may have been exposed.

## What v4 includes

- Discord API v10 REST routes, payloads, rate-limit buckets, scopes, and retry behavior
- Gateway v10 events, partials, polls, voice-channel status, and voice-session start times
- Messages, embeds, attachments, explicit spoiler metadata, polls, and prepared Ogg/Opus voice messages
- Full v10 channel flags, including spoiler-channel creation and inspection through `ChannelFlags`
- File-type restrictions on file upload modal components via `fileTypes` and `setFileTypes()`
- Modern aliases such as `AttachmentBuilder`, `BaseChannel`, `Events`, `Partials`, and `PermissionsBitField`
- Current application flag precision through `Application#flagsNew`
- A `Constants.APIErrors` table that mirrors the current v10 JSON error code reference
- Current modal component response shapes used by user-side command invocation
- Invite acceptance, community invite roles and target-user lists, guild discovery, and user-app installation
- Relationships, account settings, sessions, custom status, rich presence, and activity instances
- Voice connections, audio/video dispatch, receive streams, recording helpers, and `@discordjs/voice` adapters
- Webhook clients and compatible Discord.js builders, formatters, utilities, and Discord API v10 enums
- Optional captcha callbacks and TOTP handling for eligible authentication challenges

Discord permissions, experiments, verification requirements, and account eligibility still determine whether a particular
operation succeeds. Undocumented account endpoints can change independently of this project.

## API v10 transport behavior

The REST layer discovers Discord bucket hashes and separates limits by HTTP method and major resource. It accepts rate-limit
timing from current headers or response payloads and does not automatically replay ambiguous `POST` or `PATCH` failures,
because Discord may already have applied those requests.

REST, Gateway, voice, and remote-auth connections use TLS 1.2 or newer by default. Most applications should keep the secure
defaults. Custom destination trust can be configured separately for REST and WebSocket traffic:

```js
const client = new Client({
  http: {
    tls: { ca: process.env.REST_CA_CERT },
  },
  ws: {
    tls: { ca: process.env.GATEWAY_CA_CERT },
  },
});
```

Proxy destination TLS and HTTPS-proxy TLS use separate `requestTls` and `proxyTls` options. See the
[client configuration guide](docs/guide/client-configuration.md#tls-configuration) for precedence rules. Do not disable
certificate verification in production.

## Compatibility

Selected legacy names remain available so v3 applications can migrate incrementally:

| Legacy name         | Preferred compatible name |
| ------------------- | ------------------------- |
| `MessageAttachment` | `AttachmentBuilder`       |
| `Channel`           | `BaseChannel`             |
| `Intents`           | `IntentsBitField`         |
| `MessageFlags`      | `MessageFlagsBitField`    |
| `Permissions`       | `PermissionsBitField`     |
| `UserFlags`         | `UserFlagsBitField`       |

Runtime metadata makes the package boundary inspectable:

```js
const { accountType, discordJsVersion, supportsBotAccounts, version } = require('@altkit/discord');

console.log({ version, discordJsVersion, accountType, supportsBotAccounts });
```

Altkit aims for source-level familiarity, not perfect behavioral identity with upstream Discord.js. In particular,
upstream examples for deploying application commands or handling bot-owned buttons, select menus, and modals do not apply.
`sendSlash()` invokes commands exposed by installed applications; it does not register them.

## Documentation

- [Documentation website](https://altkit.github.io/discord/)
- [Getting started](docs/guide/getting-started.md)
- [Client and TLS configuration](docs/guide/client-configuration.md)
- [Compatibility guide](docs/guide/compatibility.md)
- [REST and rate limits](docs/guide/rest-and-rate-limits.md)
- [Security guide](docs/guide/security.md)
- [Migration guide](docs/migrate.md)
- [Runnable examples](examples/README.md)
- [Developer and redistribution guide](docs/devguide.md)

The examples use `DISCORD_TOKEN` and feature-specific IDs from the environment. Copy `.env.example` to `.env`, populate only
the values required by the selected example, and read its prerequisites before running it.

## Security

- Keep tokens, TOTP secrets, proxy credentials, cookies, and custom certificates outside source control.
- Treat third-party captcha solvers, proxies, media tools, and modified package distributions as separate trust boundaries.
- Keep TLS certificate verification enabled and install only `@altkit/discord` from a source you trust.
- Remove credentials and sensitive request data from bug reports, logs, screenshots, and reproductions.
- Do not use client-identification values or headers to evade Discord, Cloudflare, rate limits, or account restrictions.

See the [security guide](docs/guide/security.md) for deployment and incident-response guidance.

## Development

Install dependencies and run the complete validation pipeline:

```sh
npm install
npm test
npm run docs:build
```

`npm test` runs linting, formatting checks, documentation parsing, TypeScript and `tsd`, example syntax checks, unit tests,
and a package smoke test. Keep runtime changes, declarations, documentation, generated API data, and examples synchronized.

For local documentation work:

```sh
npm run docs
npm run docs:dev
```

Bug reports should include the Altkit Discord version, Node.js version, a minimal reproduction with all secrets removed,
and the relevant error or redacted debug output.

## License and credits

Altkit Discord is licensed under the [GNU General Public License v3.0](LICENSE). It is based on
[discord.js](https://github.com/discordjs/discord.js) and continues the original
[discord.js-selfbot-v13](https://github.com/aiko-chan-ai/discord.js-selfbot-v13) project. Current development lives in
[altkit/discord](https://github.com/altkit/discord).
