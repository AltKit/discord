# REST requests and rate limits

Most manager methods ultimately use Altkit's REST layer. It builds Discord API routes, serializes payloads, queues requests by rate-limit bucket, retries selected failures, and converts error responses into structured errors.

## Prefer public managers and structures

Use documented high-level methods when one exists:

```js [send-message.js]
const channel = await client.channels.fetch(process.env.CHANNEL_ID);
await channel.send('Hello');
```

The internal `client.api` router is private. Calling undocumented routes directly couples an application to internal routing syntax and unversioned Discord behavior.

## Error classes

REST operations can reject with:

- `DiscordAPIError` for a Discord JSON error response;
- `HTTPError` for a non-Discord HTTP failure;
- `RateLimitError` when `rejectOnRateLimit` selects the route;
- transport or timeout errors from the underlying request stack.

```js
const { DiscordAPIError, HTTPError, RateLimitError } = require('@altkit/discord');

try {
  await channel.send('Hello');
} catch (error) {
  if (error instanceof RateLimitError) {
    console.warn('The configured route rejected instead of queueing');
  } else if (error instanceof DiscordAPIError || error instanceof HTTPError) {
    console.error(error.name, error.message);
  } else {
    throw error;
  }
}
```

## Automatic rate-limit handling

By default, the REST manager waits for a bucket or global rate limit and resumes queued work. Do not add an immediate retry loop around every HTTP 429; that competes with the queue and increases request volume.

Listen for rate-limit diagnostics when investigating throughput:

```js
client.on('rateLimit', data => {
  console.warn({
    route: data.route,
    timeout: data.timeout,
    global: data.global,
  });
});
```

## Reject selected rate limits

`ClientOptions.rejectOnRateLimit` can be a list of route prefixes or a predicate. Matching requests throw `RateLimitError` instead of waiting.

```js
const client = new Client({
  rejectOnRateLimit: ['/channels'],
});
```

This is useful when stale work should be abandoned, but it moves retry and user-feedback responsibility into the application.

## Invalid-request warnings

Discord tracks certain invalid requests separately from normal rate limits. Configure `invalidRequestWarningInterval` to receive periodic warnings:

```js
const client = new Client({
  invalidRequestWarningInterval: 100,
});

client.on('invalidRequestWarning', data => {
  console.warn(data);
});
```

A warning is a signal to fix the request source—not to increase retry limits.

## Timeouts, retries, and offsets

Relevant client options include:

| Option                | Purpose                                         |
| --------------------- | ----------------------------------------------- |
| `restRequestTimeout`  | Cancel a request that takes too long            |
| `retryLimit`          | Bound retries for eligible server failures      |
| `restTimeOffset`      | Add timing tolerance before a bucket resumes    |
| `restGlobalRateLimit` | Apply an application-level global request limit |
| `restSweepInterval`   | Remove inactive request buckets periodically    |

Use conservative values and measure. Raising a retry limit cannot fix invalid credentials, forbidden actions, malformed payloads, or missing resources.

## High-frequency diagnostics

`apiRequest` and `apiResponse` may emit multiple times for one logical request and can be extremely noisy. Filter by route and redact sensitive payloads:

```js
client.on('apiResponse', (request, response) => {
  if (!request.path.startsWith('/channels/')) return;
  console.debug(request.method, request.path, response.status);
});
```

Never log authorization headers, webhook tokens, TOTP values, or full authentication payloads.

## Proxies

REST proxy configuration lives under `http.agent`; gateway proxy configuration lives under `ws.agent`. A proxy changes the trust and failure boundaries but does not bypass Discord rate limits.

See [client configuration](/guide/client-configuration#rest-proxy) and [security](/guide/security#proxies).

## Useful API pages

- [`RESTManager` source](https://github.com/altkit/discord/blob/selfbotjs/src/rest/RESTManager.js)
- [`RequestHandler` source](https://github.com/altkit/discord/blob/selfbotjs/src/rest/RequestHandler.js)
- [DiscordAPIError](/api/classes/discordapierror)
- [HTTPError](/api/classes/httperror)
- [RateLimitError](/api/classes/ratelimiterror)
- [RateLimitData](/api/typedefs/ratelimitdata)
