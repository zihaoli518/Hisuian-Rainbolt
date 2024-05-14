require('dotenv').config();
const createMonthlyChartForAll = require('../createMonthlyChartForAll.js');
const createCountryBarChart = require('../createCountryBarChart.js');
const countryGreetings = require('../utils/countryGreetings.js');
const generateMonthlyStats = require ('../generateMonthlyStats.js');
const { EmbedBuilder, AttachmentBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");


// need to break up embed if more players in the future - 25 field limit 
const handleInteractionMonthlyRecap = async(client, interaction, monthStr, discordUsernameObj) => {
   // interaction.reply(`generating daily challenge recap for ${date}... this might take a while`);
   const outputChannel = (process.env.NODE_ENV === 'production') ? process.env.GENERAL_CHANNEL_ID : process.env.TEST_CHANNEL_ID;
   console.log('insidehandleInteractionMonthlyRecap ', process.env.NODE_ENV, (process.env.NODE_ENV === 'production'))

   if (interaction) interaction.reply('`generating monthly recap...`');
   else {
     await client.channels.cache.get(outputChannel).send('`generating monthly recap...`' );
   }


 
   try {
     const currentMonthEmbedStats = await getEmbedStats(monthStr, recurse=true);
     console.log('getEmbedStats done! ')

     // console.log('before client.channels.get ', client.channels.cache.get(outputChannel));
     await client.channels.cache.get(outputChannel).send({embeds: [currentMonthEmbedStats.embed]});

    //  attach charts 
     await createMonthlyChartForAll(client, interaction, monthStr, discordUsernameObj);
     await createCountryBarChart(null, discordUsernameObj, client, 'countries', true, monthStr);
     await createCountryBarChart(null, discordUsernameObj, client, 'regions', true, monthStr);
   } catch (error) {
     console.log(error)
   }


   async function getEmbedStats(monthStr, recurse) {
     const startTime = performance.now();
    // build embed to be send to channel 
    const embed = new EmbedBuilder()
      .setTitle('📅 monthly recap for: ' + monthStr)
      .setDescription('thanks for playing @everyone !')
      .setColor('Purple')
    // Iterate over the data and add fields dynamically
    let allFields = [];
    const serverFields = [];
    const playerFields = [];

    let monthlyScoreTotal = 0;
    let monthlyDistanceTotal = 0; 
    let monthlyCountriesTotal = 0;
    let monthlyRegionsTotal = 0; 
    let monthlyGamesTotal = 0;

    let monthlyHighScore = {score: 0, playerName: '', }; 
    let bestGuess = {distance: Infinity, address: ''};
    let mostImproved = {
      gamesPlayed: {change: 0, playerName: ''},
      score: {change: 0, playerName: ''},
      distance: {change: 0, playerName: ''},
      countries: {change: 0, playerName: ''},
      regions: {change: 0, playerName: ''},
    }
    const topScores = [];

    let rankNeedSort= [];


    for (playerName in discordUsernameObj) {
      console.log('for (playerName in discordUsernameObj)... ', playerName, monthStr, )
      try {
        const monthlyStats = await generateMonthlyStats(playerName, monthStr);
        const prevMonthlyStats = await generateMonthlyStats(playerName, getPreviousMonth(monthStr));

        let wins = monthlyStats.wins;
        let top3 = monthlyStats.topThree;
        let games = monthlyStats.gamesPlayed;
        const top3Rate = ((top3 / games) * 100).toFixed(1).toString() + "%";
        // console.log('inside the loop of getEmbedStats....', playerName, monthlyScoreTotal, monthlyStats.monthlyAverage * monthlyStats.gamesPlayed)
        if (monthlyStats.gamesPlayed<1) break;
        console.log('debug: ', playerName, monthlyStats.gamesPlayed)
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
        // check if topScores of the month needs to be updated 
        monthlyStats.topScores.forEach(obj => {
          updateTopScores(topScores, obj);
        })
        // check if bestGuess of the month needs to be updated 
        if (monthlyStats.bestGuess.distance < bestGuess.distance) {
          bestGuess.distance = monthlyStats.bestGuess.distance;
          bestGuess.address = monthlyStats.bestGuess.address;
          bestGuess["playerName"] = playerName;
        }
        // check if MIP needs update 

        const changeGamesPlayed = (((monthlyStats.gamesPlayed - prevMonthlyStats.gamesPlayed) / monthlyStats.gamesPlayed)*100).toFixed(1);
        const changeScore = (((monthlyStats.monthlyAverage - prevMonthlyStats.monthlyAverage) / monthlyStats.monthlyAverage)*100).toFixed(1);
        const changeDistance = (((monthlyStats.distance - prevMonthlyStats.distance) / monthlyStats.distance)*100).toFixed(1);
        const changeCountries = (((monthlyStats.averageCountries - prevMonthlyStats.averageCountries) / monthlyStats.averageCountries)*100).toFixed(1);
        const changeRegions = (((monthlyStats.averageRegions - prevMonthlyStats.averageRegions) / monthlyStats.averageRegions)*100).toFixed(1);

        if (changeGamesPlayed!=='NaN' && changeGamesPlayed > mostImproved.gamesPlayed.change) {
          mostImproved.gamesPlayed = { change: changeGamesPlayed, playerName: playerName };
        }
    
        // Check if changeScore is a number before comparing it
        if (changeScore!=='NaN' && changeScore >= mostImproved.score.change && games>1) {
          mostImproved.score = { change: changeScore, playerName: playerName };
        }
      
        // Check if changeDistance is a number before comparing it
        if (changeDistance!=='NaN'  && changeDistance <= mostImproved.distance.change && games>1 ) {
          mostImproved.distance = { change: changeDistance, playerName: playerName };
        }
      
        // Check if changeCountries is a number before comparing it
        if (changeCountries!=='NaN'  && changeCountries >= mostImproved.countries.change && games>1) {
          mostImproved.countries = { change: changeCountries, playerName: playerName };
        }
      
        // Check if changeRegions is a number before comparing it
        if (changeRegions!=='NaN'  && changeRegions >= mostImproved.regions.change && games>1) {
          mostImproved.regions = { change: changeRegions, playerName: playerName };
        }


        const field1 = {
          name: `\`${playerName} ----- ${games} games\`` ,
          value: `👑 : **${wins}** W, 🏆 top 3: **${top3}**, **${top3Rate}**, 🎯 high score: **${monthlyStats.monthlyHighScore}**, 🤯 best guess: **${monthlyStats.bestGuess.distance}**km`,
          inline: true,
        };
        const field2 = {
          name: "per game stats",
          value: `🌍 score: **${monthlyStats.monthlyAverage}** 🚎 distance: ${monthlyStats.distance}km 📍 country: **${monthlyStats.averageCountries}**/5📍region: **${monthlyStats.averageRegions}**/5`,
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
          fields: [field1, field2, ]
        });

      } catch (error) {
        console.log(error)
      }
    }
  
    rankNeedSort.sort((a, b) => b.wins - a.wins);
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
    console.log('about to recurse=', recurse)
    if (recurse===false) return ({serverAverageScore: serverAverageScore, serverAverageDistance: serverAverageDistance, serverAverageCountries: serverAverageCountries, serverAverageRegions: serverAverageRegions, monthlyGamesTotal: monthlyGamesTotal})
    else {
      const prevMonthStr = getPreviousMonth(monthStr);
      prevMonthStats = await getEmbedStats(prevMonthStr, recurse=false);
    }  
    // console.log(prevMonthStats)
    
    const changeGames = (((monthlyGamesTotal - prevMonthStats.monthlyGamesTotal) / monthlyGamesTotal)*100).toFixed(1);
    const changeGamesStr = (changeGames>0) ? '+'+changeGames+'% 📈' : changeGames+'% 📉'
    
    const averageChangeScore = (((serverAverageScore - prevMonthStats.serverAverageScore) / serverAverageScore)*100).toFixed(1);
    const averageChangeScoreStr = (averageChangeScore>0) ? '+'+averageChangeScore+'% 📈' : averageChangeScore+'% 📉'

    const averageChangeDistance = (((serverAverageDistance - prevMonthStats.serverAverageDistance) / serverAverageScore)*100).toFixed(1);
    const averageChangeDistanceStr = (averageChangeDistance<0) ? averageChangeDistance+'% 📈' : '+' +averageChangeDistance+'% 📉'

    const averageChangeCountries = (((serverAverageCountries - prevMonthStats.serverAverageCountries) / serverAverageCountries)*100).toFixed(1);
    const averageChangeCountriesStr = (averageChangeCountries>0) ? '+'+averageChangeCountries+'% 📈' : averageChangeCountries+'% 📉'

    const averageChangeRegions = (((serverAverageRegions - prevMonthStats.serverAverageRegions) / serverAverageRegions)*100).toFixed(1);
    const averageChangeRegionsStr = (averageChangeRegions>0) ? '+'+averageChangeRegions+'% 📈' : averageChangeRegions+'% 📉'



    const serverField1 = { name: `SERVER AVERAGE --- from ${monthlyGamesTotal} games`, value: `🌍 score: **${serverAverageScore}** 🚎 distance: **${serverAverageDistance}**km 📍country: **${serverAverageCountries}**/5 📍region: **${serverAverageRegions}**/5`, inline: true };
    const serverField2 = { name: ` ${changeGamesStr} from ${prevMonthStats.monthlyGamesTotal} games in ${getPreviousMonth(monthStr)},`, value: `🌍 score: **${averageChangeScoreStr}** 🚎 distance: **${averageChangeDistanceStr}** 📍country: **${averageChangeCountriesStr}** 📍region: **${averageChangeRegionsStr}**`};
    const serverField3 = { name: ' ', value: `player stats sorted by: wins` };
    serverFields.push(serverField1, serverField2, serverField3)

    // add daily awards
    const discordIDBest = discordUsernameObj[bestGuess.playerName];
    // const discordIDWorst = discordUsernameObj[worstGuess.playerName];

    
    const goodJob = ['wild guess', 'good shit', 'wow nice', 'holy poggers', 'poggers', 'what a beast!' ];
    const impressive = ['impressive', 'incredible', 'unbelievable', 'insane'];
    const wentCrazy = ['went absolutely crazy @ ', '360 no scoped: ', 'went the f off @ ', 'went bonkers @ '];

    const awardFields = [];
    awardFields.push(
      { name: ' ', value: '📅📅📅📅 **MONTHLY AWARDS** 📅📅📅📅'},
      { name: '🔥🔥🔥🔥 closest guess 🔥🔥🔥🔥', value: ` ${getRandomWord(goodJob)} ${bestGuess.playerName} / <@${discordIDBest}>🥳! an ${getRandomWord(impressive)} guess with only **${bestGuess.distance}km** off 🤯🤯🤯, ${getRandomWord(wentCrazy)} \n${bestGuess.address} 🧭` },
      { name: '🎯 🎯 🎯🎯  high scores 🎯 🎯 🎯🎯 ', value: `**${topScores[0].score}** - ${topScores[0].playerName} - ${topScores[0].date} \n **${topScores[1].score}** - ${topScores[1].playerName} - ${topScores[1].date} \n **${topScores[2].score}** - ${topScores[2].playerName} - ${topScores[2].date}` },
      { name: '🍻🍻🍻🍻 most improved players 🍻🍻🍻🍻', value: `**score**: ${mostImproved.score.playerName} / <@${discordUsernameObj[mostImproved.score.playerName]}> - **+${mostImproved.score.change}**% \n**games**: ${mostImproved.gamesPlayed.playerName} / <@${discordUsernameObj[mostImproved.gamesPlayed.playerName]}>- **+${mostImproved.gamesPlayed.change}**% \n**distance**: ${mostImproved.distance.playerName} / <@${discordUsernameObj[mostImproved.distance.playerName]}>- **${mostImproved.gamesPlayed.change}**% \n **countries**: ${mostImproved.countries.playerName} / <@${discordUsernameObj[mostImproved.countries.playerName]}>- **+${mostImproved.countries.change}**% \n**regions**: ${mostImproved.regions.playerName} / <@${discordUsernameObj[mostImproved.regions.playerName]}>- **+${mostImproved.regions.change}**% \n` },
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

function updateTopScores(topScores, newEntry) {
  // If the topScores array has fewer than 3 elements, simply add the new entry
  if (topScores.length < 3) {
    topScores.push(newEntry);
  } else {
    // Find the lowest score in the array
    const lowestScore = Math.min(...topScores.map((item) => item.score));
    // Replace the lowest score if the new score is higher
    if (newEntry.score > lowestScore) {
      const lowestIndex = topScores.findIndex((item) => item.score === lowestScore);
      topScores[lowestIndex] = newEntry;
    }
  }
  // Sort the array to maintain the top scores in descending order
  topScores.sort((a, b) => b.score - a.score);
}