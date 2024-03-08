require('dotenv').config();
const { REST, Routes } = require('discord.js');

const commands = [
  {
    name: 'dailychallenge',
    description: 'posts daily challenge link'
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