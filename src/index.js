require('dotenv').config();
const { Client, IntentsBitField, EmbedBuilder, MessageEmbed } = require('discord.js'); 
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const cron = require('node-cron');
const { spawn } = require('child_process');

const generateDailyChallengeLink = require('./generateDailyChallengeLink.js');
const getScores = require('./getScores.js');



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

// handle all messages 
client.on('messageCreate', (message) => {

})

// handle all interactions 
client.on('interactionCreate', async (interaction) => {
  const user = interaction.user.id
  
  if (!interaction.isChatInputCommand()) return;
  
  console.log(interaction.commandName, user);
  if (interaction.commandName === 'dailychallenge') {
    handleInteractionDailyChallenge(interaction, user);
  }
  if (interaction.commandName === 'dailyscore') {
    handleInteractionDailyScore(interaction);
  }
})

client.login(TOKEN);




// functions handling interactions and messages and commands 
const handleInteractionDailyChallenge = async (interaction, user) => {
    // send url to daily challenge channel 
    try {
      // reply to command
      await interaction.reply('daily challenge url created and sent! ' + `<@${user}>`);
      // first generate the link 
      const dailyLink = await generateDailyChallengeLink();
      const date = getDate();

      const channelID = process.env.DAILY_CHALLENGE_CHANNEL_ID; 

      await client.channels.cache.get(channelID).send(dailyLink);
      await client.channels.cache.get(channelID).send(`here's the daily challenge for ${date}, glhf!` );
    } catch (error) {
      console.log(error)
    }
}

// sends message to general channel a report of scores today, and comparison with the day before if the player has played. 
const handleInteractionDailyScore = async (interaction) => {
  try {
    const dailyChallengeChannel = process.env.DAILY_CHALLENGE_CHANNEL_ID;
    const outputChannel = process.env.TEST_CHANNEL_ID; 
    // Get the channel you want to go through messages in
    const channel = client.channels.cache.get(dailyChallengeChannel);
    // get the last few messages in the channel 
    const messages = await channel.messages.fetch({ limit: 4 });
    const challengeURLArray = []; 
    messages.forEach(message => {
        // check if the message contains a challenge link 
       if (message.content.slice(0,5) === 'https') challengeURLArray.push(message.content)
    });
    let todaysURL = challengeURLArray[0];
    let yesterdayURL = challengeURLArray[1]; 

    // const testURL = "https://geoguessr.com/api/v3/results/highscores/VIT6mW6KIg0pthxj?friends=false&limit=26&minRounds=5"
    console.log('testURL ', todaysURL)
    const scoresArrayToday = await getScores(todaysURL);
    // get date
    const date = getDate(); 

    // build embed to be send to channel 
    const embed = new EmbedBuilder()
      .setTitle('daily challenge leaderboard for: ' + date.toString())
      // .setDescription('good luck and enjoy!')
      // .setFooter({text: 'good luck!'})
      .setColor('Green')
    // Iterate over the data and add fields dynamically
    const fields = [];
    // console.log('scoresArrayToday ', scoresArrayToday)
    scoresArrayToday.forEach((entry) => {
      const { rank, playerName, totalScore, totalDistance, countryStreak} = entry;
      const rankStr = rank.toString();
      const totalScoreStr = totalScore.toString();
      fields.push(
        { name: rankStr+'. '+playerName, value: `🌍score: ${totalScoreStr}, 🚎 distance: ${totalDistance} 📍country streak: ${countryStreak}`, inline: true }
      );      
      // fields.push({ name: '\u200B', value: '\u200B' })
      fields.push({ name: '\u200B', value: '\u200B\u200B' });
      // if player breaks 20k, send alert to general channel
      if (totalScore>19999) twentyKAlert(interaction, playerName);
    });
    // console.log('about to send message....', embed)
    embed.addFields(fields);
    await client.channels.cache.get(outputChannel).send({embeds: [embed]});

  } catch (error) {
    console.log(error)
  }
}


const handleInteractionDailyScoreOf = async (interaction, date) => {
  try {
    const channelID = process.env.TEST_CHANNEL_ID; 

    let message1 = `here is the leaderboard for ${date}'s daily challenge: `;
    const scoresArray = await getScores(challengeId);
    await client.channels.cache.get(channelID).send(message1);
  } catch (error) {
    console.log(error)
  }
}


const twentyKAlert = async (interaction, playerName) => {
  try {
    const channelID = process.env.GENERAL_CHANNEL_ID; 
    const message = `🚨🚨🚨20k alert🚨🚨🚨\n congrats ${playerName} on breaking 20k!`
    await client.channels.cache.get(channelID).send(message);
  } catch (error) {
    console.log(error)
  }
}



// Cron job 
const schedule = '30 23 * * *';

// Schedule the task
cron.schedule(schedule, async () => {
  // const dailyLink = await generateDailyChallengeLink();

  // const date = getDate();
  // const channelID = process.env.TEST_CHANNEL_ID; 

  // await client.channels.cache.get(channelID).send(dailyLink);
  // await client.channels.cache.get(channelID).send(`here's the daily challenge for ${date}, glhf! @everyone      (generated with cron job)` );
  console.log('Running scheduled task...');
});




const getDate = () => {
  // Create a new Date object
const currentDate = new Date();

// Get the day, month, and year
const day = currentDate.getDate();
const month = currentDate.getMonth() + 1; // Month is zero-based, so add 1
const year = currentDate.getFullYear();

return`${month}-${day}-${year}`;
}
