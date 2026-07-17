'use strict';

module.exports = (client, packet) => {
  client.emit('debug', `[VOICE] received voice server: ${JSON.stringify(packet)}`);
  client.emit('voiceServerUpdate', packet.d);
  client.voice.onVoiceServer(packet.d);
};
