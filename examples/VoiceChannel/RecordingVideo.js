// https://v12.discordjs.guide/voice/receiving-audio.html#basic-usage

/*
Install:
- An Opus library: @discordjs/opus or opusscript
- An encryption packages:
  + sodium (best performance)
  + libsodium-wrappers
  + @stablelib/xchacha20poly1305
- ffmpeg (install and add to your system environment)
*/

const { Client, Events } = require('@altkit/discord');
const client = new Client();

const fs = require('fs');

client.once(Events.ClientReady, async readyClient => {
  console.log(`${readyClient.user.tag} is ready`);

  const channel = await readyClient.channels.fetch(process.env.VOICE_CHANNEL_ID);
  const connection = await client.voice.joinChannel(channel, {
    selfMute: true,
    selfDeaf: true,
    selfVideo: false,
  });

  const connectionStream = await connection.joinStreamConnection('user_id');

  const video = connectionStream.receiver.createVideoStream('user_id', fs.createWriteStream('video.mkv')); // Output file using matroska container

  video.on('ready', () => {
    console.log('FFmpeg process ready!');
    video.stream.stderr.on('data', data => {
      console.log(`FFmpeg: ${data}`);
    });
  });

  // After 15s
  setTimeout(() => {
    video.destroy();
  }, 15_000);
});

client.login(process.env.DISCORD_TOKEN);
