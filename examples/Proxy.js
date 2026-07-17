'use strict';

const { Client, Events } = require('selfbotjs');

const client = new Client({
  http: {
    // SelfbotJS creates the undici ProxyAgent used for API requests.
    agent: process.env.HTTP_PROXY,
  },
});

client.once(Events.ClientReady, readyClient => {
  console.log(`${readyClient.user.tag} is ready through the configured HTTP proxy`);
});

client.login(process.env.DISCORD_TOKEN);
