import { expectNotAssignable, expectType } from 'tsd';
import { Collection } from '@discordjs/collection';
import { ApplicationIntegrationType } from 'discord-api-types/v10';
import {
  AuthorizingIntegrationOwners,
  Client,
  ClientUserSettingManager,
  Collectibles,
  GuildMember,
  MessageComponentInteraction,
  Message,
  RichPresence,
  RoleManager,
  Snowflake,
  AttachmentBuilder,
  WebhookMessageOptions,
} from '.';

const client = new Client();

expectType<Promise<ClientUserSettingManager>>(client.settings.restrictedGuilds(true));
expectType<Promise<ClientUserSettingManager>>(client.settings.addRestrictedGuild('33333333333333333'));
expectType<Promise<ClientUserSettingManager>>(client.settings.removeRestrictedGuild('33333333333333333'));

const presence = new RichPresence(client);
expectType<RichPresence>(
  presence.setButtons(
    { name: 'Documentation', url: 'https://example.com/docs' },
    { name: 'Support', url: 'https://example.com/support' },
  ),
);
expectType<RichPresence>(presence.addButton('Website', 'https://example.com'));

declare const componentInteraction: MessageComponentInteraction;
expectType<Promise<void>>(componentInteraction.update());

declare const guildMember: GuildMember;
expectType<Collectibles | null>(guildMember.collectibles);

declare const roleManager: RoleManager;
expectType<Promise<Collection<Snowflake, number>>>(roleManager.fetchMemberCounts());

const voiceAttachment = new AttachmentBuilder(Buffer.from('voice'), 'voice.ogg');
expectType<AttachmentBuilder>(voiceAttachment.setTitle('Voice note').setWaveform('AAECAw==').setDuration(1.25));

expectNotAssignable<WebhookMessageOptions>({
  sharedClientTheme: { colors: [], gradientAngle: 0, baseMix: 0, baseTheme: null },
});

declare const owners: AuthorizingIntegrationOwners;
expectType<Snowflake | undefined>(owners[ApplicationIntegrationType.GuildInstall]);

declare const message: Message;
expectType<boolean>(message.equals(message));
