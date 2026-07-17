# Permissions, intents, and bit fields

Discord packs many boolean capabilities into numeric bit fields. Altkit provides `BitField` subclasses that accept readable flag names, raw values, existing instances, and arrays of resolvables.

## Permissions

Guild members and channels expose resolved `Permissions` instances:

```js
const permissions = channel.permissionsFor(member);

if (permissions?.has('SEND_MESSAGES')) {
  await channel.send('The member can send messages here.');
}
```

The v14-compatible name `PermissionsBitField` is an alias of the fork's `Permissions` implementation.

## Check multiple permissions

```js
const required = ['VIEW_CHANNEL', 'SEND_MESSAGES', 'ATTACH_FILES'];

if (!permissions.has(required)) {
  console.log('Missing:', permissions.missing(required));
}
```

`has()` requires all supplied bits. `any()` succeeds when at least one supplied bit is present. Both normally treat `ADMINISTRATOR` as granting all permissions; pass `false` as the second argument when checking raw bits without that override.

## BigInt values

Permission flags are `bigint` values:

```js
const { PermissionsBitField } = require('@altkit/discord');

const bits = PermissionsBitField.FLAGS.VIEW_CHANNEL | PermissionsBitField.FLAGS.SEND_MESSAGES;

const permissions = new PermissionsBitField(bits);
console.log(permissions.bitfield); // bigint
```

Do not mix JavaScript `number` and `bigint` in bitwise operations. Serialize a permission bit field as a decimal string when passing through JSON:

```js
const serialized = permissions.bitfield.toString();
const restored = new PermissionsBitField(BigInt(serialized));
```

## Channel overwrites

Guild-level permissions come from roles. Channel permission overwrites then allow or deny bits for a role or member. `channel.permissionsFor(member)` resolves the effective result and is usually safer than manually combining overwrites.

When creating an overwrite:

```js
await channel.permissionOverwrites.edit(member, {
  VIEW_CHANNEL: true,
  SEND_MESSAGES: false,
});
```

The logged-in account must have the necessary permission and role hierarchy to make the change.

## Gateway intents

Intents select categories of gateway events:

```js
const { Client, IntentsBitField } = require('@altkit/discord');

const intents = new IntentsBitField(['GUILDS', 'GUILD_MESSAGES', 'DIRECT_MESSAGES', 'MESSAGE_CONTENT']);

const client = new Client({ intents });
```

Altkit's default client options currently include every defined intent. Explicit intents can still make an application's event requirements clearer and may reduce unnecessary event traffic.

The v14-compatible `IntentsBitField` export aliases `Intents`.

## Other flag classes

The same bit-field pattern appears in message flags, user flags, application flags, attachment flags, guild-member flags, role flags, system-channel flags, and others. Each class defines its own `FLAGS` map.

```js
if (message.flags.has('IS_VOICE_MESSAGE')) {
  console.log('Received a voice message');
}
```

## Common mistakes

- Mixing numeric enum values with permission names from a different version.
- Comparing the entire bitfield when only one flag matters.
- Forgetting channel overwrites or role hierarchy.
- Using `number` for permission values that require `bigint`.
- Assuming the account can perform an action merely because a cached permission calculation says so; Discord remains authoritative.

## Useful API pages

- [BitField](/api/classes/bitfield)
- [Permissions](/api/classes/permissions)
- [Intents](/api/classes/intents)
- [PermissionOverwrites](/api/classes/permissionoverwrites)
- [MessageFlags](/api/classes/messageflags)
