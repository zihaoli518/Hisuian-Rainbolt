// 

require('dotenv').config();
const fs = require('fs');
const fetch = require('node-fetch');
const challengeLinksHistory = require('../../challengeLinksHistory.js');
const challengeScoreHistory = require('../../challengeScoreHistory.js');
const countryCodeDict = require('./countryCodes.js');
const getScores = require('../getScores.js');



const resultObj = challengeScoreHistory;
let once = false 

const updatePreviousGames = async () => {

  console.log('inside updatePreviousGames');
  const dateArray = Object.keys(challengeLinksHistory);

  for (let date in challengeLinksHistory) {
    console.log('processing...   ', date);
    const url = challengeLinksHistory[date];
    console.log(url);
    const data = await getScores(url, date);
    console.log('finished...   ', date);
  }

    // fs.writeFile('challengeScoreHistory2.js', `module.exports = ${JSON.stringify(resultObj, null, 2)};`, err => {
    //   if (err) {
    //       console.error('Error writing to file:', err);
    //       once = true;
    //       return;
    //   } else {
    //       console.log('object saved to challengeScoreHistory.js');
    //   }
    // });

}



const resetDailyInfo = () => {
  dailyBestCounter = Infinity; 
  dailyWorstCounter = 0; 
  dailyInfo = {
    bestGuess: {playerName: '', score: 0, distance: 0, address: '', countrycode: '' },
    worstGuess: {playerName: '', score: 0, distance: 0, guessCountry: '', correctCountry: '', guessCountryCode: '' },
  }
}


if (!once) {
  updatePreviousGames();
  once = true
}