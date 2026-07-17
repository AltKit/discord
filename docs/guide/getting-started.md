# Getting started

This guide takes you from an empty Node.js project to a connected Altkit Discord client, without placing account credentials in source code.

::: danger Terms of Service
Automating a normal Discord user account violates Discord's Terms of Service and may lead to account termination. This package is unofficial and is not supported by Discord. Evaluate that risk before continuing.
:::

## Requirements

- Node.js 20.19 or newer
- npm or another Node-compatible package manager
- A Discord user token supplied at runtime
- CommonJS or a TypeScript setup that can import CommonJS packages

Check your runtime before installing:

```sh
node --version
npm --version
```

## Create a project

```sh
mkdir my-altkit-app
cd my-altkit-app
npm init -y
npm install @altkit/discord
```

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

client.login(process.env.DISCORD_TOKEN);
```

The author check matters: without it, the handler responds to other users who send the same text.

## Supply the token safely

Never hard-code a token, include it in a command that will be saved to shared shell history, or paste it into an issue. Use your deployment platform's secret manager in production.

For local development, create a `.env` file that is excluded by `.gitignore`:

```dotenv
DISCORD_TOKEN=
```

Run the program with Node's built-in environment-file support:

```sh
node --env-file=.env index.js
```

This project intentionally does not document ways to extract account tokens from browser or desktop clients. If a token is exposed, rotate it immediately before continuing.

## Understand the client lifecycle

`client.login()` starts the gateway connection. Wait for `Events.ClientReady` before fetching resources or sending startup messages.

```js
client.once(Events.ClientReady, async readyClient => {
  const channel = await readyClient.channels.fetch(process.env.CHANNEL_ID);
  await channel.send('Altkit Discord is connected.');
});
```

For a graceful shutdown, destroy the client so sockets and timers are released:

```js
async function shutdown(signal) {
  console.log(`Received ${signal}; disconnecting`);
  client.destroy();
  process.exitCode = 0;
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
```

## Handle errors

Listen for client warnings and errors during development. Avoid logging request headers, tokens, TOTP secrets, or complete payloads from authentication flows.

```js
client.on(Events.Warn, warning => console.warn(warning));
client.on(Events.Error, error => console.error(error));

client.login(process.env.DISCORD_TOKEN).catch(error => {
  console.error('Login failed:', error.message);
  process.exitCode = 1;
});
```

Individual API calls should also be awaited and handled:

```js
try {
  const channel = await client.channels.fetch(process.env.CHANNEL_ID);
  await channel.send('Hello');
} catch (error) {
  console.error('Could not send the message:', error.message);
}
```

## TypeScript

The package ships declarations in `typings/index.d.ts`; no separate `@types` package is needed.

```ts
import { Client, Events, type Message } from '@altkit/discord';

const client = new Client();

client.on(Events.MessageCreate, (message: Message) => {
  console.log(message.content);
});
```

The runtime remains CommonJS. If your application is ESM-only, import the package's CommonJS namespace in the way supported by your Node.js and TypeScript configuration.

## Verify the installed version

```js
const { discordJsVersion, version } = require('@altkit/discord');

console.log({ version, discordJsVersion });
```

Altkit Discord v4 targets the Discord.js 14.27 API surface. Continue with [client configuration](./client-configuration), or jump to the [example gallery](/examples/).
