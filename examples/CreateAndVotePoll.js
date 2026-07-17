'use strict';

const { Client, Events, Partials } = require('@altkit/discord');

const client = new Client({
  partials: [Partials.Message, Partials.Poll, Partials.PollAnswer],
});

client.once(Events.ClientReady, async readyClient => {
  const channel = await readyClient.channels.fetch(process.env.CHANNEL_ID);
  const message = await channel.send({
    poll: {
      question: { text: 'What is your favorite color?' },
      answers: [
        { text: 'Red', emoji: '🍎' },
        { text: 'Green', emoji: '🥗' },
        { text: 'Blue', emoji: '💙' },
        { text: 'Yellow', emoji: '🟡' },
      ],
      duration: 8,
      allowMultiselect: true,
    },
  });

  await message.vote(1, 3);
});

client.on(Events.MessagePollVoteAdd, (answer, userId) => {
  console.log(`User ${userId} voted for answer ${answer.id}`);
});

client.on(Events.MessagePollVoteRemove, (answer, userId) => {
  console.log(`User ${userId} removed their vote from answer ${answer.id}`);
});

client.login(process.env.DISCORD_TOKEN);
