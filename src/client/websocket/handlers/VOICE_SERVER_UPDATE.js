'use strict';

module.exports = (client, packet) => {
  client.emit('debug', '[VOICE] Voice server update received.');
  client.emit('voiceServerUpdate', packet.d);
  client.voice.onVoiceServer(packet.d);
};
