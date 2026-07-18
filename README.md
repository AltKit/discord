# Altkit Discord

An unofficial Discord.js v14.27-compatible fork for Discord API v10 and Gateway v10 user-account workflows.

[![npm](https://img.shields.io/npm/v/%40altkit%2Fdiscord.svg)](https://www.npmjs.com/package/@altkit/discord)
[![CI](https://github.com/altkit/discord/actions/workflows/ci.yml/badge.svg)](https://github.com/altkit/discord/actions/workflows/ci.yml)
[![Discord.js compatibility](https://img.shields.io/badge/discord.js-14.27.0-5865f2)](https://github.com/discordjs/discord.js/releases/tag/14.27.0)

> [!CAUTION]
> Automating a normal Discord user account violates Discord's Terms of Service and may result in account termination.
> Altkit Discord is unofficial, is not supported by Discord, and is used entirely at your own risk.

## What is v4?

Altkit Discord v4 targets Discord API v10 and Gateway v10 by default while preserving its Discord.js 14.27-compatible
surface and fork-specific helpers. It includes modern exports, events, partials, poll support, shared client themes,
activity instances, voice messages, and account, presence, TOTP, voice, and video features.

This package is user-account-only. Bot and OAuth bearer tokens are rejected, bot Gateway intents are disabled, and
bot-owned command registration, command permissions, interaction responses, and multi-process sharding fail locally
with `BOT_ONLY_API_DISABLED` before making a Discord request.

Read [the complete v4 migration guide](docs/migrate.md) before upgrading from v3.

## Requirements

- Node.js 20.19 or newer
- A Discord user token supplied at runtime (never committed to source control)

## Installation

```sh
npm install @altkit/discord
```

## Quick start

```js
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

client.login(process.env.DISCORD_TOKEN);
```

Run it without placing the token in the file:

```sh
DISCORD_TOKEN='your-token' node index.js
```

## Highlights

- Discord API v10 and Gateway v10 defaults, plus Discord.js 14.27-compatible formatters, REST utilities, API enums, `Events`, and `Partials`
- Messages, attachments, embeds, polls, voice messages, and shared client themes
- Invoke slash commands exposed by installed applications, including commands that return modals
- Guild discovery, invite acceptance, application authorization, and user-installed applications
- Native voice connections, audio/video dispatch, receive streams, recording helpers, and `@discordjs/voice` adapter support
- Captcha callback and automatic TOTP support for eligible MFA flows, powered by otplib v13

## Documentation and examples

- [Documentation website](https://altkit.github.io/discord/)
- [Migrate to v4 / Discord.js 14.27 changes](docs/migrate.md)
- [Developer preservation and redistribution guide](docs/devguide.md)
- [API documentation data](docs/main.json)
- [Runnable examples](examples/README.md)

The examples use `DISCORD_TOKEN` and other environment variables. Copy `.env.example` values into your own environment;
do not commit credentials.

To work on the VitePress documentation locally:

```sh
npm run docs:dev
npm run docs:build
npm run docs:preview
```

## Compatibility

Altkit Discord exposes modern names such as `AttachmentBuilder`, `Events`, `Partials`, and `PermissionsBitField`. Selected legacy
names and events remain available so v3 applications can migrate incrementally. Selfbot-specific behavior is not part of
upstream Discord.js. User accounts cannot register application commands or create and handle bot-owned interactive components,
so bot-only Discord.js examples for slash-command deployment, buttons, select menus, and modals do not apply.

You can inspect compatibility at runtime:

```js
const { version, discordJsVersion, accountType, supportsBotAccounts } = require('@altkit/discord');

console.log({ version, discordJsVersion, accountType, supportsBotAccounts });
```

## Security

- Never paste a user token into an issue, log, screenshot, or committed file.
- Install only the package named `@altkit/discord` from a source you trust.
- Treat third-party captcha solvers, proxies, and media tools as separate security boundaries.
- Rotate the account token immediately if it may have been exposed.
- Do not rely on client-identification values or headers to evade Discord, Cloudflare, rate limits, or account restrictions.

This project intentionally does not include browser-console token extraction instructions.

## Contributing

Before opening a pull request, run:

```sh
npm install
npm test
```

Keep runtime changes, declarations in `typings/index.d.ts`, documentation, and examples in sync. Bug reports should include
the Altkit Discord version, Node.js version, a minimal reproduction with secrets removed, and the relevant error or debug output.

## License and credits

Altkit Discord is licensed under the [GNU General Public License v3.0](LICENSE). It is based on
[discord.js](https://github.com/discordjs/discord.js) and continues the original discord.js-selfbot-v13 project. Current
development lives in [altkit/discord](https://github.com/altkit/discord).
