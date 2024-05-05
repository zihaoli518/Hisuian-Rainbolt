require('dotenv').config();
const fs = require('fs');
const fetch = require('node-fetch');
const challengeScoreHistory = require('../challengeScoreHistory.js');
const getAllTimeStats = require ('./getAllTimeStats.js');
const { Client, IntentsBitField, EmbedBuilder, AttachmentBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const ChartDataLabels = require('chartjs-plugin-datalabels');


const countryCodeDict = require('./utils/countryCodes.js');
const regionCountryCodes = require('./utils/regionCountryCodes.js');



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


// input: () 
// output: send a chart to general channel 
const createCountryBarChart = async (playerName, discordID, client, CountryOrRegion) => {
  console.log('inside createCountryBarChart...', playerName, CountryOrRegion);
  const channelID = (process.env.NODE_ENV === 'production') ? process.env.GENERAL_CHANNEL_ID : process.env.TEST_CHANNEL_ID;
  if (CountryOrRegion==='countries-sorted') {
    await createCountrySortedBarChart(playerName, discordID, client, channelID, CountryOrRegion)
    return
  } else if (CountryOrRegion==='regions') {
    await createRegionsBarChart(playerName, discordID, client, channelID, CountryOrRegion)
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
    labels.push(capitalizeFirstLetter(currentName).split(' ')); 
    right.push(currentObj.right);
    wrong.push(currentObj.wrong*-1);
  }


  chartEmbed = new EmbedBuilder()
    .setTitle('all time country breakdown: ' + playerName )
    .setColor('Yellow');
    chartEmbed.setImage("attachment://graph.png");
  const {topCountries, troubleCountries} = topAndBottomCountries(allTimeStats.countryStats, allTimeStats.gamesPlayed, 6);

  const maxLengthTop = Math.max(...topCountries.map(countryObj => countryCodeDict[countryObj.country].length));
  let topCountriesStr = '';
  topCountries.forEach(countryObj => {
    const countryName = countryCodeDict[countryObj.country];
    const padding = '-'.repeat(maxLengthTop - countryName.length + 2); // Adjust padding as needed
    topCountriesStr += `📍 ${countryName} ${padding} ${countryObj.right} / ${countryObj.total} -- ${countryObj.percentage}% \n`;
  });
  const maxLengthBot = Math.max(...troubleCountries.map(countryObj => countryCodeDict[countryObj.country].length));
  let bottomCountriesStr = '';
  troubleCountries.forEach(countryObj => {
    const countryName = countryCodeDict[countryObj.country];
    const padding = '-'.repeat(maxLengthBot - countryName.length + 2); // Adjust padding as needed
    bottomCountriesStr += `😈 ${countryName} ${padding} ${countryObj.right} / ${countryObj.total}-- ${countryObj.percentage}% \n`;
  });
  
  const fields = [];
  fields.push(
    { name: `🤯 you are killing it when we are in: 🤯`, value: topCountriesStr},
    { name: `😅 you get trolled by these countries: 😅`, value: bottomCountriesStr}
  );
  chartEmbed.addFields(fields);

  // Generate your graph & get the picture as response
  const attachment = await generateCanva(labels, right, wrong, playerName);

  // Reply to server / channel you  want passing MessageEmbed & messageAttachment objects
  const endTime = performance.now();
  const elapsedTime = ((endTime - startTime) / 1000).toFixed(3);
  chartEmbed.setFooter({text: 'chart generated in ' + elapsedTime + 's'});

  await client.channels.cache.get(channelID).send({ embeds: [chartEmbed], files: [attachment],});
};




const createCountrySortedBarChart = async(playerName, discordID, client, channelID, CountryOrRegion) => {
  console.log('inside createCountrySortedBarChart...', playerName);
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
    labels.push(capitalizeFirstLetter(currentName).split(' ')); 
    right.push(currentRegion.right);
    wrong.push(currentRegion.wrong*-1);
  }


  chartEmbed = new EmbedBuilder()
    .setTitle('all time guessing breakdown (countries grouped by regions): ' + playerName )
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





const createRegionsBarChart = async(playerName, discordID, client, channelID, CountryOrRegion) => {
  console.log('inside createRegionsBarChart...', playerName);
  const startTime = performance.now();

  const labels = [];
  const right = [];
  const wrong = [];

  const allTimeStats = getAllTimeStats(playerName);
  const allTimeRegionStats = allTimeStats.regionStats; 
  
  const arrayOfRegions = Object.keys(regionCountryCodes);
  // const regionStats = arrayOfRegions.reduce((obj, region) => {
  //   obj[region] = {right: 0, wrong: 0, total: 0}; // Initialize each region with an empty object
  //   return obj;
  // }, {}); // Start with an empty object
  // // ADD UP and calculate region stats
  // for (let regionName in allTimeRegionStats) {
  //   labels.push(regionName);
  //   right.push(allTimeRegionStats)
  // }
  const arrayOfObjects = Object.entries(allTimeRegionStats).map(([region, data]) => ({
    region,
    ...data,
  }));
  // Sort the array by the 'total' property in descending order
  const regionStatsRanked = arrayOfObjects.sort((a, b) => b.total - a.total);
  console.log(regionStatsRanked)


  for (let i=0; i<regionStatsRanked.length; i++) {
    const currentRegion = regionStatsRanked[i];
    let currentName = currentRegion.region;

    labels.push(capitalizeFirstLetter(currentName).split(' ')); 
    right.push(currentRegion.right);
    wrong.push(currentRegion.wrong*-1);
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
const generateCanva = async (labels, right, wrong, playerName, CountryOrRegion) => {
  const renderer = new ChartJSNodeCanvas({ width: 3000, height: 1200 });
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
          clip: {top: 100, left:false, right:false, bottom: false},
          categoryPercentage: 0.8
        },
        {
          // label: "Server Average",
          data: wrong,
          backgroundColor: "red", 
          borderColor: "rgb(255, 100, 100)", // Matching border color for the line
          borderWidth: 2, // Thicker line for better visibilit
          categoryPercentage: 0.8

        },
      ],
    },
    options: {
      datalabels: true,
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
              size: 45
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
              size: 35
            },
            align: 'center',
            maxRotation: 0,
            minRotation: 00,  
            autoSkip: false,        
            padding: 10,
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
        datalabels: {
          color: '#36A2EB'
        }
      },
    },
  });
  return new AttachmentBuilder(image, {name:"graph.png"});
};


module.exports = createCountryBarChart;



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

function breakToArray(str) {
  return str.split(' ');
}

function capitalizeFirstLetter(str) {
  const arr = str.split(' ');
  const result = [];
  arr.forEach(word => {
    result.push(word[0].toUpperCase() + word.slice(1, word.length))
  }) 
  return result.join(' ')
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
  }).slice(0,returnRows);
  console.log(topCountries, troubleCountries)

return { topCountries, troubleCountries };
}


