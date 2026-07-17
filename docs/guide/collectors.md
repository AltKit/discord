# Collectors

Collectors turn a stream of client events into a bounded workflow. They apply a filter, retain accepted items in a `Collection`, and stop when a limit, timeout, idle period, or explicit condition is reached.

## Why use a collector?

A normal event listener is appropriate for application-wide behavior. A collector is better when an operation has a beginning and end—for example, waiting for one answer, collecting reactions for 30 seconds, or handling buttons on one message.

## Message collector

```js
const filter = message =>
  message.author.id === client.user.id && message.content.startsWith('!answer');

const collector = channel.createMessageCollector({
  filter,
  time: 60_000,
  idle: 15_000,
  max: 3,
});

collector.on('collect', message => {
  console.log(`Collected: ${message.content}`);
});

collector.on('end', (collected, reason) => {
  console.log(`Collected ${collected.size}; stopped because ${reason}`);
});
```

The filter can be asynchronous, but slow filters delay collector processing. Keep them focused and avoid unrelated network work.

## Promise form

`awaitMessages()` is convenient when only the final collection matters:

```js
try {
  const messages = await channel.awaitMessages({
    filter,
    max: 1,
    time: 30_000,
    errors: ['time'],
  });

  console.log(messages.first()?.content);
} catch (collected) {
  console.log(`Timed out after ${collected.size} matching messages`);
}
```

## Interaction collectors

Create interaction collectors from messages or channels when handling buttons, select menus, or modal-related workflows:

```js
const collector = message.createMessageComponentCollector({
  filter: interaction => interaction.user.id === client.user.id,
  componentType: 'BUTTON',
  time: 60_000,
});

collector.on('collect', async interaction => {
  await interaction.deferUpdate();
});
```

Scope the filter to the intended user, message, channel, and custom ID when the action changes data.

## Collector lifecycle

All collectors expose:

- `collected` — accepted items keyed by the concrete collector;
- `ended` and `endReason` — final state;
- `stop(reason)` — explicit termination;
- `resetTimer()` — restart configured time or idle timers;
- `next` — a promise for the next collected item;
- async iteration through `for await...of`.

They emit `collect`, optional `dispose`, and `end` events.

```js
for await (const [message] of collector) {
  console.log(message.content);
}
```

## Disposal

Set `dispose: true` when deleted or removed items should also be removed from the collector's `collected` cache. Disposal support depends on the concrete collector and the corresponding Discord event.

## Cleanup rules

- Give temporary collectors a `time`, `idle`, or maximum bound.
- Stop collectors when the owning view, message, or process is no longer valid.
- Remove or disable interactive components after a one-time workflow.
- Handle the `end` event even when no items were collected.
- Avoid creating one unbounded collector per incoming message.

## Useful API pages

- [Collector](/api/classes/collector)
- [MessageCollector](/api/classes/messagecollector)
- [InteractionCollector](/api/classes/interactioncollector)
- [CollectorOptions](/api/typedefs/collectoroptions)
- [MessageCollectorOptions](/api/typedefs/messagecollectoroptions)
- [InteractionCollectorOptions](/api/typedefs/interactioncollectoroptions)
