# Slash commands

`TextBasedChannel#sendSlash()` invokes an application command as the logged-in user account.

```ts
channel.sendSlash(
  application: Snowflake | User,
  commandName: string,
  ...args: Array<string | number | boolean | FileLike | undefined>
): Promise<Message<true> | Modal>
```

::: warning Service compatibility
This is a fork-specific user-account helper, not the bot interaction registration API from upstream Discord.js. Discord may change command behavior independently of this library.
:::

## Basic command

```js
const response = await channel.sendSlash(process.env.APPLICATION_ID, 'command-name');
```

## Subcommands and groups

Include the subcommand group and subcommand in the command name:

```js
await channel.sendSlash(process.env.APPLICATION_ID, 'animal chat', 'bye');
```

Remaining arguments map to command options in order.

## Attachment option

```js
const { AttachmentBuilder } = require('@altkit/discord');

const attachment = new AttachmentBuilder('./wallpaper.jpg', 'wallpaper.jpg');
await channel.sendSlash(process.env.APPLICATION_ID, 'inspect image', attachment);
```

## Skip optional values

Pass `undefined` for an omitted positional option when later values still need to be supplied:

```js
await channel.sendSlash(
  process.env.APPLICATION_ID,
  'image make',
  'model-v11',
  'Phone (9:16)',
  '2',
  undefined,
  undefined,
  undefined,
  30,
);
```

Use the exact command choice value. A choice that appears numeric in Discord may still require a string.

## Reply to a modal

The result can be a message or a modal:

```js
const response = await channel.sendSlash(process.env.APPLICATION_ID, 'profile edit');

if (!response.isMessage) {
  response.components[0].components[0].setValue('Updated value');
  await response.reply();
}
```

Inspect the actual component tree before setting values. Current modals can nest inputs in labels and action rows.

## Wait for a deferred result

An application may return a loading message and later edit it. Match the update by ID, remove the listener after completion, and impose a timeout:

```js
function waitForMessageUpdate(client, pending, timeoutMs = 15 * 60_000) {
  if (!pending.flags.has('LOADING')) return Promise.resolve(pending);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      client.off('messageUpdate', onUpdate);
      reject(new Error('Timed out waiting for the command response'));
    }, timeoutMs);

    function onUpdate(previous, current) {
      if (previous.id !== pending.id) return;
      clearTimeout(timeout);
      client.off('messageUpdate', onUpdate);
      resolve(current);
    }

    client.on('messageUpdate', onUpdate);
  });
}

const pending = await channel.sendSlash(process.env.APPLICATION_ID, 'long command');
const result = await waitForMessageUpdate(client, pending);
console.log(result.content);
```

This pattern avoids leaking one listener per command when an application never sends its final update.
