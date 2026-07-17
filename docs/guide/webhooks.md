# Webhooks

Webhooks send and manage messages without logging in a full gateway client. Altkit exposes webhook operations through `WebhookClient`, fetched `Webhook` structures, and guild channel managers.

## Create a webhook client

Use either a full URL or an ID/token pair:

```js
const { WebhookClient } = require('@altkit/discord');

const webhook = new WebhookClient({
  url: process.env.DISCORD_WEBHOOK_URL,
});
```

```js
const webhook = new WebhookClient({
  id: process.env.WEBHOOK_ID,
  token: process.env.WEBHOOK_TOKEN,
});
```

Webhook URLs and tokens are credentials. Store them in the environment and rotate them if exposed.

## Send messages

```js
const sent = await webhook.send({
  content: 'Deployment finished',
  username: 'Release reporter',
  allowedMentions: { parse: [] },
});

console.log(sent.id);
```

Webhook messages support many normal message payload features, including content, embeds, components, files, and mention controls. Features still depend on the webhook type and Discord's payload rules.

## Fetch, edit, and delete

```js
const message = await webhook.fetchMessage(sent.id);
await webhook.editMessage(message.id, { content: 'Deployment verified' });
await webhook.deleteMessage(message.id);
```

Retain the returned message ID rather than searching a channel for content that might not be unique.

## Create a guild webhook

Creating a webhook requires an authenticated client and sufficient guild permissions:

```js
const created = await guild.channels.createWebhook(
  process.env.CHANNEL_ID,
  'Release reporter',
  { reason: 'Automated release notifications' },
);
```

Text-based guild channels also expose a convenience `createWebhook()` method.

## Fetch webhooks

```js
const guildWebhooks = await guild.fetchWebhooks();
const channelWebhooks = await channel.fetchWebhooks();
```

Fetched webhook structures may or may not include a usable token. Tokenless webhook metadata can be inspected but cannot perform token-authenticated operations.

## Incoming and follower webhooks

`Webhook#isIncoming()` and `Webhook#isChannelFollower()` distinguish common webhook behaviors. Announcement-channel followers are created through `GuildChannelManager#addFollower()` and do not behave exactly like an incoming webhook token.

## Operational guidance

- Disable broad mentions for automated or user-controlled content.
- Validate attachment sizes and sources.
- Use separate webhooks for unrelated trust boundaries.
- Apply bounded retries and respect rate limits.
- Destroy a standalone `WebhookClient` when the process no longer needs it.
- Never expose webhook URLs in client-side JavaScript or public logs.

## Useful API pages

- [WebhookClient](/api/classes/webhookclient)
- [Webhook](/api/classes/webhook)
- [WebhookMessageOptions](/api/typedefs/webhookmessageoptions)
- [GuildChannelManager](/api/classes/guildchannelmanager)
