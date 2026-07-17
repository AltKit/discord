// Join a channel and play music, like a Discord bot.

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
const ytdl = require('@distube/ytdl-core'); // better than ytdl-core
const client = new Client();

client.once(Events.ClientReady, async readyClient => {
  console.log(`${readyClient.user.tag} is ready`);
  const channel = await readyClient.channels.fetch(process.env.VOICE_CHANNEL_ID);
  const connection = await client.voice.joinChannel(channel, {
    selfMute: true,
    selfDeaf: true,
    selfVideo: false,
  });
  const dispatcher = connection.playAudio(
    ytdl('https://www.youtube.com/watch?v=3KadWjpqDXs', {
      quality: 'highestaudio',
    }),
  );
  dispatcher.on('start', () => {
    console.log('audio is now playing!');
    // pause
    console.log('paused');
    dispatcher.pause();
    // resume
    setTimeout(() => {
      console.log('resumed');
      dispatcher.resume();
    }, 5_000);

    // Set volume
    dispatcher.setVolume(0.5);
    console.log('50% volume');
  });

  dispatcher.on('finish', () => {
    console.log('audio has finished playing!');
  });
  dispatcher.on('error', console.error);
  // Leave voice
  setTimeout(() => {
    console.log('disconnected');
    connection.disconnect();
  }, 30_000);
});

client.login(process.env.DISCORD_TOKEN);
