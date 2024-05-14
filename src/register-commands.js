require('dotenv').config();
const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');

const commands = [
  {
    name: 'send_daily_challenge_link',
    description: 'posts daily challenge link'
  },
  {
    name: 'daily_recap_today',
    description: 'uses geoguessr api to get todays daily challenge scores and posts recap'
  },
  {
    name: 'daily_recap_of',
    description: 'posts recap for daily challenge',
    options: [
      {
        name: 'date',
        description: 'please enter a date in this format: 2-19-2024',
        type: ApplicationCommandOptionType.String,
        required: true
      }
    ]
  },
  {
    name: 'my_all_time_stats', 
    description: 'see your all time stats!'
  },
  {
    name: 'all_time_stats_of', 
    description: `see your friend's all time stats`,
    options: [
      {
        name: 'user',
        description: 'please select the player you want to see the all time stats for',
        type: ApplicationCommandOptionType.User,
        required: true
      }
    ]
  },
  {
    name: 'my_monthly_chart',
    description: 'see a chart and recap for your monthly stats'
  },
  {
    name: 'monthly_chart_of',
    description: 'create a chart and recap for any player any month',
    options: [
      {
        name: 'user',
        description: 'please select the player',
        type: ApplicationCommandOptionType.User,
        required: true
      },
      {
        name: 'month',
        description: 'please enter a month in this format: 2-2024',
        type: ApplicationCommandOptionType.String,
        required: true
      }
    ]
  },
  {
    name: 'monthly_recap',
    description: 'see a recap for how everyone did this month with chart and data',
    options: [
      {
        name: 'month',
        description: 'please enter a month in this format: 2-2024',
        type: ApplicationCommandOptionType.String,
        required: true
      }
    ]
  },
  {
    name: 'all_time_breakdown_chart',
    description: `see chart & stats for your or someone else's all time country/region guessing data`,
    options: [
      {
        name: 'user',
        description: 'please select an user',
        type: ApplicationCommandOptionType.User,
        required: true
      }
    ]
  },
  {
    name: 'all_time_breakdown_everyone',
    description: `see chart & stats for the whole server's all time country/region guessing data`,
  }
  // {
  //   name: 'create_history_object',
  //   description: 'parses thru all messages in challenge channel and save all URL to javascript object'
  // },
  // {
  //   name: 'test_alert',
  //   description: 'get trolled'
  // }
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