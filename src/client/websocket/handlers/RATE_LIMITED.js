'use strict';

const process = require('node:process');
const { GatewayOpcodes } = require('discord-api-types/v10');

const warnedOpcodes = new Set();

module.exports = (client, { d: data }) => {
  client.emit('debug', `Gateway rate limit hit for opcode ${data.opcode} (${GatewayOpcodes[data.opcode]})`);

  if (data.opcode !== GatewayOpcodes.RequestGuildMembers && !warnedOpcodes.has(data.opcode)) {
    process.emitWarning(`Gateway rate limit hit for opcode ${data.opcode} (${GatewayOpcodes[data.opcode]}).`);
    warnedOpcodes.add(data.opcode);
  }
};
