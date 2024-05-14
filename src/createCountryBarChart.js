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

const topGuessesPlayerStrArray = ['you are killing it when we are in', 'your radar for these is crazy', 'you tend to pop off in'];
const botGuessesPlayerStrArray = ['you get trolled by', 'you get rekt by', 'these are way too hard'];
const topGuessesServerStrArray = ['we are killing it when we are in', 'our radar for these is crazy', 'we tend to pop off in'];
const botGuessesServerStrArray = ['we get trolled by', 'we get rekt by', 'these are way too hard'];


// input: () 
// output: send a chart to general channel 
const createCountryBarChart = async (playerName, discordUsernameObj, client, CountryOrRegion, forAll, monthStr) => {
  console.log('inside createCountryBarChart...', playerName, CountryOrRegion, forAll, monthStr);
  const channelID = (process.env.NODE_ENV === 'production') ? process.env.GENERAL_CHANNEL_ID : process.env.TEST_CHANNEL_ID;
  if (CountryOrRegion==='countries-sorted') {
    await createCountrySortedBarChart(playerName, discordUsernameObj, client, CountryOrRegion, forAll, monthStr)
    return
  } else if (CountryOrRegion==='regions') {
    await createRegionsBarChart(playerName, discordUsernameObj, client, CountryOrRegion, forAll, monthStr)
    return
  } 

  const startTime = performance.now();
  
  const labels = [];
  const right = [];
  const wrong = [];

  let allTimeStats = {gamesPlayed: 0}
  let countryStats = {}; 

  if (forAll) {
    for (let playerName in discordUsernameObj) {
      const currentAllTimeStats = getAllTimeStats(playerName, (monthStr) ? monthStr : null);
      allTimeStats.gamesPlayed += currentAllTimeStats.gamesPlayed;
      const currentCountryStats = currentAllTimeStats.countryStats; 
      for (let country in currentCountryStats) {
        if (!countryStats[country]) countryStats[country] = {right: 0, wrong: 0, total: 0}
        countryStats[country].right += currentCountryStats[country].right;
        countryStats[country].wrong += currentCountryStats[country].wrong;
        countryStats[country].total += currentCountryStats[country].total;
      }
    }

  } else {
    allTimeStats = getAllTimeStats(playerName, monthStr ? monthStr: null);
    countryStats = allTimeStats.countryStats; 
  }
  // console.log('after conditionals....', forAll, monthStr)
  // console.log(countryStats);
  
  
  const arrayOfObjects = Object.entries(countryStats).map(([country, data]) => ({
    country,
    ...data,
  }));
  
  // Sort the array by the 'total' property in descending order
  const countryStatsRanked = arrayOfObjects.sort((a, b) => b.total - a.total);
  // console.log(countryStatsRanked)
  let yMax = countryStatsRanked[0].right;
  // increase it to the nearest 5 or 10
  while (yMax%5!==0) yMax++;

  const maxCountries = 21; 
  const currentTotalCountries = countryStatsRanked.length;
  const maxLoop = Math.min(maxCountries, currentTotalCountries);
  for (let i=0; i<maxLoop; i++) {
    const currentCountryCode = countryStatsRanked[i].country;
    const currentObj = countryStats[currentCountryCode];
    const currentName = countryCodeDict[currentCountryCode];
    console.log(currentCountryCode, currentObj)
    labels.push(capitalizeFirstLetter(currentName).split(' ')); 
    right.push(currentObj.right);
    wrong.push(currentObj.wrong*-1);
  }


  chartEmbed = new EmbedBuilder()
    .setDescription(`from **${allTimeStats.gamesPlayed*5}** guesses`)
    chartEmbed.setColor('Orange');

  const discordID = discordUsernameObj[playerName];

  chartEmbed.setImage("attachment://graph.png");
  if (forAll) {
    chartEmbed.setTitle((monthStr) ? 'monthly country guessing breakdown for: '+monthStr : 'all time country breakdown for server: ')
  } else {
    chartEmbed.setTitle((monthStr) ? 'monthly country guessing breakdown for '+ `<@${discordID}>` + 'in ' +monthStr : 'all time country breakdown for ' + playerName)
  }
  const {topCountries, troubleCountries} = topAndBottomCountries(countryStats, allTimeStats.gamesPlayed, 7);

  const maxLengthTop = Math.max(...topCountries.map(countryObj => countryCodeDict[countryObj.country].length));
  const maxLengthBot = Math.max(...troubleCountries.map(countryObj => countryCodeDict[countryObj.country].length));
  const maxLengthBoth = Math.max(maxLengthTop, maxLengthBot);
  let topCountriesStr = '';
  topCountries.forEach(countryObj => {
    const countryName = countryCodeDict[countryObj.country];
    const padding = '-'.repeat(maxLengthBoth - countryName.length + 2); // Adjust padding as needed
    topCountriesStr += `📍 \`${countryName} ${padding} ${countryObj.right} / ${countryObj.total} -- ${countryObj.percentage}%\`\n`;
  });
  let bottomCountriesStr = '';

  troubleCountries.forEach(countryObj => {
    const countryName = countryCodeDict[countryObj.country];
    const padding = '-'.repeat(maxLengthBoth - countryName.length + 2); // Adjust padding as needed
    bottomCountriesStr += `📍 \`${countryName} ${padding} ${countryObj.right} / ${countryObj.total} -- ${countryObj.percentage}%\`\n`;
  });
  
  const fields = [];
  if (forAll) {
    fields.push(
      { name: `🤯 ${getRandomWord(topGuessesServerStrArray)}: 🤯`, value: topCountriesStr},
      { name: `😈 ${getRandomWord(botGuessesServerStrArray)}: 😈`, value: bottomCountriesStr}
    );
  } else {
    fields.push(
      { name: `🤯 ${getRandomWord(topGuessesPlayerStrArray)}: 🤯`, value: topCountriesStr},
      { name: `😈 ${getRandomWord(botGuessesPlayerStrArray)}: 😈`, value: bottomCountriesStr}
    );
  }
  chartEmbed.addFields(fields);

  // Generate your graph & get the picture as response
  const attachment = await generateCanva(labels, right, wrong, playerName, yMax);

  // Reply to server / channel you  want passing MessageEmbed & messageAttachment objects
  const endTime = performance.now();
  const elapsedTime = ((endTime - startTime) / 1000).toFixed(3);
  chartEmbed.setFooter({text: `-chart generated in ${elapsedTime}s`});

  await client.channels.cache.get(channelID).send({ embeds: [chartEmbed], files: [attachment],});
};





const createCountrySortedBarChart = async(playerName, discordUsernameObj, client, CountryOrRegion, forAll, monthStr) => {
  console.log('inside createCountrySortedBarChart...', playerName);
  const startTime = performance.now();

  const labels = [];
  const right = [];
  const wrong = [];

  let allTimeStats = {gamesPlayed: 0}
  let countryStats = {}; 
  
  if (forAll) {
    for (let playerName in discordUsernameObj) {
      const currentAllTimeStats = getAllTimeStats(playerName, (monthStr) ? monthStr : null);
      allTimeStats.gamesPlayed += currentAllTimeStats.gamesPlayed;
      const currentCountryStats = currentAllTimeStats.countryStats; 
      for (let country in currentCountryStats) {
        if (!countryStats[country]) countryStats[country] = {right: 0, wrong: 0, total: 0}
        countryStats[country].right += currentCountryStats[country].right;
        countryStats[country].wrong += currentCountryStats[country].wrong;
        countryStats[country].total += currentCountryStats[country].total;
      }
    }
  
  } else {
    allTimeStats = getAllTimeStats(playerName, monthStr ? monthStr: null);
    countryStats = allTimeStats.countryStats; 
  }
  
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

  let yMax = regionStatsRanked[0].right;
  // increase it to the nearest 5 or 10
  while (yMax%5!==0) yMax++;


  for (let i=0; i<regionStatsRanked.length; i++) {
    const currentRegion = regionStatsRanked[i];
    // const currentObj = currentRegion[currentCountryCode];
    const currentName = currentRegion.region;
    // console.log(currentCountryCode, currentObj);
    labels.push(capitalizeFirstLetter(currentName).split(' ')); 
    right.push(currentRegion.right);
    wrong.push(currentRegion.wrong*-1);
  }

  const discordID = discordUsernameObj[playerName];

  chartEmbed = new EmbedBuilder()
    .setDescription(`from **${allTimeStats.gamesPlayed*5}** guesses`)
    .setColor('Orange');
    if (forAll) {
      chartEmbed.setTitle((monthStr) ? 'monthly country guessing (grouped by regions) breakdown for: '+monthStr : 'all time country breakdown (grouped by regions) for server: ')
    } else {
      chartEmbed.setTitle((monthStr) ? 'monthly country guessing (grouped by regions) breakdown for '+ `<@${discordID}>` + 'in ' +monthStr : 'all time country breakdown (grouped by regions) for ' + playerName)
    }
    chartEmbed.setImage("attachment://graph.png");

  const {topCountries, troubleCountries} = topAndBottomCountries(regionStats, allTimeStats.gamesPlayed, 6);

  const maxLengthTop = Math.max(...topCountries.map(countryObj => countryObj.country.length));
  const maxLengthBot = Math.max(...troubleCountries.map(countryObj =>  countryObj.country.length));
  const maxLengthBoth = Math.max(maxLengthTop, maxLengthBot);
  let topCountriesStr = '';
  topCountries.forEach(countryObj => {
    const countryName =  countryObj.country;
    const padding = '-'.repeat(maxLengthBoth - countryName.length + 2); // Adjust padding as needed
    topCountriesStr += `📍 \`${capitalizeFirstLetter(countryName)} ${padding} ${countryObj.right} / ${countryObj.total} -- ${countryObj.percentage}%\`\n`;
  });
  let bottomCountriesStr = '';

  troubleCountries.forEach(countryObj => {
    const countryName =  countryObj.country;
    const padding = '-'.repeat(maxLengthBoth - countryName.length + 2); // Adjust padding as needed
    bottomCountriesStr += `📍 \`${capitalizeFirstLetter(countryName)} ${padding} ${countryObj.right} / ${countryObj.total} -- ${countryObj.percentage}%\`\n`;
  });
  
  const fields = [];
  if (forAll) {
    fields.push(
      { name: `🤯 ${getRandomWord(topGuessesServerStrArray)}: 🤯`, value: topCountriesStr},
      { name: `😈 ${getRandomWord(botGuessesServerStrArray)}: 😈`, value: bottomCountriesStr}
    );
  } else {
    fields.push(
      { name: `🤯 ${getRandomWord(topGuessesPlayerStrArray)}: 🤯`, value: topCountriesStr},
      { name: `😈 ${getRandomWord(botGuessesPlayerStrArray)}: 😈`, value: bottomCountriesStr}
    );
  }
  chartEmbed.addFields(fields);

  // Generate your graph & get the picture as response
  const attachment = await generateCanva(labels, right, wrong, playerName, yMax);

  // Reply to server / channel you  want passing MessageEmbed & messageAttachment objects
  const endTime = performance.now();
  const elapsedTime = ((endTime - startTime) / 1000).toFixed(3);
  chartEmbed.setFooter({text: `* if you guessed Philippines for Indonesia, that would be considered a wrong Southeast Asia region guess in this chart \n-chart generated in ${elapsedTime}s`});


  const channelID = (process.env.NODE_ENV === 'production') ? process.env.GENERAL_CHANNEL_ID : process.env.TEST_CHANNEL_ID;

  await client.channels.cache.get(channelID).send({ embeds: [chartEmbed], files: [attachment],});
}





const createRegionsBarChart = async(playerName, discordUsernameObj, client, CountryOrRegion, forAll, monthStr) => {
  console.log('inside createRegionsBarChart...', playerName);
  const startTime = performance.now();

  const labels = [];
  const right = [];
  const wrong = [];

  let allTimeStats = {gamesPlayed: 0}
  let allTimeRegionStats = {}; 

  if (forAll) {
    for (let playerName in discordUsernameObj) {
      const currentAllTimeStats = getAllTimeStats(playerName, (monthStr) ? monthStr : null);
      allTimeStats.gamesPlayed += currentAllTimeStats.gamesPlayed;
      const currentRegionStats = currentAllTimeStats.regionStats; 
      for (let region in currentRegionStats) {
        if (!allTimeRegionStats[region]) allTimeRegionStats[region] = {right: 0, wrong: 0, total: 0}
        allTimeRegionStats[region].right += currentRegionStats[region].right;
        allTimeRegionStats[region].wrong += currentRegionStats[region].wrong;
        allTimeRegionStats[region].total += currentRegionStats[region].total;
      }
    }

  } else {
    allTimeStats = getAllTimeStats(playerName, monthStr ? monthStr: null);
    allTimeRegionStats = allTimeStats.regionStats; 
  }
    
  const arrayOfObjects = Object.entries(allTimeRegionStats).map(([region, data]) => ({
    region,
    ...data,
  }));
  // Sort the array by the 'total' property in descending order
  const regionStatsRanked = arrayOfObjects.sort((a, b) => b.total - a.total);
  console.log(regionStatsRanked)

  let yMax = regionStatsRanked[0].right;
  // increase it to the nearest 5 or 10
  while (yMax%5!==0) yMax++;


  for (let i=0; i<regionStatsRanked.length; i++) {
    const currentRegion = regionStatsRanked[i];
    let currentName = currentRegion.region;

    labels.push(capitalizeFirstLetter(currentName).split(' ')); 
    right.push(currentRegion.right);
    wrong.push(currentRegion.wrong*-1);
  }

  const discordID = discordUsernameObj[playerName];

  chartEmbed = new EmbedBuilder()
    .setDescription(`from **${allTimeStats.gamesPlayed*5}** guesses`)
    .setColor('Orange');
    if (forAll) {
      chartEmbed.setTitle((monthStr) ? 'monthly region guessing breakdown for: '+monthStr : 'all time region guessing breakdown for server: ')
    } else {
      chartEmbed.setTitle((monthStr) ? 'monthly region guessing breakdown for '+ `<@${discordID}>` + 'in ' +monthStr : 'all time region guessing breakdown for ' + playerName)
    }
    chartEmbed.setImage("attachment://graph.png");

  const {topCountries, troubleCountries} = topAndBottomCountries(allTimeRegionStats, allTimeStats.gamesPlayed, 6);

  const maxLengthTop = Math.max(...topCountries.map(countryObj => countryObj.country.length));
  const maxLengthBot = Math.max(...troubleCountries.map(countryObj => countryObj.country.length));
  const maxLengthBoth = Math.max(maxLengthTop, maxLengthBot);
  console.log('maxLength: ', maxLengthBoth)
  let topCountriesStr = '';
  topCountries.forEach(countryObj => {
    const countryName = countryObj.country;
    console.log('countryName: ', countryName)
    const padding = '-'.repeat(maxLengthBoth - countryName.length + 2); // Adjust padding as needed
    topCountriesStr += `📍 \`${capitalizeFirstLetter(countryName)} ${padding} ${countryObj.right} / ${countryObj.total} -- ${countryObj.percentage}%\`\n`;
  });
  let bottomCountriesStr = '';
  troubleCountries.forEach(countryObj => {
    const countryName = countryObj.country;
    const padding = '-'.repeat(maxLengthBoth - countryName.length + 2); // Adjust padding as needed
    bottomCountriesStr += `📍 \`${capitalizeFirstLetter(countryName)} ${padding} ${countryObj.right} / ${countryObj.total} -- ${countryObj.percentage}%\`\n`;
  });
  
  const fields = [];

  if (forAll) {
    fields.push(
      { name: `🤯 ${getRandomWord(topGuessesServerStrArray)}: 🤯`, value: topCountriesStr},
      { name: `😈 ${getRandomWord(botGuessesServerStrArray)}: 😈`, value: bottomCountriesStr}
    );
  } else {
    fields.push(
      { name: `🤯 ${getRandomWord(topGuessesPlayerStrArray)}: 🤯`, value: topCountriesStr},
      { name: `😈 ${getRandomWord(botGuessesPlayerStrArray)}: 😈`, value: bottomCountriesStr}
    );
  }
  chartEmbed.addFields(fields);

  // Generate your graph & get the picture as response
  const attachment = await generateCanva(labels, right, wrong, playerName, yMax);

  // Reply to server / channel you  want passing MessageEmbed & messageAttachment objects
  const endTime = performance.now();
  const elapsedTime = ((endTime - startTime) / 1000).toFixed(3);
  chartEmbed.setFooter({text: `* if you guessed Ireland for UK, that would be considered a correct Western Europe region guess for this chart \n-chart generated in ${elapsedTime}s`});


  const channelID = (process.env.NODE_ENV === 'production') ? process.env.GENERAL_CHANNEL_ID : process.env.TEST_CHANNEL_ID;

  await client.channels.cache.get(channelID).send({ embeds: [chartEmbed], files: [attachment],});
}



// This function will return MessageAttachment object from discord.js
const generateCanva = async (labels, right, wrong, playerName, yMax) => {
  const renderer = new ChartJSNodeCanvas({ width: 3000, height: 1200, plugins: {
    modern: ["chartjs-plugin-datalabels"],
  }});
  const rightColor = 'rgb(179, 255, 174)';
  const wrongColor = 'rgb(255, 100, 100)';
  const image = await renderer.renderToBuffer({
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          // label: `${playerName}'s Monthly ${statStr}`,
          data: right,
          // backgroundColor: "rgba(75, 192, 192, 0.2)", // Light greenish-blue with some transparency
          backgroundColor: rightColor,
          borderColor: rightColor, // Matching border color for the line
          borderWidth: 2, // Thicker line for better visibility
          clip: {top: 100, left:false, right:false, bottom: false},
          categoryPercentage: 0.8
        },
        {
          // label: "Server Average",
          data: wrong,
          backgroundColor: wrongColor, 
          borderColor: wrongColor, // Matching border color for the line
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
          max: yMax,
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
          color:(context) => {
            // Position positive labels at the top, negative at the bottom
            const value = context.dataset.data[context.dataIndex];
            return value >= 0 ? rightColor : wrongColor; 
          },
          font: {
            size: 38,
            weight: 'bold'
          },
          anchor: (context) => {
            // Position positive labels at the top, negative at the bottom
            const value = context.dataset.data[context.dataIndex];
            return value >= 0 ? 'end' : 'start'; // Anchor position
          },
          align: (context) => {
            // Align positive labels to the top, negative to the bottom
            const value = context.dataset.data[context.dataIndex];
            return value >= 0 ? 'top' : 'bottom'; // Align position
          },
          offset: 4, // Adjust for label distance from the bar
          formatter: (value) => {
            // Remove the negative sign if the value is negative
            return Math.abs(value).toString();
          },
        },

      },
    },
  });
  console.log(image)
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
  console.log('topAndBottomCountries');
  console.log(countryStats)
  const filterThreshhold = gamesPlayed/12
  const filteredStats = Object.entries(countryStats)
    .filter(([country, stats]) => stats.total > filterThreshhold);
  const countriesWithPercentage = filteredStats.map(([country, stats]) => {
      const percentage = Number(((stats.right / stats.total) * 100).toFixed(1));
      const right = stats.right
      const total = stats.total
      return { country, percentage, right, total};
  });
  console.log(filteredStats)

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

const getRandomWord = (array) => {
  // Generate a random index between 0 and 2 (inclusive)
  const randomIndex = Math.floor(Math.random() * array.length);
  // Return the word at the random index
  return array[randomIndex];
}

