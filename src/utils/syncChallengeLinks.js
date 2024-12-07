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

const syncChallengeLinks = (days=91) => {
  const channelID = process.env.DAILY_CHALLENGE_CHANNEL_ID;
  const channel = client.channels.cache.get(channelID);

  channel.messages.fetch({ limit: days })
    .then(messages => {
      console.log(`Received ${messages.size} messages`);
      const newLinksObj = {...challengeLinksHistory};

      let messageArray = Array.from(messages.values()); // Convert collection to array


      for (let i=0; i<messageArray.length; i++) {
        // console.log(message.createdTimestamp)
        const message = messageArray[i];
        console.log(i, message.createdTimestamp, message.content)
        const dateStr = formatTimestampToCalifornia(message.createdTimestamp);
        if (!newLinksObj[dateStr] && message.content.startsWith('https')) {
          console.log('game url updated for ', dateStr)
          newLinksObj[dateStr] = message.content;
        }
        // check if it's missing
        let prevCounter = i+1;
        if (!messageArray[prevCounter]) continue;
        let prevMessage = messageArray[prevCounter];
        let prevMessageDate = prevMessage.createdTimestamp;
        let prevMessageDateStr = formatTimestampToCalifornia(prevMessageDate);
        let prevHistoryDateStr = getPreviousDay(dateStr);
        console.log(i, dateStr, prevMessageDateStr)

        while (prevMessageDateStr===dateStr) {
          if (!newLinksObj[prevHistoryDateStr]) {
            newLinksObj[prevHistoryDateStr] = prevMessage.content;
            // prevCounter++;
            prevHistoryDateStr = getPreviousDay(prevHistoryDateStr);
          }
          prevCounter++
          if (!messageArray[prevCounter]) break;
          prevMessage = messageArray[prevCounter]
          prevMessageDate = prevMessage.createdTimestamp;
          prevMessageDateStr = formatTimestampToCalifornia(prevMessageDate);
          console.log(dateStr, prevMessageDateStr)
        }
      }

      // format the url object and sort based on date str 
      const sortedLinksObj = sortObjectByDate(newLinksObj);

      fs.writeFile('challengeLinksHistoryTEST.js', `module.exports = ${JSON.stringify(sortedLinksObj, null, 2)};`, err => {
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

function sortObjectByDate(obj) {
  const sortedKeys = Object.keys(obj).sort((a, b) => {
      const [monthA, dayA, yearA] = a.split('-').map(Number);
      const [monthB, dayB, yearB] = b.split('-').map(Number);

      // Construct dates in YYYY-MM-DD format for comparison
      const dateA = new Date(yearA, monthA - 1, dayA); // Months are 0-based in JS Date
      const dateB = new Date(yearB, monthB - 1, dayB);

      return dateA - dateB;
  });

  const sortedObj = {};
  sortedKeys.forEach(key => {
      sortedObj[key] = obj[key];
  });

  return sortedObj;
};

function getPreviousDay(dateStr) {
  // Split the input dateStr into parts: MM, DD, YYYY
  const [month, day, year] = dateStr.split('-').map(Number);
  
  // Create a Date object using the parts
  const currentDate = new Date(year, month - 1, day); // month is 0-indexed in JS Date
  
  // Subtract one day
  currentDate.setDate(currentDate.getDate() - 1);
  
  // Format the new date back to MM-DD-YYYY
  const previousDay = String(currentDate.getDate()); // Ensure 2 digits for the day
  const previousMonth = String(currentDate.getMonth() + 1); // Ensure 2 digits for the month (add 1 since months are 0-indexed)
  const previousYear = currentDate.getFullYear();

  return `${previousMonth}-${previousDay}-${previousYear}`;
}