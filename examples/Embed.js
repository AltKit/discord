const { Client, Events, WebEmbed } = require('@altkit/discord');
const client = new Client();

client.once(Events.ClientReady, readyClient => {
  console.log(`${readyClient.user.tag} is ready`);
});

client.on(Events.MessageCreate, message => {
  if (message.content == 'embed_hidden_url') {
    const embed = new WebEmbed()
      .setAuthor({ name: 'hello', url: 'https://google.com' })
      .setColor('RED')
      .setDescription('description uh')
      .setProvider({ name: 'provider', url: 'https://google.com' })
      .setTitle('This is Title')
      .setURL('https://google.com')
      .setImage('https://i.ytimg.com/vi/iBP8HambzpY/maxresdefault.jpg')
      .setRedirect('https://www.youtube.com/watch?v=iBP8HambzpY')
      .setVideo('http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
    message.channel.send({
      content: `Hello world ${WebEmbed.hiddenEmbed}${embed}`,
    });
  }
  if (message.content == 'embed') {
    const embed = new WebEmbed()
      .setAuthor({ name: 'hello', url: 'https://google.com' })
      .setColor('RED')
      .setDescription('description uh')
      .setProvider({ name: 'provider', url: 'https://google.com' })
      .setTitle('This is Title')
      .setURL('https://google.com')
      .setImage('https://i.ytimg.com/vi/iBP8HambzpY/maxresdefault.jpg')
      .setRedirect('https://www.youtube.com/watch?v=iBP8HambzpY')
      .setVideo('http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
    message.channel.send({
      content: `${embed}`,
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
