# Events and partials

Altkit Discord is event-driven. The gateway updates caches and emits high-level events through `Client`, while the REST layer emits diagnostics such as rate-limit and invalid-request warnings.

## Register handlers before login

Attach important handlers before calling `login()` so startup events cannot be missed.

```js
const { Client, Events } = require('@altkit/discord');

const client = new Client();

client.once(Events.ClientReady, readyClient => {
  console.log(`${readyClient.user.tag} is ready`);
});

client.on(Events.MessageCreate, message => {
  console.log(message.id, message.content);
});

client.login(process.env.DISCORD_TOKEN);
```

Use `once` for one-time lifecycle events and `on` for recurring events. Remove listeners when a temporary workflow finishes.

## Async handlers

Node's event emitter does not automatically handle rejected promises. Wrap asynchronous work so errors are observed:

```js
client.on(Events.MessageCreate, message => {
  void handleMessage(message).catch(error => {
    console.error('Message handler failed:', error.message);
  });
});

async function handleMessage(message) {
  if (message.author.id !== client.user.id) return;
  if (message.content === '!ping') await message.reply('Pong!');
}
```

## Partial structures

A partial contains enough identity to emit an event but may not contain every normal property. This occurs when an event references data that was never cached or has already been swept.

```js
const { Client, Events, Partials } = require('@altkit/discord');

const client = new Client({
  partials: [Partials.Message, Partials.Reaction, Partials.Poll, Partials.PollAnswer],
});

client.on(Events.MessageReactionAdd, async reaction => {
  if (reaction.partial) await reaction.fetch();
  console.log(reaction.message.id);
});
```

Not every partial structure supports the same fetch method. Check `partial` and consult its API page before reading fields that may be absent.

## Poll vote events

Configure message, poll, and poll-answer partials when votes must be observed for uncached messages:

```js
const client = new Client({
  partials: [Partials.Message, Partials.Poll, Partials.PollAnswer],
});

client.on(Events.MessagePollVoteAdd, (answer, userId) => {
  console.log(`User ${userId} voted for answer ${answer.id}`);
});

client.on(Events.MessagePollVoteRemove, (answer, userId) => {
  console.log(`User ${userId} removed vote ${answer.id}`);
});
```

## Lifecycle and diagnostics

Useful operational events include:

| Event               | Use                                                       |
| ------------------- | --------------------------------------------------------- |
| `ClientReady`       | Start work that requires a connected and hydrated client  |
| `Error`             | Observe client errors                                     |
| `Warn`              | Observe non-fatal warnings                                |
| `Debug`             | Diagnose gateway and library behavior during development  |
| `ShardDisconnect`   | Track gateway disconnects                                 |
| `ShardReconnecting` | Track reconnect attempts                                  |
| `ShardResume`       | Confirm a gateway session resumed                         |
| `Invalidated`       | Stop work when the gateway session can no longer continue |

REST diagnostics such as `rateLimit`, `apiRequest`, `apiResponse`, and `invalidRequestWarning` are documented on [BaseClient](/api/classes/baseclient). High-frequency diagnostic events should be filtered before logging.

## Event reference

The [event reference](/api/events) lists every modern `Events` constant. Individual class pages document payload parameters for emitted events.
