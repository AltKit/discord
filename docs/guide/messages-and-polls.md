# Messages, attachments, and polls

Text-based channels expose `send()`, message managers, collectors, typing indicators, and fork-specific helpers. Always fetch a channel when it may not already be cached.

## Send a message

```js
const channel = await client.channels.fetch(process.env.CHANNEL_ID);

await channel.send('Hello from Altkit Discord');
await channel.send({
  content: 'A structured message',
  allowedMentions: { parse: [] },
});
```

Restrict allowed mentions when content contains user-controlled text to avoid unintended pings.

## Reply and edit

```js
const reply = await message.reply({
  content: 'Working on it…',
  allowedMentions: { repliedUser: false },
});

await reply.edit('Finished.');
```

`failIfNotExists` controls what happens when a referenced message has disappeared. It can be set per operation or as a client default.

## Attach files

```js
const { AttachmentBuilder } = require('@altkit/discord');

const attachment = new AttachmentBuilder('./report.txt', 'report.txt', {
  description: 'Generated report',
});

await channel.send({
  content: 'Latest report',
  files: [attachment],
});
```

Files may also be buffers, streams, or supported remote resources. Validate paths and sizes before accepting user-controlled file inputs.

## Embeds

For ordinary message embeds, use the v14 builders re-exported by the package:

```js
const { EmbedBuilder } = require('@altkit/discord');

const embed = new EmbedBuilder()
  .setTitle('Status')
  .setDescription('All systems operational')
  .setColor(0x8b5cf6)
  .setTimestamp();

await channel.send({ embeds: [embed] });
```

`WebEmbed` is a fork-specific helper for Discord's hidden link-preview format. Treat remote image, video, redirect, and provider URLs as untrusted input when constructing one.

## Create a poll

```js
const message = await channel.send({
  poll: {
    question: { text: 'What should we build next?' },
    answers: [
      { text: 'Documentation', emoji: '📚' },
      { text: 'Examples', emoji: '🧪' },
      { text: 'Tests', emoji: '✅' },
    ],
    duration: 8,
    allowMultiselect: false,
  },
});
```

Poll duration is expressed in hours. Discord may enforce additional limits on answer count, text, emoji, and duration.

## Vote and inspect voters

```js
await message.vote(1);

const poll = message.poll.partial ? await message.poll.fetch() : message.poll;
const voters = await poll.answers.get('1').voters.fetch();

console.log(voters.map(user => user.tag));
```

Vote methods and cache shape can vary with the gateway data available to the client. Enable the poll partials described in [events and partials](./events-and-partials) when processing vote events.

## Voice messages

Discord voice messages are Ogg/Opus attachments with waveform and duration metadata:

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

The library does not turn arbitrary audio into a valid voice-message file. Encode the source as Ogg/Opus and calculate appropriate duration and waveform data first.

## Collect messages

```js
const filter = candidate => candidate.author.id === client.user.id && candidate.content.startsWith('!answer');
const collected = await channel.awaitMessages({
  filter,
  max: 1,
  time: 30_000,
});

console.log(collected.first()?.content);
```

Collectors retain listeners until they stop. Always set an appropriate timeout or explicitly stop long-lived collectors.
