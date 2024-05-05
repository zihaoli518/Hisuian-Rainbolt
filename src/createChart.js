require('dotenv').config();
const fs = require('fs');
const fetch = require('node-fetch');
const challengeScoreHistory = require('../challengeScoreHistory.js');
const generateMonthlyStats = require ('./generateMonthlyStats.js');
const { Client, IntentsBitField, EmbedBuilder, AttachmentBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
let chartEmbed = {};


// global parameters
const minY = {
  totalScore: 0,
  rank: 1,
  totalDistance: 0,
  countryRight: 0,
}

const maxY = {
  totalScore: 25000,
  rank: 8, 
  totalDistance: 30000,
  countryRight: 5,
}


// input: (playerName, monthStr) 
// output: send a chart to general channel 
const createChart = async (playerName, discordID, monthStr, statLabel, statStr, client) => {
  console.log('inside createChart...', playerName, monthStr);
  const startTime = performance.now();

  let labels = [];
  let data = [];
  let average = [];

  let currentTotalScore = 0;
  let currentTotalDistance = 0;
  let currentTopThree = 0;
  let currentTotalCountries = 0;
  let currentGamesPlayed = 0; 

  // populate labels and data 
  // each loop here is a day 
  for (let i=1; i<=31; i++) {
    let dailyTotalScore = 0;
    let dailyTotalDistance = 0;
    let dailyTotalCountries = 0;
    let dailyPlayers = 0;
    let splitArray = monthStr.split('-');
    const dateStr = splitArray[0] + '-' + i + '-' + splitArray[1];
    console.log('checking dateStr... ', dateStr, !challengeScoreHistory[dateStr])
    if (!challengeScoreHistory[dateStr]) continue;
    const rankingArray = challengeScoreHistory[dateStr].ranking;
    labels.push(dateStr);
    let pushNull = true;
    // each loop here is a player 
    for (let object of rankingArray) {
      dailyPlayers++;
      dailyTotalScore += object.totalScore;
      dailyTotalDistance += object.totalDistance;
      dailyTotalCountries += object.countryRight;
      if (object.playerName===playerName) {
        pushNull = false; 
        data.push(object[statStr]);
        currentGamesPlayed++;
        currentTotalScore += object.totalScore;
        currentTotalDistance += object.totalDistance;
        currentTotalCountries += object.countryRight;
        if (object.rank <= 3) currentTopThree++;
        break
      }
    }
    if (pushNull) data.push(null)

    if (statStr === 'totalScore') average.push((dailyTotalScore/dailyPlayers).toFixed(1));
    if (statStr === 'totalDistance') average.push((dailyTotalDistance/dailyPlayers).toFixed(1));
    if (statStr === 'countryRight') average.push((dailyTotalCountries/dailyPlayers).toFixed(1));
  }


  // Create MessageEmbed passing options you want
  chartEmbed = new EmbedBuilder()
    .setTitle('monthly ' + statLabel + ' chart & stats for ' + playerName )
    .setColor('Yellow');
    chartEmbed.setImage("attachment://graph.png");

  // add other stats from previous month 
  const prevMonthStr = getPreviousMonth(monthStr);
  const prevMonthStats = await generateMonthlyStats(playerName, prevMonthStr);

  const currentAverageScore = (currentTotalScore / currentGamesPlayed).toFixed(1);
  const averageChangeScore = (((currentAverageScore - prevMonthStats.monthlyAverage) / currentAverageScore)*100).toFixed(1);
  const averageChangeScoreStr = (averageChangeScore>0) ? '+'+averageChangeScore+'% 📈' : averageChangeScore+'% 📉'

  const currentAverageCountries = (currentTotalCountries / currentGamesPlayed).toFixed(1);
  const averageChangeCountries = (((currentAverageCountries - prevMonthStats.averageCountries) / currentAverageCountries)*100).toFixed(1);
  const averageChangeCountriesStr = (averageChangeCountries>0) ? '+'+averageChangeCountries+'% 📈' : averageChangeCountries+'% 📉';

  const currentAverageDistance = (currentTotalDistance/ currentGamesPlayed).toFixed(1);
  const averageChangeDistance = (((currentAverageDistance - prevMonthStats.distance) / currentAverageDistance)*100).toFixed(1);
  const averageChangeDistanceStr = (averageChangeDistance>0) ? '+'+averageChangeDistance+'% 📉' : averageChangeDistance+'% 📈';


  const currenTopThreeRate = (currentTopThree * 100 / currentGamesPlayed).toFixed(1);
  const prevTopThreeRate = (prevMonthStats.topThree * 100 / prevMonthStats.gamesPlayed);
  const topThreeRateChange = (currenTopThreeRate - prevTopThreeRate).toFixed(1);
  const topThreeRateChangeStr = (topThreeRateChange>0) ? '+'+topThreeRateChange+'% 📈' : topThreeRateChange+'% 📉';


  const fields = [];
  fields.push(
    { name: 'monthly average & % change from last month', value: `for our glorious <@${discordID}> - with ${currentGamesPlayed} games in ${monthStr}`, inline: false},

    { name: 'score', value: `🎲 ${currentAverageScore} ----------  **${averageChangeScoreStr}**`, inline: false},
    { name: 'countries', value: `📍 ${currentAverageCountries} --------------  **${averageChangeCountriesStr}**`, inline: false},
    { name: 'distance', value: `🚃 ${currentAverageDistance}km ------  **${averageChangeDistanceStr}**`, inline: false},
    { name: 'top 3 rate', value: `🏆 ${currenTopThreeRate}% ----------  **${topThreeRateChangeStr}**`, inline: false},
  );
  chartEmbed.addFields(fields);

  // Generate your graph & get the picture as response
  const attachment = await generateCanva(labels, data, statStr, average, playerName);

  // Reply to server / channel you  want passing MessageEmbed & messageAttachment objects
  const channelID = (process.env.NODE_ENV === 'production') ? process.env.GENERAL_CHANNEL_ID : process.env.TEST_CHANNEL_ID;
  const endTime = performance.now();
  const elapsedTime = ((endTime - startTime) / 1000).toFixed(3);
  chartEmbed.setFooter({text: 'chart generated in ' + elapsedTime + 's'});

  await client.channels.cache.get(channelID).send({ embeds: [chartEmbed], files: [attachment],});
};



// This function will return MessageAttachment object from discord.js
const generateCanva = async (labels, datas, statStr, average, playerName) => {
  const renderer = new ChartJSNodeCanvas({ width: 2400, height: 1000 });
  const image = await renderer.renderToBuffer({
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: `${playerName}'s Monthly ${statStr}`,
          data: datas,
          // backgroundColor: "rgba(75, 192, 192, 0.2)", // Light greenish-blue with some transparency
          backgroundColor: "rgb(255, 99, 132)",
          borderColor: "rgb(255, 99, 132)", // Matching border color for the line
          borderWidth: 3, // Thicker line for better visibility
          pointBackgroundColor: "rgb(255, 99, 132)", // Bright red for data points
          pointBorderColor: "rgb(255, 99, 132)",
          pointRadius: 5, // Increase point size
          fill: false, // Fill the area below the line with the background color
          spanGaps: true,
          tension: 0,
        },
        {
          label: "Server Average",
          data: average,
          backgroundColor: "rgba(71, 118, 125)", 
          borderColor: "rgba(71, 118, 125)", // Matching border color for the line
          borderWidth: 2, // Thicker line for better visibility
          pointBackgroundColor: "rgba(71, 118, 125)", // Bright red for data points
          pointBorderColor: "rgba(71, 118, 125)",
          pointRadius: 5, // Increase point size
          fill: false, // Fill the area below the line with the background color
        },
      ],
    },
    options: {
      scales: {
        y: {
          min: minY[statStr],
          max: maxY[statStr],
          grid: {
            color: "rgba(192, 192, 192, 0.5)", // Light grey for grid lines
          },
          ticks: {
            color: "rgb(75, 192, 192)", // Matching color for axis labels
            font: {
              size: 35
            }
          },
        },
        x: {
          grid: {
            color: "rgba(192, 192, 192, 0.5)", // Light grey for grid lines
          },
          ticks: {
            color: "rgb(75, 192, 192)", // Matching color for axis labels
            font: {
              size: 25
            }
          },
          
        },
      },
      plugins: {
        legend: {
          display: true, // Show the legend
          padding: 50,
          labels: {
            // color: "rgb(75, 192, 192)", // Matching color for legend text,
            color: "rgba(71, 118, 125)",
            font: {
              size: 80
            }
          },
        },
      },
    },
  });
  return new AttachmentBuilder(image, {name:"graph.png"});
};



// utils functions 
const dateStrToMonthStr = (str) => {
  const parts = str.split('-'); // Split the string by the hyphen character
  const monthYearString = `${parts[0]}-${parts[2]}`;
  return monthYearString
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


module.exports = createChart;
