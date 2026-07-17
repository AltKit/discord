# Example gallery

The repository examples target Altkit Discord v4 and Node.js 20.18 or newer. Run them from the repository root after installing dependencies, or adapt one into an application that depends on `@altkit/discord`.

::: danger Use a non-critical account
Selfbot use violates Discord's Terms of Service and can result in account termination. Never put a real token in an example file, commit, issue, screenshot, or log.
:::

## Run an example

```sh
git clone https://github.com/altkit/discord.git
cd discord
npm ci
cp .env.example .env
```

Populate only the variables needed by the selected example, then use Node's environment-file support:

```sh
node --env-file=.env examples/Basic.js
```

Discord snowflake IDs should remain strings. Voice and media examples may also need codecs, native packages, files, or devices described in their headers.

## Basics

### Connect and respond

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

Repository file: [`examples/Basic.js`](https://github.com/altkit/discord/blob/main/examples/Basic.js)

### Use an HTTP proxy

```js
const client = new Client({
  http: {
    agent: process.env.HTTP_PROXY,
  },
});
```

Repository file: [`examples/Proxy.js`](https://github.com/altkit/discord/blob/main/examples/Proxy.js)

## Messages

| Example | What it demonstrates | Environment |
| --- | --- | --- |
| `ActivityMessage.js` | Send a message activity payload | `DISCORD_TOKEN`, `CHANNEL_ID` |
| `CreateAndVotePoll.js` | Create, vote on, and observe a poll | `DISCORD_TOKEN`, `CHANNEL_ID` |
| `VoiceMessage.js` | Send prepared Ogg/Opus as a voice message | `DISCORD_TOKEN`, `CHANNEL_ID` |
| `Embed.js` | Build the fork-specific hidden `WebEmbed` format | `DISCORD_TOKEN` |

### Poll

```js
const { Client, Events, Partials } = require('@altkit/discord');

const client = new Client({
  partials: [Partials.Message, Partials.Poll, Partials.PollAnswer],
});

client.once(Events.ClientReady, async readyClient => {
  const channel = await readyClient.channels.fetch(process.env.CHANNEL_ID);
  const message = await channel.send({
    poll: {
      question: { text: 'What is your favorite color?' },
      answers: [
        { text: 'Red', emoji: '🍎' },
        { text: 'Green', emoji: '🥗' },
        { text: 'Blue', emoji: '💙' },
      ],
      duration: 8,
      allowMultiselect: true,
    },
  });

  await message.vote(1, 3);
});
```

## Account and application helpers

| Example | What it demonstrates | Environment |
| --- | --- | --- |
| `JoinGuild.js` | Accept an invite code | `DISCORD_TOKEN`, `INVITE_CODE` |
| `AuthorizeUserApps.js` | Install a user application | `DISCORD_TOKEN`, `APPLICATION_ID` |
| `AddBot.js` | Authorize an application into a guild | `DISCORD_TOKEN`, `APPLICATION_ID`, `GUILD_ID`; optional `TOTP_SECRET` |
| [Slash commands](./slash-commands) | Invoke commands, upload attachments, and reply to modals | Varies by command |

Treat invite, authorization, and verification flows as sensitive account operations. Use explicit IDs and inspect results instead of retrying failures indefinitely.

## Presence

`RichPresence.js` combines `RichPresence`, `CustomStatus`, and `SpotifyRPC`. `SamsungRPC.js` demonstrates a mobile-platform activity shape.

```js
const custom = new CustomStatus(client)
  .setEmoji('🛠️')
  .setState('Building');

client.user.setPresence({ activities: [custom] });
```

See [presence and activities](/guide/presence) for the concepts and caveats.

## Voice and video

The `examples/VoiceChannel/` directory includes join, audio playback, video playback, audio recording, and video recording examples. They are syntax-checked in CI but are not executed there because they require a live account, Discord resources, codecs, native packages, network access, and sometimes media devices.

Read [voice and media](/guide/voice-and-media) before installing optional dependencies or recording participants.

## Environment matrix

| Example | Required values |
| --- | --- |
| `Basic.js`, `Embed.js`, `RichPresence.js`, `SamsungRPC.js` | `DISCORD_TOKEN` |
| `ActivityMessage.js`, `CreateAndVotePoll.js`, `VoiceMessage.js` | `DISCORD_TOKEN`, `CHANNEL_ID` |
| `JoinGuild.js` | `DISCORD_TOKEN`, `INVITE_CODE` |
| `AuthorizeUserApps.js` | `DISCORD_TOKEN`, `APPLICATION_ID` |
| `AddBot.js` | `DISCORD_TOKEN`, `APPLICATION_ID`, `GUILD_ID`; optional `TOTP_SECRET` |
| `Proxy.js` | `DISCORD_TOKEN`; optional `HTTP_PROXY` |
| `VoiceChannel/*.js` | `DISCORD_TOKEN`, `VOICE_CHANNEL_ID`, plus example-specific media requirements |
