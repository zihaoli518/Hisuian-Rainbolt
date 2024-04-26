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
const { MessageEmbed, MessageAttachment } = require("discord.js");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
let chartEmbed = {};



// input: (playerName, monthStr) 
// output: send a chart to general channel 
const createChart = async (playerName, monthStr) => {
  console.log('inside createChart...', playerName, monthStr);

  let labels = ["a", "b", "c"];
  let data = [10, 5, 9];

  // Create MessageEmbed passing options you want
  chartEmbed = new MessageEmbed({
    title: "monthly chart",
    color: "YELLOW",
  });
  chartEmbed.setImage("attachment://graph.png");

  // Generate your graph & get the picture as response
  const attachment = await generateCanva(labels, data, convert);

  // Reply to server / channel you  want passing MessageEmbed & messageAttachment objects
  interaction.reply({ embeds: [chartEmbed], files: [attachment] });

};

// This function will return MessageAttachment object from discord.js
const generateCanva = async (labels, datas) => {
  const renderer = new ChartJSNodeCanvas({ width: 800, height: 300 });
  const image = await renderer.renderToBuffer({
    // Build your graph passing option you want
    type: "line", // Show a bar chart
    backgroundColor: "rgba(236,197,1)",
    data: {
      labels: labels,
      datasets: [
        {
          label: "My graph title",
          data: datas,
        },
      ],
    },
  });
  return new MessageAttachment(image, "graph.png");
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
