# Users, relationships, notes, and settings

User-account state extends beyond the public `User` structure. Altkit exposes separate managers for relationships, notes, client settings, guild notification settings, presences, and sessions.

## Users and members are different

A `User` represents a Discord identity. A `GuildMember` represents that user's membership in one guild, including roles, nickname, join time, and guild-specific permissions.

```js
const user = await client.users.fetch(process.env.USER_ID);
const member = await guild.members.fetch(process.env.USER_ID);

console.log(user.tag);
console.log(member.displayName, member.roles.cache.size);
```

Use the user for DMs and global profile information; use the member for guild-specific state.

## Direct messages

```js
const user = await client.users.fetch(process.env.USER_ID);
const dm = await user.createDM();
await dm.send('Hello');
```

`User#send()` is a convenience that creates or reuses a DM channel and sends through it. Discord privacy settings and account state may prevent a DM from being created.

## Profiles

```js
const profile = await user.getProfile();
console.log(profile);
```

Profile payloads can contain account-specific or service-defined data that changes independently of the stable bot API. Check for optional fields before reading them.

## Relationship caches

`client.relationships` separates the account's relationships into filtered collections:

```js
await client.relationships.fetch();

console.log(client.relationships.friendCache.size);
console.log(client.relationships.blockedCache.size);
console.log(client.relationships.incomingCache.size);
console.log(client.relationships.outgoingCache.size);
```

The underlying `cache` maps user IDs to relationship types. `friendNicknames` and `sinceCache` store the associated nickname and timestamp data.

::: warning Mutating relationships
In the current implementation, `RelationshipManager` methods such as `sendFriendRequest()`, `addFriend()`, and `deleteRelationship()` intentionally throw a “Risky action, not finished yet” error. Do not build workflows that assume those mutations work merely because the methods appear in generated API data.
:::

## User notes

Notes are private account metadata stored through `client.notes` and exposed on `User`:

```js
const existing = await client.notes.fetch(user);
await user.setNote('Met through the documentation project');
```

Treat notes as account data: do not log or export them without a clear need.

## Client settings

`client.settings` mirrors user settings such as locale, theme, compact mode, link previews, GIF and sticker animation, TTS, activity display, AFK timeout, and restricted guilds.

```js
await client.settings.fetch();

console.log({
  locale: client.settings.locale,
  theme: client.settings.theme,
  compact: client.settings.compactMode,
});
```

Convenience methods include `setTheme()`, `toggleCompactMode()`, `setCustomStatus()`, and restricted-guild helpers. Settings are synchronized account state, so changing them affects the user's Discord experience beyond the current process.

## Guild notification settings

Each guild exposes `guild.settings` for notification and mute configuration:

```js
console.log({
  muted: guild.settings.muted,
  suppressEveryone: guild.settings.suppressEveryone,
  messageNotifications: guild.settings.messageNotifications,
});
```

Use `GuildSettingManager#edit()` for supported changes and verify the returned state. Channel overrides may affect notifications even when the guild-level values look permissive.

## Useful API pages

- [User](/api/classes/user)
- [GuildMember](/api/classes/guildmember)
- [UserManager](/api/classes/usermanager)
- [RelationshipManager](/api/classes/relationshipmanager)
- [UserNoteManager](/api/classes/usernotemanager)
- [ClientUserSettingManager](/api/classes/clientusersettingmanager)
- [GuildSettingManager](/api/classes/guildsettingmanager)
