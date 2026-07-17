'use strict';

const { Client, Events, MessageActivityType } = require('@altkit/discord');

const client = new Client();

client.once(Events.ClientReady, async readyClient => {
  const channel = await readyClient.channels.fetch(process.env.CHANNEL_ID);

  await channel.send({
    activity: {
      type: MessageActivityType.Listen,
      partyId: `spotify:${readyClient.user.id}`,
    },
  });
});

client.login(process.env.DISCORD_TOKEN);
