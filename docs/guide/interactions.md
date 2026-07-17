# Slash command invocation

Altkit Discord includes a user-account helper for invoking commands exposed by installed applications. This is distinct from
the bot application-command lifecycle: a user account cannot use this library to register commands or handle bot-owned
interactions. Discord can change command schemas and user-account invocation behavior independently of this package, so handle
rejected or timed-out requests explicitly.

## Invoke a slash command

Text-based channels expose the fork-specific `sendSlash()` helper:

```js
const response = await channel.sendSlash(process.env.APPLICATION_ID, 'command_name', 'first option', 42);
```

The first argument identifies the application, the second identifies a command path, and remaining values map to command options in order. Subcommands and groups can be expressed in the command path:

```js
await channel.sendSlash(process.env.APPLICATION_ID, 'animal chat', 'bye');
```

Command definitions can become stale. Fetch or inspect the current command before building automation that depends on option ordering.

## Optional command values

Use `undefined` to skip an optional positional value while preserving later positions:

```js
await channel.sendSlash(process.env.APPLICATION_ID, 'image make', 'model-name', 'portrait', undefined, 30);
```

Choice values may be strings even when they look numeric. Use the exact value from the command definition.

## Attachments

```js
const { AttachmentBuilder } = require('@altkit/discord');

const image = new AttachmentBuilder('./image.png', 'image.png');
await channel.sendSlash(process.env.APPLICATION_ID, 'inspect', image);
```

## Modal responses

A slash invocation can return a message or a modal. Inspect the result before responding:

```js
const response = await channel.sendSlash(process.env.APPLICATION_ID, 'profile edit');

if (!response.isMessage) {
  response.components[0].components[0].setValue('New value');
  await response.reply();
}
```

This only fills and submits a modal returned by another application's command. It does not create or register a modal owned by
the logged-in user account.

## Deferred responses

Applications may first return a loading message and edit it later. Listen for the matching message update and impose a timeout so the listener cannot remain forever. The complete pattern is in the [slash command example](/examples/slash-commands).

## Unsupported bot workflows

Do not copy upstream bot examples that deploy slash commands, send custom-ID buttons or select menus, open owned modals, or
listen for their interaction submissions. Those workflows require a bot application and bot token.
