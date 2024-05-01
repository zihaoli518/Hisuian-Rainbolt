require('dotenv').config();
const fs = require('fs');
const fetch = require('node-fetch');
const challengeScoreHistory = require('../challengeScoreHistory.js');
const getAllTimeStats = require ('./getAllTimeStats.js');
const { Client, IntentsBitField, EmbedBuilder, AttachmentBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");

const countryCodeDict = require('./utils/countryCodes.js');
const regionCountryCodes = require('./utils/regionCountryCodes.js');


// const missing = {}
// for (let key in countryCodeDict) {
//   let exist = false;
//   for (let regionName in regionCountryCodes) {
//     const region = regionCountryCodes[regionName]
//     if (region[key]) {
//       exist = true;
//       break;
//     } else {
//       if (missing[key]) break;
//     }
//   }
//   if (!exist) missing[key] = true;
// }
// console.log(Object.keys(missing))
// console.log(Object.keys(missing).length)


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
const createCountryBarChart = async (playerName, discordID, client, CountryOrRegion) => {
  console.log('inside createCountryBarChart...', playerName);
  const channelID = (process.env.NODE_ENV === 'production') ? process.env.GENERAL_CHANNEL_ID : process.env.TEST_CHANNEL_ID;
  if (CountryOrRegion==='region') {
    await createRegionBarChart(playerName, discordID, client, channelID)
    return
  }
  const startTime = performance.now();
  
  const labels = [];
  const right = [];
  const wrong = [];

  const allTimeStats = getAllTimeStats(playerName);
  const countryStats = allTimeStats.countryStats; 
  console.log(countryStats);
  
  const arrayOfObjects = Object.entries(countryStats).map(([country, data]) => ({
    country,
    ...data,
  }));
  
  // Sort the array by the 'total' property in descending order
  const countryStatsRanked = arrayOfObjects.sort((a, b) => b.total - a.total);
  // console.log(countryStatsRanked)

  const maxCountries = 20; 
  for (let i=0; i<=maxCountries; i++) {
    const currentCountryCode = countryStatsRanked[i].country;
    const currentObj = countryStats[currentCountryCode];
    const currentName = countryCodeDict[currentCountryCode];
    console.log(currentCountryCode, currentObj)
    labels.push(currentName); 
    right.push(currentObj.right);
    wrong.push(currentObj.wrong);
  }


  chartEmbed = new EmbedBuilder()
    .setTitle('all time country breakdown: ' + playerName )
    .setColor('Yellow');
    chartEmbed.setImage("attachment://graph.png");

  // Generate your graph & get the picture as response
  const attachment = await generateCanva(labels, right, wrong, playerName);

  // Reply to server / channel you  want passing MessageEmbed & messageAttachment objects
  const endTime = performance.now();
  const elapsedTime = ((endTime - startTime) / 1000).toFixed(3);
  chartEmbed.setFooter({text: 'chart generated in ' + elapsedTime + 's'});

  await client.channels.cache.get(channelID).send({ embeds: [chartEmbed], files: [attachment],});
};




const createRegionBarChart = async(playerName, discordID, client, channelID) => {
  console.log('inside createRegionBarChart...', playerName);
  const startTime = performance.now();

  const labels = [];
  const right = [];
  const wrong = [];

  const allTimeStats = getAllTimeStats(playerName);
  const countryStats = allTimeStats.countryStats; 
  console.log(countryStats);
  
  const arrayOfRegions = Object.keys(regionCountryCodes);
  const regionStats = arrayOfRegions.reduce((obj, region) => {
    obj[region] = {right: 0, wrong: 0, total: 0}; // Initialize each region with an empty object
    return obj;
  }, {}); // Start with an empty object
  // ADD UP and calculate region stats
  for (let code in countryStats) {
    const countryObj = countryStats[code]; 
    for (let region of arrayOfRegions) {
      console.log(region)
      if (regionCountryCodes[region][code]) {
        regionStats[region].right += countryObj.right;
        regionStats[region].wrong += countryObj.wrong;
        regionStats[region].total += countryObj.total;

      }
    }
  }
  const arrayOfObjects = Object.entries(regionStats).map(([region, data]) => ({
    region,
    ...data,
  }));
  // Sort the array by the 'total' property in descending order
  const regionStatsRanked = arrayOfObjects.sort((a, b) => b.total - a.total);
  console.log(regionStatsRanked)


  for (let i=0; i<regionStatsRanked.length; i++) {
    const currentRegion = regionStatsRanked[i];
    // const currentObj = currentRegion[currentCountryCode];
    const currentName = currentRegion.region;
    // console.log(currentCountryCode, currentObj);
    labels.push(currentName); 
    right.push(currentRegion.right);
    wrong.push(currentRegion.wrong);
  }


  chartEmbed = new EmbedBuilder()
    .setTitle('all time region guessing breakdown: ' + playerName )
    .setColor('Orange');
    chartEmbed.setImage("attachment://graph.png");

  // Generate your graph & get the picture as response
  const attachment = await generateCanva(labels, right, wrong, playerName);

  // Reply to server / channel you  want passing MessageEmbed & messageAttachment objects
  const endTime = performance.now();
  const elapsedTime = ((endTime - startTime) / 1000).toFixed(3);
  chartEmbed.setFooter({text: 'chart generated in ' + elapsedTime + 's'});

  await client.channels.cache.get(channelID).send({ embeds: [chartEmbed], files: [attachment],});
}



// This function will return MessageAttachment object from discord.js
const generateCanva = async (labels, right, wrong, playerName, CountryOrRegions) => {
  const renderer = new ChartJSNodeCanvas({ width: 2400, height: 1000 });
  const image = await renderer.renderToBuffer({
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          // label: `${playerName}'s Monthly ${statStr}`,
          data: right,
          // backgroundColor: "rgba(75, 192, 192, 0.2)", // Light greenish-blue with some transparency
          backgroundColor: "rgb(179, 255, 174)",
          borderColor: "rgb(179, 255, 174)", // Matching border color for the line
          borderWidth: 2, // Thicker line for better visibility
        },
        {
          // label: "Server Average",
          data: wrong,
          backgroundColor: "red", 
          borderColor: "rgb(255, 100, 100)", // Matching border color for the line
          borderWidth: 2, // Thicker line for better visibilit
        },
      ],
    },
    options: {
      scales: {
        y: {
          stacked:true, 
          // min: minY[statStr],
          // max: maxY[statStr],
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
          stacked:true, 
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
          display: false, // Show the legend
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


module.exports = createCountryBarChart;
