# Discord.js compatibility

Altkit Discord v4 presents a Discord.js 14.27-compatible API while preserving user-account transport and fork-specific helpers. REST and Gateway defaults target Discord API v10 and Gateway v10. Compatibility is intentionally broad, but it is not identical to installing upstream `discord.js`.

## What is compatible

- Common v14 root exports, formatters, REST utilities, WebSocket utilities, API enums, and utility packages
- Modern event names through `Events`
- Numeric partial identifiers through `Partials`
- Polls, attachments, and activity structures implemented by the fork
- TypeScript declarations shipped with the package

## Aliases

Several modern names point to the fork's established implementation:

| Preferred name         | Compatibility implementation |
| ---------------------- | ---------------------------- |
| `AttachmentBuilder`    | `MessageAttachment`          |
| `BaseChannel`          | `Channel`                    |
| `IntentsBitField`      | `Intents`                    |
| `MessageFlagsBitField` | `MessageFlags`               |
| `PermissionsBitField`  | `Permissions`                |
| `UserFlagsBitField`    | `UserFlags`                  |

Both names currently work, so applications can migrate incrementally.

## Events

Prefer constants over string literals:

```js
const { Events } = require('@altkit/discord');

client.once(Events.ClientReady, readyClient => {});
client.on(Events.MessageCreate, message => {});
client.on(Events.WebhooksUpdate, channel => {});
```

Selected legacy event names continue to be emitted for older applications. New code should use the modern form listed in the [event reference](/api/events).

## Where upstream examples differ

Upstream Discord.js documentation assumes a bot application and bot token. Bot-only features, privileged-intent setup, OAuth installation flows, and permission expectations may not apply to a user account. Conversely, Altkit's relationships, account settings, invite acceptance, user-app installation, rich presence, and certain voice/video helpers are fork-specific.

In particular, Altkit does not advertise bot-owned application command registration or the creation and handling of buttons,
select menus, and modals as user-account features. `sendSlash()` only invokes a command exposed by an installed application.

When adapting an upstream example:

1. Check that every imported symbol exists in the [API catalog](/api/).
2. Confirm the method is available to a user account.
3. Check permissions and whether the target object is cached or must be fetched.
4. Test against a non-critical account and resource.
5. Handle API rejection without blindly retrying.

## Version checks

```js
const { version, discordJsVersion } = require('@altkit/discord');

console.log(`Altkit ${version}; Discord.js surface ${discordJsVersion}`);
```

For the complete v4 delta and upgrade checklist, read the [Discord.js 14.27 migration guide](/migrate).
