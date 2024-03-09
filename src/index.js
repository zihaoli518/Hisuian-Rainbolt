const { Client, IntentsBitField, EmbedBuilder } = require('discord.js'); 
const puppeteer = require('puppeteer');
const generateDailyChallengeLink = require('./generateDailyChallengeLink.js')
require('dotenv').config();


const TOKEN = process.env.DISCORD_TOKEN; 


const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds, 
    IntentsBitField.Flags.GuildMembers, 
    IntentsBitField.Flags.GuildMessages, 
    IntentsBitField.Flags.MessageContent, 

  ]
});

client.on('ready', (c) => {
  console.log(`${c.user.tag} is ready`); 
});

client.on('messageCreate', (message) => {

})


client.on('interactionCreate', async (interaction) => {
  const user = interaction.user.id
  
  if (!interaction.isChatInputCommand()) return;
  
  console.log(interaction.commandName, user);
  if (interaction.commandName === 'dailychallenge') {
    // send url to daily challenge channel 
    try {
      // reply to command
      await interaction.reply('daily challenge url created and sent! ' + `<@${user}>`);
      // first generate the link 
      const dailyLink = await generateDailyChallengeLink();

      // build embed and send to channel 
      const date = getDate();
      // const embed = new EmbedBuilder()
      //   .setTitle('Daily Challenge for', date)
      //   .setDescription(dailyLink)
      //   .setDescription('good luck and enjoy!')
      //   .setFooter({text: 'good luck!'})
      //   .setColor('Green')

      // const channelID = process.env.DAILY_CHALLENGE_CHANNEL_ID; 
      const channelID = process.env.DAILY_CHALLENGE_CHANNEL_ID; 

      await client.channels.cache.get(channelID).send(dailyLink);
      await client.channels.cache.get(channelID).send(`here's the daily challenge for ${date}, glhf! @everyone` );
    } catch (error) {
      console.log(error)
    }
  }
})

client.login(TOKEN);




const getDate = () => {
  // Create a new Date object
const currentDate = new Date();

// Get the day, month, and year
const day = currentDate.getDate();
const month = currentDate.getMonth() + 1; // Month is zero-based, so add 1
const year = currentDate.getFullYear();

return`${month}-${day}-${year}`;
}
