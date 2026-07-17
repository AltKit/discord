'use strict';

const { Client, Events } = require('selfbotjs');

const client = new Client();

client.once(Events.ClientReady, async readyClient => {
  await readyClient.installUserApps(process.env.APPLICATION_ID);
  console.log(`Installed application ${process.env.APPLICATION_ID} for ${readyClient.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
