require('dotenv').config();
const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');

const commands = [
  {
    name: 'daily_challenge_link',
    description: 'posts daily challenge link'
  },
  {
    name: 'daily_recap',
    description: 'uses geoguessr api to get todays daily challenge scores and posts recap'
  },
  {
    name: 'get_recap_of',
    description: 'posts recap for daily challenge',
    options: [
      {
        name: 'date',
        description: 'please enter a datey ou want to generate a recap for. example: 2-19-2024',
        type: ApplicationCommandOptionType.String,
        required: true
      }
    ]
  },
  {
    name: 'get_my_all_time_stats', 
    description: 'generate a recap for your all time stats'
  },
  {
    name: 'get_all_time_stats_of', 
    description: 'generate a recap for given users all time stats',
    options: [
      {
        name: 'user',
        description: 'please select the player you want to get all time stats for',
        type: ApplicationCommandOptionType.User,
        required: true
      }
    ]
  },
  {
    name: 'create_history_object',
    description: 'parses thru all messages in challenge channel and save all URL to javascript object'
  },
  {
    name: 'test_alert',
    description: 'get trolled'
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