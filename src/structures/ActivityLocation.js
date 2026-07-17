'use strict';

const Base = require('./Base');

class ActivityLocation extends Base {
  constructor(client, data) {
    super(client);
    this.id = data.id;
    this.kind = data.kind;
    this.channelId = data.channel_id;
    this.guildId = data.guild_id ?? null;
  }

  get channel() {
    return this.client.channels.cache.get(this.channelId) ?? null;
  }

  get guild() {
    return (this.guildId && this.client.guilds.cache.get(this.guildId)) || null;
  }
}

module.exports = ActivityLocation;
