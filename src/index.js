require('dotenv').config();
const fs = require('fs');
const { Client, IntentsBitField, EmbedBuilder, MessageEmbed, AttachmentBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js'); 
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const cron = require('node-cron');
// const { spawn } = require('child_process');
const challengeLinksHistory = require('../challengeLinksHistory.js')

const generateDailyChallengeLink = require('./generateDailyChallengeLink.js');
const getScores = require('./getScores.js');
const generateMonthlyStats = require('./generateMonthlyStats.js');
const challengeScoreHistory = require('../challengeScoreHistory.js');
const countryGreetings = require('./utils/countryGreetings.js');
const getAllTimeStats = require('./getAllTimeStats.js')
const countryCodeDict = require('./utils/countryCodes.js');
const updatePreviousGames = require('./utils/updatePreviousGames.js');
const createChart = require('./createChart.js');
const createCountryBarChart = require('./createCountryBarChart.js');
const handleInteractionMonthlyRecap = require('./handleInteractions/handleInteractionMonthlyRecap.js');


const adminDiscordID = process.env.ADMIN_DISCORD_ID;


console.log(Object.keys(challengeScoreHistory).sort())

const db = require('./dbFunctions/dbModel.js');


// importing and mapping playerName and discordID
const getAllDiscordID = async () => {
  // const query = `SELECT "discordID" FROM public.usernames WHERE "playerName" = '${playerName}'`;
  const query = `SELECT * FROM usernames`;
  try {
    const dbResponse = await db.query(query);
    if (dbResponse.rows[0]) {
      const result = {}
      dbResponse.rows.forEach(row => {
        result[row.playerName] = row.discordID
      })
      return result;
    }
  } catch (error) {
    console.log(error);
    throw error; 
  }
};

// get all usernames-discordID mappnig
let discordUsernameObj = {};
(async () => {
  const data = await getAllDiscordID();
  discordUsernameObj = data;
  console.log(discordUsernameObj);
})();



// discord js setup
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
  // console.log('messageCreate ', message)
  const user = message.id; 

});




// handle all interactions 
client.on('interactionCreate', async (interaction) => {
  const user = interaction.user.id
  console.log('NEW interaction! ', user)
  
  if (interaction.type===3) {
    await interaction.deferReply(); 
    // interaction.reply({content: 'thanks'})
  }
  if (!interaction.isChatInputCommand()) return;
  
  console.log(interaction.commandName, user);
  if (interaction.commandName === 'send_daily_challenge_link') {
    handleInteractionDailyChallenge(interaction, user);
  }
  if (interaction.commandName === 'daily_recap_today') {
    const dateToday = new Date(); 
    const dateStr = getDateStr(dateToday)
    handleInteractionDailyScoreOf(interaction, dateStr)
  } 
  if (interaction.commandName === 'daily_recap_of') {
    const dateStr = interaction.options.get('date').value.toString();
    handleInteractionDailyScoreOf(interaction, dateStr)
  }
  if (interaction.commandName === 'my_all_time_stats') {
    handleInteractionGetAllTimeStats(interaction, user)
  }
  if (interaction.commandName === 'all_time_stats_of') {
    const userId = interaction.options.get('user').value.toString();
    handleInteractionGetAllTimeStats(interaction, userId)
  }
  if (interaction.commandName === 'my_monthly_chart') {
    const userId = user;
    handleMyMonthlyChart(interaction, userId, );
  }
  if (interaction.commandName === 'monthly_chart_of') {
    const userId = interaction.options.get('user').value.toString();
    const monthStr = interaction.options.get('month').value.toString();
    handleMyMonthlyChart(interaction, userId, monthStr);
  }

  if (interaction.commandName === 'monthly_recap') {
    const monthStr = interaction.options.get('month').value.toString();
    handleInteractionMonthlyRecap(client, interaction, monthStr, discordUsernameObj)
  } 

  if (interaction.commandName === 'all_time_breakdown_chart') {
    let userId = interaction.options.get('user').value.toString();
    if (!userId) userId = user;
    handleAllTimeCountryChart(interaction, userId);
  }
  if (interaction.commandName === 'all_time_breakdown_everyone') {
    handleAllTimeCountryChart(interaction, user, true);
  }


  // if (interaction.commandName === 'create_history_object') {
  //   createHistoryObject(interaction);
  // } 
  // if (interaction.commandName === 'test_alert') {
  //   testAlert();
  // }
  if (interaction.isCommand() && interaction.timedOut) {
    // Ping yourself
    await interaction.reply({
      content: `<@${adminDiscordID}>` + '`the interaction timed out. check console logs`',
      ephemeral: false // This ensures that the message is only visible to the user who triggered the command
    });
  }
})

client.login(TOKEN);








// functions handling interactions and messages and commands 
const handleInteractionDailyChallenge = async (interaction, user) => {
    // send url to daily challenge channel 
    try {
      const generalChannel = (process.env.NODE_ENV === 'production') ? process.env.GENERAL_CHANNEL_ID : process.env.TEST_CHANNEL_ID;
      // reply to command
      // if (interaction) await client.channels.cache.get(generalChannel).send('daily challenge url is being created ' + `<@${user}>`);
      if (interaction) console.log('handleInteractionDailyChallenge...')
      else {
        await client.channels.cache.get(generalChannel).send('`running cron job...`');
      }
      // first generate the link 
      const dailyLink = await generateDailyChallengeLink(interaction);
      if (!dailyLink) {
        interaction.reply('`an error has occured in handleInteractionDailyChallenge();`'  + `<@${adminDiscordID}>`);
        return;
      }
      const date = getDateStr();

      // const channelID = process.env.DAILY_CHALLENGE_CHANNEL_ID; 
      const dailyChannel = (process.env.NODE_ENV === 'production') ? process.env.DAILY_CHALLENGE_CHANNEL_ID : process.env.TEST_CHANNEL_ID; 

      await client.channels.cache.get(dailyChannel).send(`${dailyLink} \n here's the daily challenge for ${date}, glhf!` );
      // await client.channels.cache.get(channelID).send(dailyLink);
    } catch (error) {
      console.log(error.type);
      if (interaction) interaction.reply('`an error has occured in generateDailyChallengeLink();`'  + `<@${adminDiscordID}>`)
    }
}




// input: date has to be in this format: '3-23-2024'
const handleInteractionDailyScoreOf = async (interaction, date) => {
  // interaction.reply(`generating daily challenge recap for ${date}... this might take a while`);
  const outputChannel = (process.env.NODE_ENV === 'production') ? process.env.GENERAL_CHANNEL_ID : process.env.TEST_CHANNEL_ID;
  console.log('inside handle..... ', process.env.NODE_ENV, (process.env.NODE_ENV === 'production'))
  // check if date exists in challenge history 
  if (!challengeLinksHistory[date]) {
    if (interaction) interaction.reply('`oops, the requested date does not exist. check your formatting of the date again, it should be 2-19-2024. or I forgot to post a link that day.`')
    return
  }
  if (interaction) interaction.reply('`generating daily recap... this might take a while because free APIs limit my speed :/`');
  else {
    await client.channels.cache.get(outputChannel).send('`generating daily recap... this might take a while because free APIs limit my speed :/`' );
  }
  const startTime = performance.now();


  try {
    const url = challengeLinksHistory[date];
    const dailyScoreObj = await getScores(url, date, interaction);
    const rankingArray = dailyScoreObj.rankingArray;
    const bestGuess = dailyScoreObj.dailyInfo.bestGuess;
    const worstGuess = dailyScoreObj.dailyInfo.worstGuess;
    const aboveAverage = [];

    let twentyK = false;
    let pbArray = [];

    
    console.log('index.js rankingArray generated. Building embed.... ')
    // build embed to be send to channel 
    const embed = new EmbedBuilder()
      .setTitle('daily challenge leaderboard for: ' + date.toString())
      .setColor('Green')
    // Iterate over the data and add fields dynamically
    const fields = [];

    const promiseArray = rankingArray.map((entry) => {
      return new Promise(async (resolve) => {
          const { rank, playerName, totalScore, totalDistance, countryRight } = entry;
          const rankStr = rank.toString();
          const totalScoreStr = totalScore.toString();
          const monthStr = dateStrToMonthStr(date);
  
          try {
              const monthlyStats = generateMonthlyStats(playerName, monthStr);
              let wins = monthlyStats.wins;
              let top3 = monthlyStats.topThree;
              let games = monthlyStats.gamesPlayed;
              const top3Rate = ((top3 / games) * 100).toFixed(1).toString() + "%";
  
              console.log('checking average: ', totalScore, monthlyStats.monthlyAverage);
              if (totalScore > monthlyStats.monthlyAverage) aboveAverage.push(playerName);

              if (totalScore>19999) twentyKAlert(interaction, playerName);
              if (totalScore>monthlyStats.allTimeHighscore) pbAlert(interaction, playerName, totalScore, monthlyStats.allTimeHighscore);
  
              const field1 = { name: rankStr + '. ' + playerName, value: `🌍 score: ${totalScoreStr} 🚎 distance: ${totalDistance}km 📍country: ${countryRight}/5`, inline: true };
              const field2 = { name: 'monthly stats', value: `avg: ${monthlyStats.monthlyAverage} 👑 wins: ${wins}, GP: ${games}, 🏆 top 3: ${top3}, ${top3Rate}` };
              const field3 = { name: ' ', value: ' ' };
  
              fields.push(field1, field2, field3);
  
              // const todayObj = new Date();
              // const todayStr = getDateStr(todayObj);
  
              // Resolve the promise with monthlyStats
              resolve(monthlyStats);
          } catch (error) {
              console.error('Error in generating monthly stats:', error);
              // Resolve with null in case of error
              resolve(null);
          }
      });
    });
  
    // Wait for all promises to resolve
    await Promise.all(promiseArray);


    console.log('before discordID')
    // add daily awards
    const discordIDBest = discordUsernameObj[bestGuess.playerName];
    const discordIDWorst = discordUsernameObj[worstGuess.playerName];

    
    const aboveAverageStr = aboveAverage.length ? aboveAverage.join(', ') : '.... no one ..... trash seed';
    // best
    const goodJob = ['wild guess', 'good shit', 'wow nice', 'holy poggers', 'poggers', 'what a beast!' ];
    const impressive = ['impressive', 'incredible', 'unbelievable', 'insane'];
    const wentCrazy = ['went absolutely crazy @ ', '360 no scoped: ', 'went the f off @ ', 'went bonkers @ '];
    // worst 
    const worstGuessStr1 = [`${countryGreetings[worstGuess.guessCountryCode]}, thanks for trolling ${worstGuess.playerName} aka <@${discordIDWorst}>! an ${getRandomWord(impressive)} ${worstGuess.distance} km off🔥🔥, I can see why you thought it was ${worstGuess.guessCountry} instead of ${worstGuess.correctCountry} tho` ]
    const worstGuessStr2 = [`${countryGreetings[worstGuess.guessCountryCode]}, oof ${worstGuess.playerName} aka <@${discordIDWorst}>, an ${getRandomWord(impressive)} ${worstGuess.distance} km off🔥🔥, understandable, ${worstGuess.guessCountry} and ${worstGuess.correctCountry} do look kinda alike` ];
    const worstGuessStr3 = [`${countryGreetings[worstGuess.guessCountryCode]}, I feel you ${worstGuess.playerName} aka <@${discordIDWorst}>, 🫡 your guess in ${worstGuess.guessCountry} is ${worstGuess.distance} km away from ${worstGuess.correctCountry}, it happens!` ];
    const worstGuessStr4 = [`${countryGreetings[worstGuess.guessCountryCode]}, apparently ${worstGuess.playerName} aka <@${discordIDWorst}>, thinks ${worstGuess.correctCountry} looks like ${worstGuess.guessCountry}, which is reasonable 🫡, but it's ${worstGuess.distance} km away unfortunately` ];
    const worstGuessStr = [];
    worstGuessStr.push(worstGuessStr1, worstGuessStr2, worstGuessStr3, worstGuessStr4)
    fields.push(
      { name: '\u200b ', value: '🏅🏅🏅🏅🏅 DAILY AWARDS🏅🏅🏅🏅🏅'},
      { name: '🔥🔥🔥🔥🔥 best guess of the day 🔥🔥🔥🔥🔥', value: `${countryGreetings[bestGuess.countryCode]}, ${getRandomWord(goodJob)} ${bestGuess.playerName} aka <@${discordIDBest}>🥳! an ${getRandomWord(impressive)} guess with only ${bestGuess.distance} km off 🤯🤯🤯, ${getRandomWord(wentCrazy)} \n||${bestGuess.address}|| 🧭` },
      { name: '😈😈😈😈😈 furthest guess of the day 😈😈😈😈😈', value: `${getRandomWord(worstGuessStr)}` },
      { name: 'congrats on beating your monthly average!', value: aboveAverageStr }
    );

    embed.addFields(fields);
    
    
    const endTime = performance.now();
    const elapsedTime = ((endTime - startTime) / 1000).toFixed(3);
    embed.setFooter({text: 'recap generated in ' + elapsedTime + 's'})
    
    // console.log('before client.channels.get ', client.channels.cache.get(outputChannel));
    await client.channels.cache.get(outputChannel).send({embeds: [embed]});
    // 20k and pb alerts 
  } catch (error) {
    console.log(error)
  }
}



const handleInteractionGetAllTimeStats = async (interaction, user) => {
  const outputChannel = (process.env.NODE_ENV === 'production') ? process.env.GENERAL_CHANNEL_ID : process.env.TEST_CHANNEL_ID;
  const startTime = performance.now();

  try {
    let playerNameArg = '';
    for (let playerName in discordUsernameObj) {
      if (discordUsernameObj[playerName] === user) playerNameArg = playerName
    }
    const allTimeStats = getAllTimeStats(playerNameArg);

    const randomTroll = ['seasoned veteran of', 'experienced explorer with', 'impressive consistency of' ]
  
    const embed = new EmbedBuilder()
      .setTitle(`let's scope out your all time stats, ***${playerNameArg}*** : `)
      .setDescription(` <@${user}>, a ${getRandomWord(randomTroll)} ***${allTimeStats.gamesPlayed}*** games `)
      .setColor('Orange')
    // Iterate over the data and add fields dynamically

    const top3rate = (allTimeStats.topThree*100/allTimeStats.gamesPlayed).toFixed(1) + '%'
    const countryRightStr = allTimeStats.correctCountries + ' / ' + (allTimeStats.gamesPlayed*5);
    // console.log('about to top, ', allTimeStats)
    const {topCountries, troubleCountries} = topAndBottomCountries(allTimeStats.countryStats, allTimeStats.gamesPlayed, 5);

    const maxLengthTop = Math.max(...topCountries.map(countryObj => countryCodeDict[countryObj.country].length));
    let topCountriesStr = '';
    topCountries.forEach(countryObj => {
      const countryName = countryCodeDict[countryObj.country];
      const padding = '-'.repeat(maxLengthTop - countryName.length + 2); // Adjust padding as needed
      topCountriesStr += `📍 \`${countryName} ${padding} ${countryObj.right} / ${countryObj.total} -- ${countryObj.percentage}%\`\n`;
    });
    const maxLengthBot = Math.max(...troubleCountries.map(countryObj => countryCodeDict[countryObj.country].length));
    let bottomCountriesStr = '';
    troubleCountries.forEach(countryObj => {
      const countryName = countryCodeDict[countryObj.country];
      const padding = '-'.repeat(maxLengthBot - countryName.length + 2); // Adjust padding as needed
      bottomCountriesStr += `😈 \`${countryName} ${padding} ${countryObj.right} / ${countryObj.total} -- ${countryObj.percentage}%\`\n`;
    });

    const fields = [];
    fields.push(
      { name: 'average score', value: `🎲 ${allTimeStats.averageScore}`, inline: true},
      { name: 'wins', value: `👑 ${allTimeStats.wins}`, inline: true},
      { name: 'top 3', value: `🏆 ${allTimeStats.topThree}, **${top3rate}**`, inline: true},
      { name: 'average rank', value: `🥇 ${allTimeStats.averageRank}`, inline: true},
      { name: 'average distance', value: `🚃 ${allTimeStats.averageDistance} km`, inline: true},
      // { name: 'games', value: allTimeStats.gamesPlayed.toString(), inline: true},
      { name: 'personal best', value: `🚴 ${allTimeStats.personalBestScore}`, inline: true},
      { name: 'countries', value: `🌎 ${countryRightStr}`, inline: true},
      { name: 'best round', value: `🎖 ${allTimeStats.personalBestRound}`, inline: true},
      { name: 'best guess', value: `🙌 ${allTimeStats.allTimeBestGuess} km in ${extractCountryNameFromAddress(allTimeStats.allTimeBestGuessAddress)}`, inline: true},
      { name: 'furthest guess', value: `😈 ${allTimeStats.allTimeWorstGuess} km`, inline: true},
      { name: 'daily shoutouts', value: `best: ${allTimeStats.bestGuessOfTheDay}, furthest: ${allTimeStats.worstGuessOfTheDay}`, inline: true},

      { name: `🤯 you are killing it when we are in: 🤯`, value: topCountriesStr},
      { name: `😈 you get trolled by these countries: 😈`, value: bottomCountriesStr}

    );
    embed.addFields(fields);

    // end performance 
    const endTime = performance.now();
    const elapsedTime = ((endTime - startTime) / 1000).toFixed(3);
    embed.setFooter({text: 'stats generated in ' + elapsedTime + 's'})
  
    await client.channels.cache.get(outputChannel).send({embeds: [embed]});
    
    // ask if they wanna see a chart 
    const countries = new ButtonBuilder()
      .setCustomId('countries')
      .setLabel('🌍 countries')
    .setStyle(ButtonStyle.Primary);
    const countriesSorted = new ButtonBuilder()
      .setCustomId('countries-sorted')
      .setLabel('🌎 countries (grouped by regions)')
      .setStyle(ButtonStyle.Primary);
    const regions = new ButtonBuilder()
      .setCustomId('regions')
      .setLabel('🗺️ regions')
      .setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder()
      .addComponents(countries, countriesSorted, regions);

    
    
    const discordID = discordUsernameObj[playerNameArg];
    if (!discordID) interaction.reply('`sorry, user not found... please check again`')
    
    const contentPlayer = `would you like to see a more detailed region guessing breakdown for <@${discordID}>?`;
    const response = await interaction.reply({
      content: contentPlayer,
      components: [row],
    });

    // await createChart('Z', '4-2024', interaction);
    const collectorFilter = i => i.user.id === interaction.user.id;

    const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });
    if (confirmation) {
      row.components.map((button) => {
        return button.setDisabled(true);
      });
      await interaction.editReply({ content: "you chose to see a chart of: " + confirmation.customId, components: [row] });
      await createCountryBarChart(playerNameArg, discordUsernameObj, client, confirmation.customId, false, null);
    }
}
  catch(error) {
    console.log(error)
  }

}


 


const twentyKAlert = async (interaction, playerName) => {
  try {
    const channelID = (process.env.NODE_ENV === 'production') ? process.env.GENERAL_CHANNEL_ID : process.env.TEST_CHANNEL_ID;
    const discordID = discordUsernameObj[playerName];
    const gifURL = 'https://media.tenor.com/bCWhbbjF8dwAAAAM/poggers-pepe.gif';
    const message = `🚨🚨🚨20k alert🚨🚨🚨\n congrats ${playerName} aka <@${discordID}> on breaking 20k!\n${gifURL}`
    await client.channels.cache.get(channelID).send(message);
    // await client.channels.cache.get(channelID).send({ files: [gifURL] });
  } catch (error) {
    console.log(error)
  }
}


const pbAlert = async (interaction, playerName, newScore, oldScore) => {
  try {
    const channelID = (process.env.NODE_ENV === 'production') ? process.env.GENERAL_CHANNEL_ID : process.env.TEST_CHANNEL_ID;
    const discordID = discordUsernameObj[playerName];
    const user = client.users.cache.get(discordID);

    const gifURL = 'https://media.tenor.com/bCWhbbjF8dwAAAAM/poggers-pepe.gif';
    const message = `🚨🚨🚨new PB alert🚨🚨🚨\n congrats <@${discordID}> on beating their old record of${oldScore} with a new PB of ${newScore}!\n${gifURL}`;
    
    await client.channels.cache.get(channelID).send(message);
  } catch(error) {
    console.log(error)
  }
}




// handle interaction of my monthly chart 
const handleMyMonthlyChart = async (interaction, userId, monthStr) => {
  const channelID = (process.env.NODE_ENV === 'production') ? process.env.GENERAL_CHANNEL_ID : process.env.TEST_CHANNEL_ID;


  const score = new ButtonBuilder()
    .setCustomId('score')
    .setLabel('🌍 score')
    .setStyle(ButtonStyle.Primary);
  const distance = new ButtonBuilder()
    .setCustomId('distance')
    .setLabel('🚎 distance')
    .setStyle(ButtonStyle.Secondary);
  const rank = new ButtonBuilder()
    .setCustomId('rank')
    .setLabel('🏆 rank')
    .setStyle(ButtonStyle.Secondary);
  const country = new ButtonBuilder()
    .setCustomId('country')
    .setLabel('📍 country')
    .setStyle(ButtonStyle.Secondary);
  const row = new ActionRowBuilder()
    .addComponents(score, distance, rank, country);

  const response = await interaction.reply({
    content: `pick a stat you would like to see a chart of:`,
    components: [row],
  });


  let playerNameArg = '';
  for (let playerName in discordUsernameObj) {
    if (discordUsernameObj[playerName] === userId) playerNameArg = playerName
  }
  const discordID = discordUsernameObj[playerNameArg];
  const dateStr = getDateStr(); 
  let monthStrArg = monthStr;
  if (!monthStr) monthStrArg = dateStrToMonthStr(dateStr);

  const response2 = await interaction.fetchReply(); 

  try {
    // await createChart('Z', '4-2024', interaction);
    const collectorFilter = i => i.user.id === interaction.user.id;

    const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });
    if (confirmation) {
      row.components.map((button) => {
        return button.setDisabled(true);
      });
      await interaction.editReply({ content: "you chose to see a chart of: " + confirmation.customId, components: [row] });
    }

	  if (confirmation.customId === 'score') {
	    await createChart(playerNameArg, discordID, monthStrArg, 'score', 'totalScore', client);
    } else if (confirmation.customId === 'rank') {
      await createChart(playerNameArg, discordID, monthStrArg, 'rank', 'rank', client);
    } else if (confirmation.customId === 'distance') {
      await createChart(playerNameArg, discordID, monthStrArg, 'distance', 'totalDistance', client);
    } else if (confirmation.customId === 'country') {
      await createChart(playerNameArg, discordID, monthStrArg, 'countries', 'countryRight', client);
    } 

    // await client.channels.cache.get(channelID).send('testing');
  } catch(error) {
    console.log(error)
  }
}



const handleAllTimeCountryChart = async(interaction, userId, forAll) => {
  const countries = new ButtonBuilder()
    .setCustomId('countries')
    .setLabel('🌍 countries')
    .setStyle(ButtonStyle.Primary);
  const countriesSorted = new ButtonBuilder()
    .setCustomId('countries-sorted')
    .setLabel('🌎 countries (grouped by regions)')
    .setStyle(ButtonStyle.Primary);
  const regions = new ButtonBuilder()
    .setCustomId('regions')
    .setLabel('🗺️ regions')
    .setStyle(ButtonStyle.Primary);
  const row = new ActionRowBuilder()
    .addComponents(countries, countriesSorted, regions);

    
    
    let playerNameArg = '';
    for (let playerName in discordUsernameObj) {
      if (discordUsernameObj[playerName] === userId) playerNameArg = playerName
    }
    const discordID = discordUsernameObj[playerNameArg];
    if (!discordID) interaction.reply('`sorry, user not found... please check again`')
    
    const contentPlayer = `pick a chart to generate for <@${discordID}>:`;
    const contentAll = 'pick a chart to generate for the whole server'
    const response = await interaction.reply({
      content: forAll ? contentAll : contentPlayer,
      components: [row],
    });

  const response2 = await interaction.fetchReply(); 

  try {
    // await createChart('Z', '4-2024', interaction);
    const collectorFilter = i => i.user.id === interaction.user.id;

    const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });
    if (confirmation) {
      row.components.map((button) => {
        return button.setDisabled(true);
      });
      await interaction.editReply({ content: "you chose to see a chart of: " + confirmation.customId, components: [row] });
    }
    if (forAll) {
      await createCountryBarChart(null, discordUsernameObj, client, confirmation.customId, true, null);
      return
    }
    await createCountryBarChart(playerNameArg, discordUsernameObj, client, confirmation.customId, false, null);

    // await client.channels.cache.get(channelID).send('testing');
  } catch(error) {
    console.log(error)
  }

}








// generate file for matching date to challenge url 
const createHistoryObject = async (interaction) => {
  console.log('inside createHistoryObject...'); 
  // Check if the file exists
  if (Object.keys(challengeLinksHistory).length !== 0) {
    console.error('File does not exist');
    interaction.reply('file already exists, cannot overwrite')
    return;
  }
  const outputChannel = (process.env.NODE_ENV === 'production') ? process.env.GENERAL_CHANNEL_ID : process.env.TEST_CHANNEL_ID;
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

  fs.writeFile('challengeLinksHistory.js', `module.exports = ${JSON.stringify(historyObject, null, 2)};`, err => {
    if (err) {
        console.error('Error writing to file:', err);
        return;
    } else {
        console.log('Message history object saved to challengeLinksHistory.js');
    }
  });
  await client.channels.cache.get(outputChannel).send('successfully created challengeLinksHistory.js in root directory');
};










// Cron job 
// const schedule = '0 16 * * *';
const schedule = '0 9 * * *';


// Schedule the task
cron.schedule(schedule, async () => {
  // const dailyLink = await generateDailyChallengeLink();

  // const date = getDateStr();
  // const channelID = process.env.TEST_CHANNEL_ID; 

  // await client.channels.cache.get(channelID).send(dailyLink);
  // await client.channels.cache.get(channelID).send(`here's the daily challenge for ${date}, glhf! @everyone      (generated with cron job)` );
  console.log('Running scheduled task...');
  const update = await updatePreviousGames();
  const daily = await handleInteractionDailyChallenge();
  const prevDate = getDateStr(undefined, true); 
  const recap = await handleInteractionDailyScoreOf(undefined, prevDate);
});










// util functions 
const getDateStr = (date, prevDay=false) => {
  let currentDate = date;
  
  if (!date) {
    currentDate = new Date();
    if (prevDay) {
      // Subtract 1 day to get the previous day
      currentDate.setDate(currentDate.getDate() - 1);
    }
  }

  // Get the day, month, and year
  const day = currentDate.getDate();
  const month = currentDate.getMonth() + 1; // Month is zero-based, so add 1
  const year = currentDate.getFullYear();

  return `${month}-${day}-${year}`;
};

const dateStrToMonthStr = (str) => {
  const parts = str.split('-'); // Split the string by the hyphen character
  const monthYearString = `${parts[0]}-${parts[2]}`;
  return monthYearString
}

const getRandomWord = (array) => {
  // Generate a random index between 0 and 2 (inclusive)
  const randomIndex = Math.floor(Math.random() * array.length);
  // Return the word at the random index
  return array[randomIndex];
}


function topAndBottomCountries(countryStats, gamesPlayed, returnRows) {
  console.log('topAndBottomCountries', countryStats);
  const filterThreshhold = gamesPlayed/11
  const filteredStats = Object.entries(countryStats)
    .filter(([country, stats]) => stats.total > filterThreshhold);
  const countriesWithPercentage = filteredStats.map(([country, stats]) => {
      const percentage = Number(((stats.right / stats.total) * 100).toFixed(1));
      const right = stats.right
      const total = stats.total
      return { country, percentage, right, total};
  });

  // Sort countries by percentage of correct answers
  const sortedByPercentage = countriesWithPercentage.sort((a, b) => b.percentage - a.percentage);

  // Get the top 3 countries with the highest percentage of correct answers
  const topCountries = sortedByPercentage.slice(0, returnRows);

  // Get the top 3 countries with the lowest percentage of correct answers
  const troubleCountries = sortedByPercentage.sort((a, b) => {
    if (a.percentage !== b.percentage) {
        return a.percentage - b.percentage;
    } else {
        // If percentage is the same, use the total as tiebreaker
        return b.total - a.total;
    }
  }).slice(0, returnRows);
  console.log(topCountries, troubleCountries)

return { topCountries, troubleCountries };
}


function extractCountryNameFromAddress(address) {
  const addressParts = address.split(',');
  const countryName = addressParts[addressParts.length - 1].trim();

  return countryName;
}