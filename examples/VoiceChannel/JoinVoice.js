// Join a voice channel and do nothing

/*
Install:
- An Opus library: @discordjs/opus or opusscript
- An encryption packages:
  + sodium (best performance)
  + libsodium-wrappers
  + @stablelib/xchacha20poly1305
- ffmpeg (install and add to your system environment)
*/

const { Client, Events } = require('selfbotjs');
const client = new Client();

client.once(Events.ClientReady, async readyClient => {
  console.log(`${readyClient.user.tag} is ready`);
  const channel = await readyClient.channels.fetch(process.env.VOICE_CHANNEL_ID);
  const connection = await client.voice.joinChannel(channel, {
    selfMute: true,
    selfDeaf: true,
    selfVideo: false,
  });
  // Leave voice
  setTimeout(() => {
    connection.disconnect();
  }, 5_000);
});

client.login(process.env.DISCORD_TOKEN);
