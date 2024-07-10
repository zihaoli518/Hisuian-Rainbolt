// checks messages in #daily challenge channel and update challengeLinksHistory.js
require('dotenv').config();
const fs = require('fs');
const { Client, IntentsBitField, } = require('discord.js'); 
// const fetch = require('node-fetch');
const challengeLinksHistory = require('../../challengeLinksHistory.js');

// discord js setup
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

  let once = false;
  if (!once) {
    syncChallengeLinks();
    once = true
  }
});
client.login(TOKEN);

const syncChallengeLinks = (days=31) => {
  const channelID = process.env.DAILY_CHALLENGE_CHANNEL_ID;
  const channel = client.channels.cache.get(channelID);

  channel.messages.fetch({ limit: days })
    .then(messages => {
      console.log(`Received ${messages.size} messages`);
      const newLinksObj = {...challengeLinksHistory}
      messages.forEach(message =>{
        console.log(message.createdTimestamp)
        const dateStr = formatTimestampToCalifornia(message.createdTimestamp);
        if (!newLinksObj[dateStr] && message.content.startsWith('https')) {
          newLinksObj[dateStr] = message.content
        }
 
      });

      fs.writeFile('challengeLinksHistory.js', `module.exports = ${JSON.stringify(newLinksObj, null, 2)};`, err => {
        if (err) {
            console.error('Error writing to file:', err);
            return;
        } else {
            console.log('Message history object saved to challengeScoreHistory.js');
        }
      });
  })



}

function formatTimestampToCalifornia(timestamp) {
  const date = new Date(timestamp);
  
  const options = {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  
  const californiaDate = new Intl.DateTimeFormat('en-US', options).format(date);
  
  // The format will be 'MM/DD/YYYY', so we need to change it to 'M-D-YYYY' and remove leading zeros
  let [month, day, year] = californiaDate.split('/');
  
  month = parseInt(month, 10); // Remove leading zeros
  day = parseInt(day, 10); // Remove leading zeros
  
  return `${month}-${day}-${year}`;
}