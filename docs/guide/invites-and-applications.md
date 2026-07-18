# Invites and applications

Altkit exposes account-side helpers for inspecting and accepting invites, authorizing OAuth2 applications, installing user applications, and reviewing existing authorizations.

::: warning Sensitive account operations
Joining guilds and granting application scopes change the account's external state. Validate every ID, URL, scope, guild, and permission before calling these methods. Do not automatically retry a rejected authorization.
:::

## Inspect an invite first

`fetchInvite()` accepts an invite code or URL and does not join it:

```js
const invite = await client.fetchInvite(process.env.INVITE_CODE);

console.log({
  code: invite.code,
  guild: invite.guild?.name,
  channel: invite.channel?.name,
  inviter: invite.inviter?.tag,
});
```

Fetching first lets an application confirm the destination and display a meaningful approval step.

## Accept an invite

```js
const destination = await client.acceptInvite(process.env.INVITE_CODE, {
  bypassOnboarding: false,
  bypassVerify: false,
});
```

Depending on the invite, the result can represent a guild, direct-message channel, or group DM. The library's defaults enable onboarding and verification bypass attempts; pass explicit options when you do not want that behavior.

Discord may still require email, phone, rules screening, onboarding choices, captcha, or other account verification. A returned guild does not necessarily mean every membership step succeeded exactly as requested.

## Community invites

Guild invite creation supports role assignment and targeted-user CSV files:

```js
const invite = await guild.invites.create(process.env.CHANNEL_ID, {
  roleIds: [process.env.MEMBER_ROLE_ID],
  targetUsersFile: [process.env.ALLOWED_USER_ID],
  unique: true,
});

const allowedUserIds = await guild.invites.fetchTargetUsers(invite.code);
const job = await guild.invites.fetchTargetUsersJobStatus(invite.code);
```

`targetUsersFile` accepts a file resolvable or an array of user resolvables. Arrays are serialized with the standard `user_id` CSV header. Use `updateTargetUsers(code, targetUsersFile)` to replace the target list. These operations require Discord's corresponding guild and role permissions.

## Install a user application

Applications that publish a user-install integration can be installed by ID:

```js
await client.installUserApps(process.env.APPLICATION_ID);
```

The helper reads the application's public integration configuration and requests its declared user-install scopes. It returns `false` when the application does not expose a compatible user-install configuration.

## Authorize an OAuth2 URL

```js
const result = await client.authorizeURL(
  `https://discord.com/oauth2/authorize?client_id=${process.env.APPLICATION_ID}&scope=applications.commands`,
  {
    guild_id: process.env.GUILD_ID,
    permissions: '0',
    authorize: true,
  },
);

console.log(result.location);
```

`authorizeURL()` accepts Discord authorization URLs and merges URL parameters with the supplied options. Before calling it:

1. parse and validate the application ID;
2. display the requested scopes and permissions;
3. confirm the target guild, if any;
4. reject unexpected redirect or webhook parameters;
5. require an explicit user decision.

## Review authorized applications

```js
const applications = await client.authorizedApplications();

for (const authorization of applications.values()) {
  console.log(authorization.application.name, authorization.scopes);
}
```

Each result includes the application, the authorization token ID, granted scopes, and a `deauthorize()` function scoped to that authorization.

## Revoke authorization

```js
const authorization = applications.get(process.env.APPLICATION_ID);
if (authorization) await authorization.deauthorize();
```

`client.deauthorize(id, type)` can revoke by application or token ID. Re-fetch the authorization list afterward to confirm the server accepted the change.

## Templates and previews

Invite-adjacent client helpers include:

```js
const template = await client.fetchGuildTemplate('template-code');
const preview = await client.fetchGuildPreview(process.env.GUILD_ID);
const widget = await client.fetchGuildWidget(process.env.GUILD_ID);
```

These methods inspect resources; they do not join a guild by themselves.

## Useful API pages

- [Client](/api/classes/client)
- [Invite](/api/classes/invite)
- [AcceptInviteOptions](/api/typedefs/acceptinviteoptions)
- [OAuth2AuthorizeOptions](/api/typedefs/oauth2authorizeoptions)
- [AuthorizedApplicationData](/api/typedefs/authorizedapplicationdata)
