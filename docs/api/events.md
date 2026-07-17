# Events

Import `Events` from the package root and use its values when registering client listeners:

```js
const { Events } = require('@altkit/discord');

client.once(Events.ClientReady, readyClient => {});
client.on(Events.MessageCreate, message => {});
```

The table reflects `src/util/Events.js`. Individual class pages describe payloads for documented events.

## Client and diagnostics

| Constant | Event value |
| --- | --- |
| `ClientReady` | `clientReady` |
| `Debug` | `debug` |
| `Error` | `error` |
| `Invalidated` | `invalidated` |
| `Raw` | `raw` |
| `Warn` | `warn` |
| `CacheSweep` | `cacheSweep` |

## Messages and interactions

| Constant | Event value |
| --- | --- |
| `InteractionCreate` | `interactionCreate` |
| `MessageCreate` | `messageCreate` |
| `MessageDelete` | `messageDelete` |
| `MessageBulkDelete` | `messageDeleteBulk` |
| `MessageUpdate` | `messageUpdate` |
| `MessagePollVoteAdd` | `messagePollVoteAdd` |
| `MessagePollVoteRemove` | `messagePollVoteRemove` |
| `MessageReactionAdd` | `messageReactionAdd` |
| `MessageReactionRemove` | `messageReactionRemove` |
| `MessageReactionRemoveAll` | `messageReactionRemoveAll` |
| `MessageReactionRemoveEmoji` | `messageReactionRemoveEmoji` |
| `TypingStart` | `typingStart` |

## Guilds, members, and moderation

| Constant | Event value |
| --- | --- |
| `GuildAvailable` | `guildAvailable` |
| `GuildCreate` | `guildCreate` |
| `GuildDelete` | `guildDelete` |
| `GuildUnavailable` | `guildUnavailable` |
| `GuildUpdate` | `guildUpdate` |
| `GuildAuditLogEntryCreate` | `guildAuditLogEntryCreate` |
| `GuildBanAdd` | `guildBanAdd` |
| `GuildBanRemove` | `guildBanRemove` |
| `GuildIntegrationsUpdate` | `guildIntegrationsUpdate` |
| `GuildMemberAdd` | `guildMemberAdd` |
| `GuildMemberAvailable` | `guildMemberAvailable` |
| `GuildMemberRemove` | `guildMemberRemove` |
| `GuildMembersChunk` | `guildMembersChunk` |
| `GuildMemberUpdate` | `guildMemberUpdate` |
| `AutoModerationActionExecution` | `autoModerationActionExecution` |
| `AutoModerationRuleCreate` | `autoModerationRuleCreate` |
| `AutoModerationRuleDelete` | `autoModerationRuleDelete` |
| `AutoModerationRuleUpdate` | `autoModerationRuleUpdate` |

## Channels, threads, and webhooks

| Constant | Event value |
| --- | --- |
| `ChannelCreate` | `channelCreate` |
| `ChannelDelete` | `channelDelete` |
| `ChannelPinsUpdate` | `channelPinsUpdate` |
| `ChannelUpdate` | `channelUpdate` |
| `ThreadCreate` | `threadCreate` |
| `ThreadDelete` | `threadDelete` |
| `ThreadListSync` | `threadListSync` |
| `ThreadMemberUpdate` | `threadMemberUpdate` |
| `ThreadMembersUpdate` | `threadMembersUpdate` |
| `ThreadUpdate` | `threadUpdate` |
| `WebhooksUpdate` | `webhooksUpdate` |

## Guild resources

| Constant | Event value |
| --- | --- |
| `GuildEmojiCreate` | `emojiCreate` |
| `GuildEmojiDelete` | `emojiDelete` |
| `GuildEmojiUpdate` | `emojiUpdate` |
| `GuildRoleCreate` | `roleCreate` |
| `GuildRoleDelete` | `roleDelete` |
| `GuildRoleUpdate` | `roleUpdate` |
| `GuildStickerCreate` | `stickerCreate` |
| `GuildStickerDelete` | `stickerDelete` |
| `GuildStickerUpdate` | `stickerUpdate` |
| `InviteCreate` | `inviteCreate` |
| `InviteDelete` | `inviteDelete` |
| `StageInstanceCreate` | `stageInstanceCreate` |
| `StageInstanceDelete` | `stageInstanceDelete` |
| `StageInstanceUpdate` | `stageInstanceUpdate` |

## Scheduled events and application commands

| Constant | Event value |
| --- | --- |
| `ApplicationCommandPermissionsUpdate` | `applicationCommandPermissionsUpdate` |
| `GuildScheduledEventCreate` | `guildScheduledEventCreate` |
| `GuildScheduledEventDelete` | `guildScheduledEventDelete` |
| `GuildScheduledEventUpdate` | `guildScheduledEventUpdate` |
| `GuildScheduledEventUserAdd` | `guildScheduledEventUserAdd` |
| `GuildScheduledEventUserRemove` | `guildScheduledEventUserRemove` |

## Gateway, presence, and voice

| Constant | Event value |
| --- | --- |
| `PresenceUpdate` | `presenceUpdate` |
| `ShardDisconnect` | `shardDisconnect` |
| `ShardError` | `shardError` |
| `ShardReady` | `shardReady` |
| `ShardReconnecting` | `shardReconnecting` |
| `ShardResume` | `shardResume` |
| `UserUpdate` | `userUpdate` |
| `VoiceChannelEffectSend` | `voiceChannelEffectSend` |
| `VoiceServerUpdate` | `voiceServerUpdate` |
| `VoiceStateUpdate` | `voiceStateUpdate` |

Selected legacy names continue to be emitted for compatibility. New code should use these modern constants.
