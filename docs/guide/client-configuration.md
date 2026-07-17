# Client configuration

`Client` is the entry point for gateway events, REST access, caches, managers, presence, and voice. Defaults are designed to start a user-account session with minimal configuration.

```js
const { Client } = require('@altkit/discord');

const client = new Client({
  waitGuildTimeout: 15_000,
  retryLimit: 1,
  failIfNotExists: true,
});
```

See [ClientOptions](/api/typedefs/clientoptions) for the generated, field-by-field reference.

## Common options

| Option               | Purpose                                                   | Default                                                             |
| -------------------- | --------------------------------------------------------- | ------------------------------------------------------------------- |
| `partials`           | Permit events to contain partially cached structures      | Common user, channel, member, message, reaction, and event partials |
| `presence`           | Initial status and activities                             | Online with no activities                                           |
| `waitGuildTimeout`   | Time to wait for initial guild availability               | `15_000` ms                                                         |
| `retryLimit`         | Retries for eligible server errors                        | `1`                                                                 |
| `restRequestTimeout` | REST request timeout                                      | `15_000` ms                                                         |
| `failIfNotExists`    | Fail replies whose referenced message no longer exists    | `true`                                                              |
| `makeCache`          | Factory used for manager caches                           | Library defaults                                                    |
| `sweepers`           | Periodic cache cleanup                                    | Disabled unless configured                                          |
| `http`               | REST URLs, headers, and proxy agent                       | Discord defaults                                                    |
| `ws`                 | Gateway properties, compression, version, and proxy agent | User-client defaults                                                |

## Partials

Partials let events fire when an object is not fully cached. The tradeoff is that handlers must check whether required data exists and fetch it when supported.

```js
const { Client, Partials } = require('@altkit/discord');

const client = new Client({
  partials: [
    Partials.User,
    Partials.Channel,
    Partials.GuildMember,
    Partials.Message,
    Partials.Reaction,
    Partials.Poll,
    Partials.PollAnswer,
  ],
});
```

Poll partials are particularly important when vote events may refer to messages not present in cache. See [events and partials](/guide/events-and-partials).

## Caches and sweepers

Manager caches improve event correlation and reduce repeat requests, but long-running clients can retain significant data. Use `Options.cacheWithLimits()` and sweepers only after measuring the application's access patterns.

```js
const { Client, Options } = require('@altkit/discord');

const client = new Client({
  makeCache: Options.cacheWithLimits({
    ...Options.defaultMakeCacheSettings,
    MessageManager: 200,
  }),
  sweepers: {
    messages: {
      interval: 300,
      lifetime: 900,
    },
  },
});
```

::: warning Unsupported cache overrides
Replacing caches used by core guild, channel, role, and permission-overwrite managers can break library behavior. Keep the defaults for those managers.
:::

## Initial presence

```js
const client = new Client({
  presence: {
    status: 'online',
    since: 0,
    activities: [],
    afk: false,
  },
});
```

For rich activities and custom statuses after login, see [presence and activities](/guide/presence).

## REST proxy

```js
const client = new Client({
  http: {
    agent: process.env.HTTP_PROXY,
  },
});
```

The library creates the underlying `undici` proxy agent. Keep proxy credentials in the environment and review the [security guide](/guide/security).

## Rate limits and retries

The REST manager queues requests when Discord applies rate limits. `rejectOnRateLimit` can turn selected routes into immediate `RateLimitError` failures instead of waiting:

```js
const client = new Client({
  rejectOnRateLimit: ['/channels'],
  invalidRequestWarningInterval: 100,
  retryLimit: 1,
});
```

Use this carefully. Retrying an invalid request does not make it valid, and aggressive retries can worsen rate limits.

## Authentication challenges

`captchaSolver`, `captchaRetryLimit`, and `TOTPKey` support flows where Discord requests additional verification. They are optional and security-sensitive. Use bounded retries, keep secrets outside source code, and understand any external solver's privacy and billing model.
