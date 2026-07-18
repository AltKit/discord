import { expectType } from 'tsd';
import { Client, ClientUserSettingManager, RichPresence } from '.';

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
