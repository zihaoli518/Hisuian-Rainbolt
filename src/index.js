require('dotenv').config();
const fs = require('fs');
const { Client, IntentsBitField, EmbedBuilder, MessageEmbed } = require('discord.js'); 
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const cron = require('node-cron');
const { spawn } = require('child_process');
const challengeHistory = require('../challengeHistory.js')

const generateDailyChallengeLink = require('./generateDailyChallengeLink.js');
const getScores = require('./getScores.js');
const generateMonthlyStats = require('./generateMonthlyStats.js');
const challengeScoreHistory = require('../challengeScoreHistory.js');

const db = require('./dbFunctions/dbModel.js');


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
});




// handle all interactions 
client.on('interactionCreate', async (interaction) => {
  const user = interaction.user.id
  
  if (!interaction.isChatInputCommand()) return;
  
  console.log(interaction.commandName, user);
  if (interaction.commandName === 'dailychallenge') {
    handleInteractionDailyChallenge(interaction, user);
  }
  if (interaction.commandName === 'dailyscore') {
    const dateToday = new Date(); 
    const dateStr = getDateStr(dateToday)
    handleInteractionDailyScoreOf(interaction, dateStr)
  } 
  if (interaction.commandName === 'daily_score_of') {
    const dateStr = interaction.options.get('date').value.toString();
    handleInteractionDailyScoreOf(interaction, dateStr)
  }
  if (interaction.commandName === 'create_history_object') {
    createHistoryObject(interaction);
  } 
  if (interaction.commandName === 'test_alert') {
    testAlert();
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
      const date = getDateStr();

      const channelID = process.env.DAILY_CHALLENGE_CHANNEL_ID; 

      await client.channels.cache.get(channelID).send(dailyLink);
      await client.channels.cache.get(channelID).send(`here's the daily challenge for ${date}, glhf!` );
    } catch (error) {
      console.log(error)
    }
}


// input: date has to be in this format: '3-23-2024'
const handleInteractionDailyScoreOf = async (interaction, date) => {
  // interaction.reply(`generating daily challenge recap for ${date}... this might take a while`);
  // check if date exists in challenge history 
  if (!challengeHistory[date]) {
    interaction.reply('oops, the requested date does not exist. check your formatting of the date again, it should be 2-19-2024. or I forgot to post a link that day.')
    return
  }
  
  const dailyChallengeChannel = process.env.DAILY_CHALLENGE_CHANNEL_ID;
  // const outputChannel = process.env.GENERAL_CHANNEL_ID; 
  const outputChannel = process.env.GENERAL_CHANNEL_ID; 

  // Get the channel you want to go through messages in
  // const channel = client.channels.cache.get(dailyChallengeChannel);
  try {
    const url = challengeHistory[date];
    const scoresArray = await getScores(url, date);
    
    console.log('index.js scoresArray generated. Building embed.... ')
    // build embed to be send to channel 
    const embed = new EmbedBuilder()
      .setTitle('daily challenge leaderboard for: ' + date.toString())
      .setColor('Green')
    // Iterate over the data and add fields dynamically
    const fields = [];

    scoresArray.forEach((entry) => {
      const { rank, playerName, totalScore, totalDistance, countryRight} = entry;
      const rankStr = rank.toString();
      const totalScoreStr = totalScore.toString();
      // get monthly/all time stats 
      const monthStr = dateStrToMonthStr(date);
      // fields.push({ name: '\u200B', value: '\u200B' })
      generateMonthlyStats(playerName, monthStr)
      .then(monthlyStats => {
        let wins = monthlyStats.wins;
        let top3 = monthlyStats.topThree;
        let games = monthlyStats.gamesPlayed+1;
        if (rank===1) wins++;
        if (rank<=3) top3++;     
        const top3Rate = ((top3/games)*100).toFixed(1).toString() + "%";
        fields.push(
          { name: rankStr+'. '+playerName, value: `🌍 score: ${totalScoreStr} 🚎 distance: ${totalDistance} 📍country: ${countryRight}/5`, inline: true }
        );
        fields.push(
          { name: 'monthly stats', value: `avg: ${monthlyStats.monthlyAverage} 👑 wins: ${wins}, GP: ${games}, 🏆 top 3: ${top3}, rate: ${top3Rate}` }
        );   
        fields.push({ name: ' ', value: ' ' });
        // if player breaks 20k, send alert to general channel
        const todayObj = new Date();
        const todayStr = getDateStr(todayObj);
        return monthlyStats
      })
      .then((monthlyStats) => {
        // alerts for special occasions 
        // if (totalScore>19999 && todayStr===date) twentyKAlert(interaction, playerName);
        if (totalScore>19999) twentyKAlert(interaction, playerName);
        if (totalScore > monthlyStats.allTimeHighscore) pbAlert(interaction, playerName, totalScore, monthlyStats.allTimeHighscore)
      })
    });
    embed.addFields(fields);
    // if (totalScore>19999) await twentyKAlert(interaction, playerName);
    await client.channels.cache.get(outputChannel).send({embeds: [embed]});
    
  } catch (error) {
    console.log(error)
  }
}


const twentyKAlert = async (interaction, playerName) => {
  try {
    const channelID = process.env.GENERAL_CHANNEL_ID; 
    const message = `🚨🚨🚨20k alert🚨🚨🚨\n congrats ${playerName} on breaking 20k!`
    await client.channels.cache.get(channelID).send(message);

    const gifURL = 'https://media.tenor.com/bCWhbbjF8dwAAAAM/poggers-pepe.gif';
    await client.channels.cache.get(channelID).send({ files: [gifURL] })
  } catch (error) {
    console.log(error)
  }
}

const testAlert = async (interaction, playerName) => {
  try {
    getDiscordID('Z')
      .then(id => {
        const channelID = process.env.TEST_CHANNEL_ID; 
        const trollID = '392169146563166208';
        const user = client.users.cache.get(trollID);
        const message = `🚨🚨🚨poggers alert🚨🚨🚨\n congrats <@${id}> on winning a free extended car warranty!`
        client.channels.cache.get(channelID).send(message);
    
        const gifURL = 'https://media.tenor.com/bCWhbbjF8dwAAAAM/poggers-pepe.gif';
        client.channels.cache.get(channelID).send({ files: [gifURL] })
      })
  } catch (error) {
    console.log(error)
  }
}

const pbAlert = async (interaction, playerName, newScore, oldScore) => {
  try {
    getDiscordID(playerName)
      .then(id => {
        const channelID = process.env.GENERAL_CHANNEL_ID; 
        const trollID = '392169146563166208';
        const user = client.users.cache.get(trollID);
        const message = `🚨🚨🚨new PB alert🚨🚨🚨\n congrats <@${id}> on beating their old record of${oldScore} with a new PB of ${newScore}!`
        client.channels.cache.get(channelID).send(message);
    
        const gifURL = 'https://media.tenor.com/bCWhbbjF8dwAAAAM/poggers-pepe.gif';
        client.channels.cache.get(channelID).send({ files: [gifURL] })
      })
  } catch (error) {
    console.log(error)
  }
}
const getDiscordID = async (playerName) => {
  const query = `SELECT "discordID" FROM public.usernames WHERE "playerName" = '${playerName}'`;
  try {
    const dbResponse = await db.query(query);
    if (dbResponse.rows[0]) {
      // console.log(dbResponse.rows[0])
      return dbResponse.rows[0].discordID;
    }
  } catch (error) {
    console.log(error);
    throw error; 
  }
};



// generate file for matching date to challenge url 
const createHistoryObject = async (interaction) => {
  console.log('inside createHistoryObject...'); 
  // Check if the file exists
  if (Object.keys(challengeHistory).length !== 0) {
    console.error('File does not exist');
    interaction.reply('file already exists, cannot overwrite')
    return;
  }
  const outputChannel = process.env.TEST_CHANNEL_ID; 
  const dailyChallengeChannel = process.env.DAILY_CHALLENGE_CHANNEL_ID;
  const channel = client.channels.cache.get(dailyChallengeChannel);
  const messages = await channel.messages.fetch({ limit: 100 }); // Increase limit if needed
  const historyObject = {};

  messages.forEach(message => {
      const date = new Date(message.createdTimestamp);
      const dateString = getDateStr(date);

      if (!historyObject[dateString]) {
          historyObject[dateString] = '';
      }
      if (message.content.startsWith('https')) {
          historyObject[dateString] = (message.content);
      }
  });
  console.log('done with forEach, ', historyObject)

  fs.writeFile('challengeHistory.js', `module.exports = ${JSON.stringify(historyObject, null, 2)};`, err => {
    if (err) {
        console.error('Error writing to file:', err);
        return;
    } else {
        console.log('Message history object saved to challengeHistory.js');
    }
  });
  await client.channels.cache.get(outputChannel).send('successfully created challengeHistory.js in root directory');
};










// Cron job 
const schedule = '30 23 * * *';

// Schedule the task
cron.schedule(schedule, async () => {
  // const dailyLink = await generateDailyChallengeLink();

  // const date = getDateStr();
  // const channelID = process.env.TEST_CHANNEL_ID; 

  // await client.channels.cache.get(channelID).send(dailyLink);
  // await client.channels.cache.get(channelID).send(`here's the daily challenge for ${date}, glhf! @everyone      (generated with cron job)` );
  console.log('Running scheduled task...');
});



// util functions 
const getDateStr = (date) => {
  let currentDate = date;
  if (!date) currentDate = new Date();
  // Get the day, month, and year
  const day = currentDate.getDate();
  const month = currentDate.getMonth() + 1; // Month is zero-based, so add 1
  const year = currentDate.getFullYear();

  return`${month}-${day}-${year}`;
}

const dateStrToMonthStr = (str) => {
  const parts = str.split('-'); // Split the string by the hyphen character
  const monthYearString = `${parts[0]}-${parts[2]}`;
  return monthYearString
}
