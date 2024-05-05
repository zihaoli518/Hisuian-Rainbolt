// input: a month and a year, like 3-2024
// output: {z: 1, kanjidai: 5, erniesbro: 3}
// [{playerName: 'test', rank: 1, totalScore: 1000, totalDistance:'10km'}]
require('dotenv').config();
const fs = require('fs');
const fetch = require('node-fetch');
let historyObject = require('../challengeLinksHistory.js');
const challengeScoreHistory = require('../challengeScoreHistory.js');
// const db = require('../dbModel.js');
const getScores = require('./getScores.js');




// input: (playerName, monthStr) 
// outpu: {monthlyAverage: 1000, }
const generateMonthlyStats = async (playerName, monthStr) => {
  console.log('inside generateMonthlyStats...', playerName, monthStr)
  let totalScore = 0; 
  let totalDistance = 0;
  let totalCountries = 0;
  let totalRegions = 0;
  let gamesPlayed = 0; 
  let allTimeHighscore = 0; 
  let wins = 0; 
  let topThree = 0;  
  let monthlyHighScore = 0;
  let bestGuess = {distance: Infinity, address: '', countryCode: ''}
  
  const dateArray = Object.keys(challengeScoreHistory); 
  for (const date of dateArray) {
    let rankingArray = challengeScoreHistory[date].ranking;

    // rankingArray = challengeScoreHistory[date].ranking;

    // update challengeScoreHistory by running getScore
    rankingArray.forEach(playerObj => {
      if (playerObj.playerName === playerName) {
        allTimeHighscore = Math.max(allTimeHighscore, playerObj.totalScore);
        if (dateStrToMonthStr(date) === monthStr) {
          totalScore += playerObj.totalScore;
          totalDistance += playerObj.totalDistance;
          totalCountries += playerObj.countryRight;
          totalRegions += playerObj.regionRight;
          gamesPlayed++;
          if (playerObj.rank === 1) wins++;
          if (playerObj.rank <= 3) topThree++;
          monthlyHighScore = Math.max(monthlyHighScore, playerObj.totalScore);
          playerObj.guesses.forEach(guess => {
            if (guess.distance<bestGuess.distance) {
              bestGuess.distance = guess.distance; 
              bestGuess.address = guess.address
              bestGuess.countryCode = guess.guessCountryCode
            }
          })
        }
      }
    })
    // if (!dateStrToMonthStr(date) === monthStr) return;
  }
  
  const result = {};
  result['monthlyAverage'] = (totalScore/gamesPlayed).toFixed(1); 
  result['distance'] = (totalDistance/gamesPlayed).toFixed(1);
  result['gamesPlayed'] = gamesPlayed; 
  result['allTimeHighscore'] = allTimeHighscore; 
  result['wins'] = wins; 
  result['topThree'] = topThree; 
  result['averageCountries'] = (totalCountries/gamesPlayed).toFixed(1); 
  result['averageRegions'] = (totalRegions/gamesPlayed).toFixed(1); 
  result['monthlyHighScore'] = monthlyHighScore;
  result['bestGuess'] = bestGuess;
  return result;
};


const dateStrToMonthStr = (str) => {
  const parts = str.split('-'); // Split the string by the hyphen character
  const monthYearString = `${parts[0]}-${parts[2]}`;
  return monthYearString
}


module.exports = generateMonthlyStats;
