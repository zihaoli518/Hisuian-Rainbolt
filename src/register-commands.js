require('dotenv').config();
const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');

const commands = [
  {
    name: 'dailychallenge',
    description: 'posts daily challenge link'
  },
  {
    name: 'dailyscore',
    description: 'uses geoguessr api to get todays daily challenge scores and posts recap'
  },
  {
    name: 'dailyscoreof',
    description: 'posts recap for daily challenge',
    options: [
      {
        name: 'date',
        description: 'date of the daily challenge you want to generate a recap for',
        type: ApplicationCommandOptionType.String,
      },
      
    ]
  }
]

const rest = new REST({version: '10'}).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('registering slash commands...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      {body: commands}
    )
    console.log('slash commands registered!')
  } catch (error) {
    console.log('there was an error! ', error)
  }
})();