'use strict';

const { Collection } = require('@discordjs/collection');
const Base = require('./Base');
const { PollAnswer } = require('./PollAnswer');
const { Error } = require('../errors');
const { PollLayoutTypes } = require('../util/Constants');

/**
 * Represents a Poll
 * @extends {Base}
 */
class Poll extends Base {
  constructor(client, data, message) {
    super(client);

    this.channelId = data.channel_id ?? message.channelId;
    this.messageId = data.message_id ?? message.id;
    Object.defineProperty(this, 'channel', { value: message.channel });

    /**
     * The message that started this poll
     * @name Poll#message
     * @type {Message}
     * @readonly
     */

    Object.defineProperty(this, 'message', { value: message });

    /**
     * The media for a poll's question
     * @typedef {Object} PollQuestionMedia
     * @property {string} text The text of this question
     */

    /**
     * The media for this poll's question
     * @type {PollQuestionMedia}
     */
    this.question = { text: data.question?.text ?? null };

    /**
     * The answers of this poll
     * @type {Collection<number, PollAnswer>}
     */
    this.answers = (data.answers ?? []).reduce(
      (acc, answer) => acc.set(answer.answer_id, new PollAnswer(this.client, answer, this)),
      new Collection(),
    );

    /**
     * The timestamp when this poll expires
     * @type {number}
     */
    this.expiresTimestamp = data.expiry ? Date.parse(data.expiry) : null;

    /**
     * Whether this poll allows multiple answers
     * @type {boolean}
     */
    this.allowMultiselect = data.allow_multiselect ?? null;

    /**
     * The layout type of this poll
     * @type {PollLayoutType}
     */
    this.layoutType = data.layout_type ? PollLayoutTypes[data.layout_type] : null;

    this._patch(data);
  }

  _patch(data) {
    if (data.results) {
      /**
       * Whether this poll's results have been precisely counted
       * @type {boolean}
       */
      this.resultsFinalized = data.results.is_finalized;

      for (const answerResult of data.results.answer_counts) {
        const answer = this.answers.get(answerResult.id);
        answer?._patch(answerResult);
      }
    } else {
      this.resultsFinalized ??= false;
    }
  }

  /**
   * The date when this poll expires
   * @type {Date}
   * @readonly
   */
  get expiresAt() {
    return this.expiresTimestamp && new Date(this.expiresTimestamp);
  }

  get partial() {
    return this.allowMultiselect === null;
  }

  async fetch() {
    await this.channel.messages.fetch(this.messageId);
    return this;
  }

  /**
   * Ends this poll.
   * @returns {Promise<Message>}
   */
  async end() {
    if (this.expiresTimestamp !== null && Date.now() > this.expiresTimestamp) {
      throw new Error('POLL_ALREADY_EXPIRED');
    }
    return this.channel.messages.endPoll(this.messageId);
  }
}

module.exports = { Poll };
