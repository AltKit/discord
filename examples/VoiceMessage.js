'use strict';

const { AttachmentBuilder, Client, Events, MessageFlags } = require('selfbotjs');

const client = new Client();

client.once(Events.ClientReady, async readyClient => {
  const channel = await readyClient.channels.fetch(process.env.CHANNEL_ID);
  const attachment = new AttachmentBuilder('./voice-message.ogg', 'voice-message.ogg', {
    waveform: 'AAAAAAAAAAAA',
    duration_secs: 1,
  });

  await channel.send({
    files: [attachment],
    flags: MessageFlags.FLAGS.IS_VOICE_MESSAGE,
  });
});

client.login(process.env.DISCORD_TOKEN);
