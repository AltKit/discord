'use strict';

const { Events } = require('../../../util/Constants');

module.exports = (client, { d: data }) => {
  const channel = client.channels.cache.get(data.id);
  if (channel && typeof channel._patch === 'function') {
    const old = channel._clone();
    channel._patch({ voice_start_time: data.voice_start_time });
    client.emit(Events.CHANNEL_UPDATE, old, channel);
  }
};
