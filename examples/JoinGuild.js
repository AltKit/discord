'use strict';

const { Client, Events } = require('selfbotjs');

const client = new Client();

client.once(Events.ClientReady, async readyClient => {
  const guild = await readyClient.acceptInvite(process.env.INVITE_CODE);
  console.log(`Joined ${guild.name}`);
});

client.login(process.env.DISCORD_TOKEN);
