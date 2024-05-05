require('dotenv').config();
const createMonthlyChartForAll = require('../createMonthlyChartForAll.js');
const countryGreetings = require('../utils/countryGreetings.js');
const generateMonthlyStats = require ('../generateMonthlyStats.js');
const { EmbedBuilder, AttachmentBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");



const handleInteractionMonthlyRecap = async(client, interaction, monthStr, discordUsernameObj) => {
   // interaction.reply(`generating daily challenge recap for ${date}... this might take a while`);
   const outputChannel = (process.env.NODE_ENV === 'production') ? process.env.GENERAL_CHANNEL_ID : process.env.TEST_CHANNEL_ID;
   console.log('insidehandleInteractionMonthlyRecap ', process.env.NODE_ENV, (process.env.NODE_ENV === 'production'))
   // check if date exists in challenge history 
  //  if (!challengeLinksHistory[date]) {
  //    if (interaction) interaction.reply('`oops, the requested date does not exist. check your formatting of the date again, it should be 2-19-2024. or I forgot to post a link that day.`')
  //    return
  //  }
   if (interaction) interaction.reply('`generating monthly recap...`');
   else {
     await client.channels.cache.get(outputChannel).send('`generating monthly recap...`' );
   }

   createMonthlyChartForAll(client, interaction, monthStr, discordUsernameObj);
 
 
   try {
     const currentMonthEmbedStats = await getEmbedStats(monthStr, recurse=true);
     console.log(currentMonthEmbedStats)

     // console.log('before client.channels.get ', client.channels.cache.get(outputChannel));
     await client.channels.cache.get(outputChannel).send({embeds: [currentMonthEmbedStats.embed]});
     // 20k and pb alerts 
   } catch (error) {
     console.log(error)
   }


   async function getEmbedStats(monthStr, recurse) {
     const startTime = performance.now();
    // build embed to be send to channel 
    const embed = new EmbedBuilder()
      .setTitle('monthly recap for: ' + monthStr)
      .setColor('White')
    // Iterate over the data and add fields dynamically
    let allFields = [];
    const serverFields = [];
    const playerFields = [];

    let monthlyScoreTotal = 0;
    let monthlyDistanceTotal = 0; 
    let monthlyCountriesTotal = 0;
    let monthlyRegionsTotal = 0; 
    let monthlyGamesTotal = 0;

    let monthlyHighScore = {score: 0, playerName: ''}; 
    let bestGuess = {distance: Infinity, address: ''}

    let rankNeedSort= [];


    for (playerName in discordUsernameObj) {
      try {
        const monthlyStats = await generateMonthlyStats(playerName, monthStr);

        let wins = monthlyStats.wins;
        let top3 = monthlyStats.topThree;
        let games = monthlyStats.gamesPlayed;
        const top3Rate = ((top3 / games) * 100).toFixed(1).toString() + "%";
        console.log('inside the loop of getEmbedStats....', playerName, monthlyScoreTotal, monthlyStats.monthlyAverage * monthlyStats.gamesPlayed)
        if (monthlyStats.gamesPlayed<1) break;
        // update for server total
        monthlyScoreTotal +=
          monthlyStats.monthlyAverage * monthlyStats.gamesPlayed;
        monthlyGamesTotal += monthlyStats.gamesPlayed;
        monthlyDistanceTotal += monthlyStats.distance * monthlyStats.gamesPlayed;
        monthlyCountriesTotal +=
          monthlyStats.averageCountries * monthlyStats.gamesPlayed;
        monthlyRegionsTotal +=
          monthlyStats.averageRegions * monthlyStats.gamesPlayed;
  
        if (monthlyStats.monthlyHighScore > monthlyHighScore.score) {
          monthlyHighScore.score = monthlyStats.monthlyHighScore;
          monthlyHighScore.playerName = playerName;
        }
  
        if (monthlyStats.bestGuess.distance < bestGuess.distance) {
          bestGuess.distance = monthlyStats.bestGuess.distance;
          bestGuess.address = monthlyStats.bestGuess.address;
          bestGuess["playerName"] = playerName;
        }
  
        const field1 = {
          name: playerName + ` - ${games} games` ,
          value: `🌍 score: ${monthlyStats.monthlyAverage} 🚎 distance: ${monthlyStats.distance}km 📍country: ${monthlyStats.averageCountries}/5 region: ${monthlyStats.averageRegions}/5`,
          inline: true,
        };
        const field2 = {
          name: "🏆 ",
          value: `👑 wins: ${wins}, 🏆 top 3: ${top3}, ${top3Rate}, 💯 high score: ${monthlyStats.monthlyHighScore}, 🤯 best guess: ${monthlyStats.bestGuess.distance}km`,
        };
        // const field3 = {
        //   name: "% change",
        //   value: `coming soon...`,
        // };
        const field4 = { name: ' ', value: ' ' };
  
        rankNeedSort.push({
          playerName: playerName,
          averageScore: monthlyStats.monthlyAverage,
          wins: monthlyStats.wins,
          fields: [field1, field2, field4]
        });

      } catch (error) {
        console.log(error)
      }
    }
  
    rankNeedSort.sort((a, b) => b.averageScore - a.averageScore);
    rankNeedSort.forEach(playerObj => {
      playerObj.fields.forEach(field => {
        playerFields.push(field)
      })
    })

    // calculating server averages 
    const serverAverageScore = (monthlyScoreTotal / monthlyGamesTotal).toFixed(1);
    const serverAverageDistance = (monthlyDistanceTotal / monthlyGamesTotal).toFixed(1);
    const serverAverageCountries = (monthlyCountriesTotal / monthlyGamesTotal).toFixed(1);
    const serverAverageRegions = (monthlyRegionsTotal / monthlyGamesTotal).toFixed(1);

    // handle recurse once 
    let prevMonthStats = {}
    if (recurse===false) return ({serverAverageScore: serverAverageScore, serverAverageDistance: serverAverageDistance, serverAverageCountries: serverAverageCountries, serverAverageRegions: serverAverageRegions, monthlyGamesTotal: monthlyGamesTotal})
    else {
      const prevMonthStr = getPreviousMonth(monthStr);
      prevMonthStats = await getEmbedStats(prevMonthStr, recurse=false);
    }  
    console.log('prevMonthStats')
    console.log(prevMonthStats)
    
    const changeGames = (((monthlyGamesTotal - prevMonthStats.monthlyGamesTotal) / monthlyGamesTotal)*100).toFixed(1);
    const changeGamesStr = (changeGames>0) ? '+'+changeGames+'% 📈' : changeGames+'% 📉'
    
    const averageChangeScore = (((serverAverageScore - prevMonthStats.serverAverageScore) / serverAverageScore)*100).toFixed(1);
    const averageChangeScoreStr = (averageChangeScore>0) ? '+'+averageChangeScore+'% 📈' : averageChangeScore+'% 📉'

    const averageChangeDistance = (((serverAverageDistance - prevMonthStats.serverAverageDistance) / serverAverageScore)*100).toFixed(1);
    const averageChangeDistanceStr = (averageChangeDistance<0) ? averageChangeDistance+'% 📈' : '+' +averageChangeDistance+'% 📉'

    const averageChangeCountries = (((serverAverageCountries - prevMonthStats.serverAverageCountries) / serverAverageCountries)*100).toFixed(1);
    const averageChangeCountriesStr = (averageChangeCountries<0) ? '+'+averageChangeCountries+'% 📈' : averageChangeCountries+'% 📉'

    const averageChangeRegions = (((serverAverageRegions - prevMonthStats.serverAverageRegions) / serverAverageRegions)*100).toFixed(1);
    const averageChangeRegionsStr = (averageChangeRegions<0) ? '+'+averageChangeRegions+'% 📈' : averageChangeRegions+'% 📉'



    const serverField1 = { name: `server average --- from ${monthlyGamesTotal} games`, value: `🌍 score: ${serverAverageScore} 🚎 distance: ${serverAverageDistance}km 📍country: ${serverAverageCountries}/5 region: ${serverAverageRegions}/5`, inline: true };
    const serverField2 = { name: `change from last month --- ${prevMonthStats.monthlyGamesTotal} games ${changeGamesStr},`, value: `🌍 score: ${averageChangeScoreStr} 🚎 distance: ${averageChangeDistanceStr} 📍country: ${averageChangeCountriesStr} region: ${averageChangeRegionsStr}`};
    const serverField3 = { name: ' ', value: `sorted by: average score` };
    serverFields.push(serverField1, serverField2, serverField3)

    // add daily awards
    const discordIDBest = discordUsernameObj[bestGuess.playerName];
    // const discordIDWorst = discordUsernameObj[worstGuess.playerName];

    
    // const aboveAverageStr = aboveAverage.length ? aboveAverage.join(', ') : '.... no one ..... trash seed';
    // best
    const goodJob = ['wild guess', 'good shit', 'wow nice', 'holy poggers', 'poggers', 'what a beast!' ];
    const impressive = ['impressive', 'incredible', 'unbelievable', 'insane'];
    const wentCrazy = ['went absolutely crazy @ ', '360 no scoped: ', 'went the f off @ ', 'went bonkers @ '];
    // worst 
   //  const worstGuessStr1 = [`${countryGreetings[worstGuess.guessCountryCode]}, thanks for trolling ${worstGuess.playerName} aka <@${discordIDWorst}>! an ${getRandomWord(impressive)} ${worstGuess.distance} km off🔥🔥, I can see why you thought it was ${worstGuess.guessCountry} instead of ${worstGuess.correctCountry} tho` ]
   //  const worstGuessStr2 = [`${countryGreetings[worstGuess.guessCountryCode]}, oof ${worstGuess.playerName} aka <@${discordIDWorst}>, an ${getRandomWord(impressive)} ${worstGuess.distance} km off🔥🔥, understandable, ${worstGuess.guessCountry} and ${worstGuess.correctCountry} do look kinda alike` ];
   //  const worstGuessStr3 = [`${countryGreetings[worstGuess.guessCountryCode]}, I feel you ${worstGuess.playerName} aka <@${discordIDWorst}>, 🫡 your guess in ${worstGuess.guessCountry} is ${worstGuess.distance} km away from ${worstGuess.correctCountry}, it happens!` ];
   //  const worstGuessStr4 = [`${countryGreetings[worstGuess.guessCountryCode]}, apparently ${worstGuess.playerName} aka <@${discordIDWorst}>, thinks ${worstGuess.correctCountry} looks like ${worstGuess.guessCountry}, which is reasonable 🫡, but it's ${worstGuess.distance} km away unfortunately` ];
   //  const worstGuessStr = [];
    // worstGuessStr.push(worstGuessStr1, worstGuessStr2, worstGuessStr3, worstGuessStr4)
    const awardFields = [];
    awardFields.push(
      { name: ' ', value: '📅📅📅📅 MONTHLY AWARDS📅📅📅📅'},
      { name: '🔥🔥🔥🔥🔥 best guess of the month 🔥🔥🔥🔥🔥', value: ` ${getRandomWord(goodJob)} ${bestGuess.playerName} aka <@${discordIDBest}>🥳! an ${getRandomWord(impressive)} guess with only ${bestGuess.distance} km off 🤯🤯🤯, ${getRandomWord(wentCrazy)} \n||${bestGuess.address}|| 🧭` },
     //  { name: '😈😈😈😈😈 furthest guess of the month 😈😈😈😈😈', value: `${getRandomWord(worstGuessStr)}` },
     //  { name: 'congrats on beating your previous monthly average!', value: aboveAverageStr }
    );

  
    allFields = serverFields.concat(playerFields, awardFields);
    // console.log(allFields)
    // console.log(monthlyScoreTotal, monthlyGamesTotal)
    // console.log(serverAverageScore, serverAverageCountries)
    // console.log(averageChangeScore, averageChangeScoreStr)
    // if (field1.value && field1.name) {
    //   embed.addFields(field1);
    // }


    embed.addFields(allFields);
    
    
    const endTime = performance.now();
    const elapsedTime = ((endTime - startTime) / 1000).toFixed(3);
    embed.setFooter({text: 'recap generated in ' + elapsedTime + 's'})
    return ({embed: embed, serverAverageScore: serverAverageScore, serverAverageDistance: serverAverageDistance, serverAverageCountries: serverAverageCountries, serverAverageRegions: serverAverageRegions, monthlyGamesTotal: monthlyGamesTotal})
    
   }

 
}


module.exports = handleInteractionMonthlyRecap;







// utils

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

function getPreviousMonth(monthYearStr) {
  const parts = monthYearStr.split('-');
  let month = parseInt(parts[0]);
  let year = parseInt(parts[1]);

  // If the current month is January, roll back to December of the previous year
  if (month === 1) {
    month = 12;
    year -= 1;
  } else {
    month -= 1;
  }

  // Return in the same format 'month-year'
  return `${month}-${year}`;
}