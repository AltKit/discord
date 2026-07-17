# Interactions and components

Altkit Discord supports receiving interactions and includes user-account helpers for invoking application commands. Discord can change command schemas and user-account interaction behavior independently of this package, so handle rejected or timed-out requests explicitly.

## Receive interactions

```js
const { Events } = require('@altkit/discord');

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton()) {
    await interaction.reply({ content: `Pressed ${interaction.customId}` });
  }
});
```

Use type guards such as `isButton()`, `isModalSubmit()`, or the guards available on the installed version before reading subtype-specific fields.

## Invoke a slash command

Text-based channels expose the fork-specific `sendSlash()` helper:

```js
const response = await channel.sendSlash(
  process.env.APPLICATION_ID,
  'command_name',
  'first option',
  42,
);
```

The first argument identifies the application, the second identifies a command path, and remaining values map to command options in order. Subcommands and groups can be expressed in the command path:

```js
await channel.sendSlash(process.env.APPLICATION_ID, 'animal chat', 'bye');
```

Command definitions can become stale. Fetch or inspect the current command before building automation that depends on option ordering.

## Optional command values

Use `undefined` to skip an optional positional value while preserving later positions:

```js
await channel.sendSlash(
  process.env.APPLICATION_ID,
  'image make',
  'model-name',
  'portrait',
  undefined,
  30,
);
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

Modern modal submissions may contain nested labels, file uploads, radio groups, checkbox groups, and individual checkboxes. `ModalSubmitFieldsResolver` provides corresponding getters; see its [API page](/api/classes/modalsubmitfieldsresolver).

## Deferred responses

Applications may first return a loading message and edit it later. Listen for the matching message update and impose a timeout so the listener cannot remain forever. The complete pattern is in the [slash command example](/examples/slash-commands).

## Components

Altkit Discord v4 includes current message and modal component builders alongside compatibility structures. When handling components:

- use stable, scoped `customId` values;
- validate the acting user and channel when the action is sensitive;
- acknowledge interactions within Discord's deadline;
- disable or remove controls after one-time workflows finish;
- treat uploaded files and text values as untrusted input.
