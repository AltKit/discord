'use strict';

const Base = require('./Base');
const { Emoji } = require('./Emoji');
const PollAnswerVoterManager = require('../managers/PollAnswerVoterManager');

/**
 * Represents an answer to a {@link Poll}
 * @extends {Base}
 */
class PollAnswer extends Base {
  constructor(client, data, poll) {
    super(client);

    /**
     * The {@link Poll} this answer is part of
     * @name PollAnswer#poll
     * @type {Poll}
     * @readonly
     */
    Object.defineProperty(this, 'poll', { value: poll });

    /**
     * The id of this answer
     * @type {number}
     */
    this.id = data.answer_id;

    this.voters = new PollAnswerVoterManager(this);

    /**
     * The text of this answer
     * @type {?string}
     */
    this.text = data.poll_media?.text ?? null;

    /**
     * The raw emoji of this answer
     * @name PollAnswer#_emoji
     * @type {?APIPartialEmoji}
     * @private
     */
    Object.defineProperty(this, '_emoji', { value: data.poll_media?.emoji ?? null, writable: true });

    this._patch(data);
  }

  _patch(data) {
    // This `count` field comes from `poll.results.answer_counts`
    if ('count' in data) {
      /**
       * The amount of votes this answer has
       * @type {number}
       */
      this.voteCount = data.count;
    } else {
      this.voteCount ??= this.voters.cache.size;
    }
  }

  /**
   * The emoji of this answer
   * @type {?(GuildEmoji|Emoji)}
   */
  get emoji() {
    if (!this._emoji || (!this._emoji.id && !this._emoji.name)) return null;
    return this.client.emojis.cache.get(this._emoji.id) ?? new Emoji(this.client, this._emoji);
  }

  get partial() {
    return this.poll.partial || (this.text === null && this.emoji === null);
  }

  /**
   * @typedef {Object} FetchPollVotersOptions
   * @property {number} [limit] The maximum number of voters to fetch
   * @property {Snowflake} [after] The user id to fetch voters after
   */

  /**
   * Fetches the users that voted for this answer
   * @param {FetchPollVotersOptions} [options={}] The options for fetching voters
   * @returns {Promise<Collection<Snowflake, User>>}
   */
  fetchVoters({ after, limit } = {}) {
    return this.voters.fetch({ after, limit });
  }
}

module.exports = { PollAnswer };
