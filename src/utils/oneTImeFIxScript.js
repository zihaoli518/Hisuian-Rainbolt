require('dotenv').config();
const fs = require('fs');
const fetch = require('node-fetch');
const challengeScoreHistory = require('../../challengeScoreHistoryBackup.js');
const countryCodeDict = require('./countryCodes.js')




let dailyBestCounter = Infinity; 
let dailyWorstCounter = 0; 
let dailyInfo = {
  bestGuess: {playerName: '', score: 0, distance: 0, address: '', countrycode: '' },
  worstGuess: {playerName: '', score: 0, distance: 0, guessCountry: '', correctCountry: '', guessCountryCode: '' },
}


const resultObj = {};
let once = false 

const update = () => {

  console.log('inside update')
  const challengeHistoryKeys = Object.keys(challengeScoreHistory);
  for (let date of challengeHistoryKeys) {
    console.log('processing...', date)
    resetDailyInfo()
    const clone = challengeScoreHistory[date];
    const ranking = clone.ranking;
    
    for (let player of ranking) {
      player.guesses.forEach(result => {
        const playerName = player.playerName;
        const distance = result.distance;
        const guessCode = result.guessCountryCode;
        // check and update daily best guess 
        if (distance > 0 && distance < dailyBestCounter) {
          if (date==='3-14-2024') console.log('best update ', distance, playerName)
          dailyBestCounter = distance; 
            dailyInfo.bestGuess = {playerName: playerName, score: result.score, distance: distance, address: result.address, countryCode: result.correctCountryCode}
          }
          // check and update daily worse guess 
          if (distance > 0 && distance > dailyWorstCounter) {
            if (date==='3-14-2024') console.log('worst update ', distance, playerName)

            dailyWorstCounter = distance; 
            dailyInfo.worstGuess = {playerName: playerName, score: result.score, distance: distance, guessCountry: countryCodeDict[guessCode] ? countryCodeDict[guessCode] : 'ocean', correctCountry: result.correctCountryCode, guessCountryCode: guessCode}
          }
      })
    }
      clone.dailyInfo = dailyInfo;

    
      resultObj[date] = clone; 
    }
    fs.writeFile('challengeScoreHistory2.js', `module.exports = ${JSON.stringify(resultObj, null, 2)};`, err => {
      if (err) {
          console.error('Error writing to file:', err);
          once = true;
          return;
      } else {
          console.log('object saved to challengeScoreHistory.js');
      }
    });

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
  update()
  once = true
}