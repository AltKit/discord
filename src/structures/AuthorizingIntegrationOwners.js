'use strict';

const { ApplicationIntegrationType } = require('discord-api-types/v10');
const Base = require('./Base');

class AuthorizingIntegrationOwners extends Base {
  constructor(client, data = {}) {
    super(client);
    Object.defineProperty(this, 'data', { value: data });

    for (const value of Object.values(ApplicationIntegrationType)) {
      if (typeof value === 'number') Object.defineProperty(this, value, { value: data[value] });
    }

    this.guildId = data[ApplicationIntegrationType.GuildInstall] ?? null;
    this.userId = data[ApplicationIntegrationType.UserInstall] ?? null;
  }

  get guild() {
    return (this.guildId && this.client.guilds.cache.get(this.guildId)) || null;
  }

  get user() {
    return (this.userId && this.client.users.cache.get(this.userId)) || null;
  }

  toJSON() {
    return this.data;
  }
}

module.exports = AuthorizingIntegrationOwners;
