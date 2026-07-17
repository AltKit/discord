'use strict';

const { Collection } = require('@discordjs/collection');
const CachedManager = require('./CachedManager');
const User = require('../structures/User');

/**
 * Manages users who voted on a poll answer.
 * @extends {CachedManager}
 */
class PollAnswerVoterManager extends CachedManager {
  constructor(answer) {
    super(answer.client, User);
    this.answer = answer;
  }

  async fetch({ after, limit } = {}) {
    const { poll } = this.answer;
    const users = await poll.channel.messages.fetchPollAnswerVoters({
      messageId: poll.messageId,
      answerId: this.answer.id,
      after,
      limit,
    });

    return users.reduce((collection, user) => {
      this.cache.set(user.id, user);
      return collection.set(user.id, user);
    }, new Collection());
  }
}

module.exports = PollAnswerVoterManager;
