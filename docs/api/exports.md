# Package exports and aliases

`@altkit/discord` exposes the fork's core classes and re-exports compatible Discord.js ecosystem utilities from its CommonJS package root.

```js
const {
  Client,
  Events,
  Partials,
  Collection,
  EmbedBuilder,
  REST,
  version,
  discordJsVersion,
} = require('@altkit/discord');
```

## Starting points

- `Client` and `BaseClient`
- `WebhookClient`
- `ShardingManager`, `Shard`, and `ShardClientUtil` (deprecated for removal in a future major)
- package `version` and targeted `discordJsVersion`

## Compatibility aliases

| Export | Resolves to |
| --- | --- |
| `AttachmentBuilder` | `MessageAttachment` |
| `BaseChannel` | `Channel` |
| `IntentsBitField` | `Intents` |
| `MessageFlagsBitField` | `MessageFlags` |
| `PermissionsBitField` | `Permissions` |
| `UserFlagsBitField` | `UserFlags` |

The aliases refer to the same fork implementation; they are not separate subclasses.

## Utility exports

The package root includes `Events`, `Partials`, bit fields, flags, `Collection`, `DataResolver`, `Options`, `SnowflakeUtil`, `Sweepers`, REST errors, and formatters. It also re-exports public members from:

- `@discordjs/builders`
- `@discordjs/formatters`
- `@discordjs/rest`
- `@discordjs/util`
- `@discordjs/ws`
- Discord API v10 types and enums from `discord-api-types`

Fork-defined exports take precedence if a dependency exposes the same name.

An exported builder only constructs payload data; it does not grant a user account access to bot-only endpoints. In
particular, command registration and bot-owned interactive component workflows are unsupported.

## Managers and structures

Managers, structures, voice classes, presence helpers, collectors, and fork-specific account helpers are exported from the package root. Use the [symbol catalog](/api/) to locate the exact API and source link.

## CommonJS and TypeScript

The runtime entry point is CommonJS:

```js
const { Client } = require('@altkit/discord');
```

TypeScript declarations are selected through the package's `types` field:

```ts
import { Client, Events, type ClientOptions } from '@altkit/discord';
```

No separate `@types` dependency is required.
