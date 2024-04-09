
const createHistoryObject = () => {
  const dailyChallengeChannel = process.env.DAILY_CHALLENGE_CHANNEL_ID;
  const channel = client.channels.cache.get(dailyChallengeChannel);
  // get the last few messages in the channel 
  const messages = await channel.messages.fetch({ limit: 4 });
  const challengeURLArray = []; 
  messages.forEach(message => {
      const dateObj = new Date(message.timeStamp);
      console.log('inside score OF forEach... ', dateObj);
      const currentStr =  getDateStr(dateObj);
      if (currentStr !== date) return;
      // check if the message contains a challenge link 
     if (message.content.slice(0,5) === 'https') challengeURLArray.push(message.content);
  });
}


// overwrite challengeHisotry 
const fs = require('fs');

// Load the current data from the file
let historyObject = require('./challengeLinksHistory.js');

// Add a new entry for a new date and URL
historyObject["3-12-2024"] = "https://www.geoguessr.com/challenge/new-challenge";

// Convert the object to a string and write it back to the file
fs.writeFile('challengeLinksHistory.js', `module.exports = ${JSON.stringify(historyObject, null, 2)};`, err => {
    if (err) {
        console.error('Error writing to file:', err);
    } else {
        console.log('Message history object saved to challengeLinksHistory.js');
    }
});