'use strict';

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
