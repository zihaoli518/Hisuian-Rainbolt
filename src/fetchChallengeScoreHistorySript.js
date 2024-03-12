// input: a month and a year, like 3-2024
// output: {z: 1, kanjidai: 5, erniesbro: 3}
// [{playerName: 'test', rank: 1, totalScore: 1000, totalDistance:'10km'}]
require('dotenv').config();
const fs = require('fs');
const fetch = require('node-fetch');
let challengeHisotry = require('../challengeHistory.js');
const getScores = require('./getScores.js');



// const link = "https://geoguessr.com/api/v3/results/highscores/VIT6mW6KIg0pthxj?friends=false&limit=26&minRounds=5";

// uses the challenge history file, go thru every challenge, collect ranking data in every challenge and store in new file

const fetchMonthlyStats = async () => {
  console.log('inside fetchMonthlyStats')
  const resultObj = {};
  const challengeHistoryKeys = Object.keys(challengeHisotry);
  for (let date of challengeHistoryKeys) {
    console.log('processing...', date)
    const url = challengeHisotry[date]; 
    // first convert it to the correct api endpoint 
    const scoresArray = await getScores(url, date);                                                        
    resultObj[date] = {url: url, ranking: scoresArray}; 
  }

  fs.writeFile('challengeScoreHistory.js', `module.exports = ${JSON.stringify(resultObj, null, 2)};`, err => {
    if (err) {
        console.error('Error writing to file:', err);
        return;
    } else {
        console.log('Message history object saved to challengeScoreHistory.js');
    }
  });
};


// await client.channels.cache.get(outputChannel).send('successfully created challengeHistory.js in root directory');







const extractChallengeId = (url) => {
  const parts = url.split('/');
  // The challenge ID is the last part of the URL
  const challengeId = parts[parts.length - 1];
  return challengeId;
}


const dateStrToMonthStr = (str) => {
  const parts = str.split('-'); // Split the string by the hyphen character
  const monthYearString = `${parts[0]}-${parts[2]}`;
  return monthYearString
}


fetchMonthlyStats()