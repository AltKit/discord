# Security and account safety

A Discord user token grants access to the account it belongs to. Treat it like a password: minimize where it exists, never print it, and rotate it as soon as exposure is suspected.

::: danger Account risk
Selfbot use violates Discord's Terms of Service. Technical safeguards can reduce credential exposure, but cannot remove the risk of account enforcement.
:::

## Credential rules

- Keep `DISCORD_TOKEN`, `TOTP_SECRET`, proxy credentials, captcha-service keys, and npm credentials out of Git.
- Use environment variables locally and a managed secret store in hosted environments.
- Do not put secrets in screenshots, crash reports, CI logs, process listings, support requests, or example files.
- Give production hosts and third-party services only the credentials they actually need.
- Rotate affected credentials after any suspected leak; deleting a Git commit does not invalidate a leaked token.

Before committing, inspect staged changes:

```sh
git diff --cached
git status --short
```

## Local environment files

The repository contains a safe `.env.example`. Copy it to `.env`, populate only the required values, and keep `.env` ignored:

```sh
cp .env.example .env
node --env-file=.env examples/Basic.js
```

Do not commit a populated copy under another name. If a project needs multiple environments, ignore all local variants and commit only blank templates.

## Logs and error reporting

Log operation names, IDs, status codes, and redacted error messages—not authorization headers or full request objects.

```js
try {
  await channel.send('Hello');
} catch (error) {
  console.error({
    operation: 'send-message',
    channelId: channel.id,
    name: error.name,
    message: error.message,
  });
}
```

Review debug listeners before enabling them in production because low-level gateway and REST diagnostics may contain more context than normal application logs.

## TOTP and captcha solvers

`ClientOptions.TOTPKey` can allow the library to answer TOTP challenges, and `captchaSolver` can delegate captcha challenges. Both expand the trust boundary of the application:

- a TOTP secret can generate valid one-time codes;
- a captcha provider receives challenge data and may receive identifying network information;
- retry loops can create unexpected provider charges or account activity.

Store these secrets separately, set bounded retry limits, and understand the privacy and billing terms of any provider before integration.

When Discord requires an hCaptcha challenge, `captchaSolver` receives the challenge payload and the user agent Discord observed, and must resolve to a solved token. The REST handler then replays the original request with that token and Discord's `captcha_rqtoken`. See [client configuration → hCaptcha challenges](/guide/client-configuration#hcaptcha-challenges) and `examples/CaptchaSolver.js` for a complete adapter. A solver that returns a non-token value rejects the request with `CAPTCHA_SOLVER_INVALID_RESPONSE`.

## Proxies

An HTTP proxy can observe destination metadata and, depending on the protocol and setup, may handle credentials. Use a provider you trust, put credentials in the environment, and URL-encode special characters in proxy usernames and passwords.

```js
const client = new Client({
  http: {
    agent: process.env.HTTP_PROXY,
  },
});
```

The `http.agent` setting covers the library's REST transport. WebSocket proxy behavior is configured separately through `ws.agent`; consult the [ClientOptions API](/api/typedefs/clientoptions) before changing transport defaults.

Custom certificate authorities and TLS verification settings belong under `http.tls` for REST and `ws.tls` for Gateway and voice connections. Keep certificate verification enabled in production; disabling `rejectUnauthorized` allows man-in-the-middle interception.

## Incident checklist

If a secret may have been exposed:

1. Stop the affected application and revoke or rotate the credential.
2. Remove it from active logs, artifacts, paste sites, and CI variables.
3. Audit recent account, package, proxy, and deployment activity.
4. Replace the secret everywhere it is legitimately used.
5. Remove it from Git history if necessary, while remembering that history rewriting does not revoke the old value.
6. Document the cause and add a guard that prevents the same exposure path.
