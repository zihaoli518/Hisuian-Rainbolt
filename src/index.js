const { Client, IntentsBitField} = require('discord.js'); 
const puppeteer = require('puppeteer');
require('dotenv').config();


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

client.on('messageCreate', (message) => {

})


client.on('interactionCreate', (interaction) => {
  console.log(interaction.commandName);
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'dailychallenge') {
    // send url to daily challenge channel 
    generateDailyChallengeLink();
  }
})

client.login(TOKEN);


const generateDailyChallengeLink = async (cookie) =>  {
  const url = 'https://www.geoguessr.com/maps/world/play';
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);

}