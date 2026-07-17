# Troubleshooting

Start by collecting the Altkit Discord version, Node.js version, a minimal reproduction, and the exact error message with secrets removed.

```sh
node --version
npm list @altkit/discord
```

```js
const { version, discordJsVersion } = require('@altkit/discord');
console.log({ version, discordJsVersion });
```

## Login fails

- Confirm `process.env.DISCORD_TOKEN` is present in the running process.
- When using `.env`, start Node with `--env-file=.env`.
- Remove surrounding quotes accidentally included in a secret manager value.
- Check system time; TOTP authentication depends on an accurate clock.
- Do not print the token to diagnose it. Check only whether it exists and its type.
- Rotate the token if it may have been exposed.

```js
console.log({ hasToken: typeof process.env.DISCORD_TOKEN === 'string' && process.env.DISCORD_TOKEN.length > 0 });
```

## A channel or guild is undefined

Caches are not guaranteed to contain every object. Fetch by ID when the manager supports it:

```js
const channel = await client.channels.fetch(process.env.CHANNEL_ID);
if (!channel?.isTextBased()) throw new Error('Expected a text-based channel');
```

Wait for `Events.ClientReady` before startup fetches. When handling events, account for partial structures.

## An event does not fire

- Register the listener before login.
- Use the matching constant from `Events`.
- Confirm the gateway actually sends that event for user accounts.
- Configure the required partials for uncached data.
- Ensure the process has not removed the listener or destroyed the client.
- Add a temporary, filtered debug listener to inspect lifecycle state.

## REST requests fail

| Symptom | Likely area |
| --- | --- |
| HTTP 400 | Invalid payload or unsupported field |
| HTTP 401 | Invalid or expired authentication |
| HTTP 403 | Account lacks permission or action is unavailable |
| HTTP 404 | Resource is missing or inaccessible |
| HTTP 429 | Rate limit; let the REST manager queue requests |
| HTTP 5xx | Discord or upstream service error; use bounded retries |

Capture the error name, status, route, and message. Do not log request headers or the full client object.

## TypeScript cannot resolve types

- Confirm `@altkit/discord` is installed directly in the application.
- Use a Node-compatible `moduleResolution` setting.
- Remove stale declarations from earlier selfbot packages.
- Reinstall from the lockfile after changing package names.

```sh
npm uninstall discord.js-selfbot-v13
npm install @altkit/discord
npx tsc --noEmit
```

## A Discord.js example does not work

Upstream examples may depend on bot-only application behavior. Check the [compatibility guide](./compatibility), verify each API symbol in the [catalog](/api/), and compare with a repository example written for this fork.

## Reporting a bug

Include:

- Altkit Discord and Node.js versions;
- operating system and relevant optional media tools;
- a minimal reproduction with placeholder IDs and no secrets;
- expected and actual behavior;
- complete sanitized stack trace;
- whether the problem also occurs without a proxy or optional integration.

Search existing issues before opening a new one. Security-sensitive reports should not include live credentials or account data.
