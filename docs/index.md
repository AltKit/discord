---
layout: home
titleTemplate: false

hero:
  name: Altkit Discord
  text: Discord.js for user accounts
  tagline: A typed v14.27-compatible toolkit for messages, presence, voice, and media.
  image:
    src: /logo.svg
    alt: Altkit Discord
  actions:
    - theme: brand
      text: Explore the package
      link: /guide/overview
    - theme: alt
      text: Browse the API
      link: /api/
    - theme: alt
      text: View examples
      link: /examples/

features:
  - icon: ⚡
    title: Discord.js 14.27 surface
    details: Modern exports, events, partials, formatters, REST utilities, polls, and TypeScript declarations.
  - icon: 💬
    title: User-account workflows
    details: Messaging, invites, user-installed applications, slash command invocation, relationships, settings, and rich presence.
  - icon: 🎙️
    title: Voice and media
    details: Voice messages plus optional audio, video, receive, and recording helpers for advanced applications.
  - icon: 🔎
    title: Complete API catalog
    details: Search hundreds of classes, interfaces, typedefs, functions, and externals generated directly from source comments.
  - icon: 🧭
    title: Migration guidance
    details: Compatibility aliases and a step-by-step path from earlier discord.js-selfbot releases to Altkit Discord v4.
  - icon: 🔐
    title: Security-first setup
    details: Environment-based credentials, safe examples, proxy boundaries, and practical guidance for protecting account secrets.
---

<div class="warning custom-block">
  <p class="custom-block-title">Before you use this library</p>
  <p>Automating a normal Discord user account violates Discord's Terms of Service and may result in account termination. Altkit Discord is unofficial, is not supported by Discord, and is used entirely at your own risk.</p>
</div>

## Install

Altkit Discord v4 requires Node.js 20.18 or newer.

```sh
npm install @altkit/discord
```

```js
const { Client, Events } = require('@altkit/discord');

const client = new Client();

client.once(Events.ClientReady, readyClient => {
  console.log(`${readyClient.user.tag} is ready`);
});

client.login(process.env.DISCORD_TOKEN);
```

[Continue with installation and first-run guidance →](/guide/getting-started)
