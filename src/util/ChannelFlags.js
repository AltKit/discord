'use strict';

const BitField = require('./BitField');

/**
 * Data structure that makes it easy to interact with a {@link Channel#flags} bitfield.
 * @extends {BitField}
 */
class ChannelFlags extends BitField {}

/**
 * Numeric guild channel flags. All available properties:
 * * `GUILD_FEED_REMOVED`
 * * `PINNED`
 * * `ACTIVE_CHANNELS_REMOVED`
 * * `REQUIRE_TAG`
 * * `IS_SPAM`
 * * `IS_GUILD_RESOURCE_CHANNEL`
 * * `CLYDE_AI`
 * * `IS_SCHEDULED_FOR_DELETION`
 * * `HIDE_MEDIA_DOWNLOAD_OPTIONS`
 * * `IS_SPOILER_CHANNEL`
 * @type {Object}
 * @see {@link https://discord.com/developers/docs/resources/channel#channel-object-channel-flags}
 */
ChannelFlags.FLAGS = {
  GUILD_FEED_REMOVED: 1 << 0,
  PINNED: 1 << 1,
  ACTIVE_CHANNELS_REMOVED: 1 << 2,
  REQUIRE_TAG: 1 << 4,
  IS_SPAM: 1 << 5,
  IS_GUILD_RESOURCE_CHANNEL: 1 << 7,
  CLYDE_AI: 1 << 8,
  IS_SCHEDULED_FOR_DELETION: 1 << 9,
  HIDE_MEDIA_DOWNLOAD_OPTIONS: 1 << 15,
  IS_SPOILER_CHANNEL: 1 << 21,
};

/**
 * @name ChannelFlags
 * @kind constructor
 * @memberof ChannelFlags
 * @param {BitFieldResolvable} [bits=0] Bit(s) to read from
 */

/**
 * Bitfield of the packed bits
 * @type {number}
 * @name ChannelFlags#bitfield
 */

/**
 * Data that can be resolved to give a channel flag bitfield. This can be:
 * * A string (see {@link ChannelFlags.FLAGS})
 * * A channel flag
 * * An instance of ChannelFlags
 * * An Array of ChannelFlags
 * @typedef {string|number|ChannelFlags|ChannelFlagsResolvable[]} ChannelFlagsResolvable
 */

module.exports = ChannelFlags;
