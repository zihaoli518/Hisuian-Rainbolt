// input: a month and a year, like 3-2024
// output: {z: 1, kanjidai: 5, erniesbro: 3}
// [{playerName: 'test', rank: 1, totalScore: 1000, totalDistance:'10km'}]
require('dotenv').config();
const fs = require('fs');
const fetch = require('node-fetch');
let historyObject = require('../challengeLinksHistory.js');
const challengeScoreHistory = require('../challengeScoreHistory.js');
// const db = require('../dbModel.js');
const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder, AttachmentBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
let chartEmbed = {};



// input: (playerName, monthStr) 
// output: send a chart to general channel 
const createChart = async (playerName, monthStr, interaction) => {
  console.log('inside createChart...', playerName, monthStr);

  let labels = ["3/15"];
  let data = [0];

  // populate labels and data 
  for (let i=1; i<=31; i++) {
    let splitArray = monthStr.split('-');
    const dateStr = splitArray[0] + '-' + i + '-' + splitArray[1];
    console.log(dateStr, challengeScoreHistory[dateStr])
    if (!challengeScoreHistory[dateStr]) break;
    const rankingArray = challengeScoreHistory[dateStr].ranking;
    rankingArray.forEach(object => {
      if (object.playerName===playerName) {
        labels.push(dateStr);
        data.push(object.totalScore)
      }
    })
  }


  // Create MessageEmbed passing options you want
  chartEmbed = new EmbedBuilder()
    .setTitle('monthly chart')
    .setColor('Yellow');
    chartEmbed.setImage("attachment://graph.png");


  const button = new ButtonBuilder();
  const selectMenu = new StringSelectMenuBuilder();
  const confirm = new ButtonBuilder()
    .setCustomId('confirm')
    .setLabel('Confirm Ban')
    .setStyle(ButtonStyle.Danger);
  const cancel = new ButtonBuilder()
    .setCustomId('cancel')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary);
  const row = new ActionRowBuilder()
    .addComponents(cancel, confirm);

  // Generate your graph & get the picture as response
  const attachment = await generateCanva(labels, data);


  // Reply to server / channel you  want passing MessageEmbed & messageAttachment objects
  interaction.reply({ embeds: [chartEmbed], files: [attachment], components: [row],});

};

// This function will return MessageAttachment object from discord.js
const generateCanva = async (labels, datas) => {
  const renderer = new ChartJSNodeCanvas({ width: 1200, height: 500 });
  const image = await renderer.renderToBuffer({
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Your Monthly Score",
          data: datas,
          backgroundColor: "rgba(75, 192, 192, 0.2)", // Light greenish-blue with some transparency
          borderColor: "rgb(75, 192, 192)", // Matching border color for the line
          borderWidth: 2, // Thicker line for better visibility
          pointBackgroundColor: "rgb(255, 99, 132)", // Bright red for data points
          pointBorderColor: "rgb(255, 99, 132)",
          pointRadius: 5, // Increase point size
          fill: true, // Fill the area below the line with the background color
        },
      ],
    },
    options: {
      scales: {
        y: {
          min: 0,
          max: 25000,
          grid: {
            color: "rgba(192, 192, 192, 0.5)", // Light grey for grid lines
          },
          ticks: {
            color: "rgb(75, 192, 192)", // Matching color for axis labels
          },
        },
        x: {
          grid: {
            color: "rgba(192, 192, 192, 0.5)", // Light grey for grid lines
          },
          ticks: {
            color: "rgb(75, 192, 192)", // Matching color for axis labels
          },
        },
      },
      plugins: {
        legend: {
          display: true, // Show the legend
          labels: {
            color: "rgb(75, 192, 192)", // Matching color for legend text
          },
        },
      },
    },
  });
  return new AttachmentBuilder(image, {name:"graph.png"});
};

// module.exports = {
//   data: new SlashCommandBuilder(),
//   // Build your command option before execute() if you plan to add slashCommands to your server
//   async execute(interaction) {
//     let labels = ["a", "b", "c"];
//     let data = [10, 5, 9];

//     // Create MessageEmbed passing options you want
//     chartEmbed = new MessageEmbed({
//       title: "MessageEmbed title",
//       color: "YELLOW",
//     });
//     chartEmbed.setImage("attachment://graph.png");

//     // Generate your graph & get the picture as response
//     const attachment = await generateCanva(labels, data, convert);

//     // Reply to server / channel you  want passing MessageEmbed & messageAttachment objects
//     interaction.reply({ embeds: [chartEmbed], files: [attachment] });
//     //#endregion
//   },
// };


const dateStrToMonthStr = (str) => {
  const parts = str.split('-'); // Split the string by the hyphen character
  const monthYearString = `${parts[0]}-${parts[2]}`;
  return monthYearString
}


module.exports = createChart;
