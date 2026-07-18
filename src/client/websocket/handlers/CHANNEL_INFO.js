'use strict';

const { Events } = require('../../../util/Constants');

module.exports = (client, { d: data }) => {
  for (const channelInfo of data.channels ?? []) {
    const channel = client.channels.cache.get(channelInfo.id);
    if (!channel || typeof channel._patch !== 'function') continue;

    const old = channel._clone();
    channel._patch(channelInfo);
    client.emit(Events.CHANNEL_UPDATE, old, channel);
  }
};
