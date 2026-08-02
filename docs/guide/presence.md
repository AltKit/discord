# Presence and activities

Altkit Discord can set initial presence, custom status, rich presence, and Spotify-like activity objects for the logged-in account.

## Basic presence

```js
client.user.setPresence({
  status: 'online',
  afk: false,
  activities: [],
});
```

Presence updates propagate through Discord's gateway and may be rate-limited or normalized by the service. Update presence only when state actually changes.

## Custom status

```js
const { CustomStatus } = require('@altkit/discord');

const custom = new CustomStatus(client).setEmoji('🛠️').setState('Building documentation');

client.user.setPresence({ activities: [custom] });
```

## Rich presence

```js
const { RichPresence } = require('@altkit/discord');

const activity = new RichPresence(client)
  .setApplicationId(process.env.APPLICATION_ID)
  .setType('PLAYING')
  .setName('Example activity')
  .setDetails('Working on a project')
  .setState('In the editor')
  .setStartTimestamp(Date.now())
  .addButton('Project', 'https://github.com/altkit/discord');

client.user.setPresence({ activities: [activity] });
```

Application assets belong to the referenced Discord application. For remote images, `RichPresence.getExternal()` can request an external asset reference before it is assigned.

## Multiple activities

```js
client.user.setPresence({
  activities: [activity, custom],
  status: 'idle',
});
```

How Discord renders activities varies across desktop, web, and mobile clients. Do not assume every field or activity is visible on every surface.

## Spotify-shaped presence

`SpotifyRPC` creates the activity fields Discord expects for a Spotify-style presence. It does not authenticate with Spotify or stream audio.

```js
const { SpotifyRPC } = require('@altkit/discord');

const spotify = new SpotifyRPC(client)
  .setDetails('Track title')
  .setState('Artist')
  .setStartTimestamp(Date.now())
  .setEndTimestamp(Date.now() + 180_000);
```

Use metadata and images you are authorized to display. See `examples/RichPresence.js` in the repository for a complete multi-activity example.
