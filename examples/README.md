# SelfbotJS examples

These examples target SelfbotJS v4 and Node.js 20.18 or newer. Run them from the repository root after installing
dependencies, or copy the relevant example into an application that depends on `selfbotjs`.

Set credentials and IDs through the environment:

```sh
export DISCORD_TOKEN='your-token'
export CHANNEL_ID='123456789012345678'
node examples/Basic.js
```

Never put a real user token in an example file. The placeholder IDs identify values you must provide; Discord snowflakes
should remain strings.

## Examples

- `Basic.js`: connect and reply to a message.
- `ActivityMessage.js`: send a message activity payload.
- `CreateAndVotePoll.js`: create a poll, vote, and listen for vote updates.
- `VoiceMessage.js`: send a prepared Ogg/Opus file as a voice message.
- `Embed.js`: send the fork-specific hidden web embed format.
- `RichPresence.js` and `SamsungRPC.js`: publish account activities.
- `AuthorizeUserApps.js`, `AddBot.js`, and `JoinGuild.js`: user-account application and invite helpers.
- `Proxy.js`: configure the built-in HTTP proxy support.
- `SlashCommand.md`: invoke application commands and handle messages or modals.
- `VoiceChannel/`: join voice and use the optional audio/video stack.

Voice/media examples require the optional packages listed in their file headers. They are syntax-checked in CI but are not
executed because they require a live account, Discord resources, native codecs, and media devices.
