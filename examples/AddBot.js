'use strict';

const { Client, Events } = require('selfbotjs');

const client = new Client({
  // Add TOTPKey only when the account has TOTP enabled and this flow needs it.
  TOTPKey: process.env.TOTP_SECRET,
});

client.once(Events.ClientReady, async readyClient => {
  const query = new URLSearchParams({
    client_id: process.env.APPLICATION_ID,
    permissions: '0',
    scope: 'bot applications.commands',
  });

  await readyClient.authorizeURL(`https://discord.com/oauth2/authorize?${query}`, {
    guild_id: process.env.GUILD_ID,
  });
});

client.login(process.env.DISCORD_TOKEN);
