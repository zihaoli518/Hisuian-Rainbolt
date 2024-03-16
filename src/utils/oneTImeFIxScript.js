require('dotenv').config();
const fs = require('fs');
const fetch = require('node-fetch');
const challengeScoreHistory = require('./challengeScoreHistory.js');
let countryCodes = require('./src/utils/countryCodes.js');


const update = () => {

  console.log('inside update')
  const resultObj = {};
  const challengeHistoryKeys = Object.keys(challengeScoreHistory);
  for (let date of challengeHistoryKeys) {
    if (date[0]==='3') continue;
    const clone = challengeScoreHistory[date];
    if (clone.dailyInfo.worstGuess.guessCountry) {
      const newCountryCode = '';
      for (let code in countryCodes) {
        if (countryCodes[code] === clone.dailyInfo.worstGuess.guessCountry) clone.dailyInfo.worstGuess['guessCountryCode'] = code;
      }
    }
    resultObj[date] = clone; 
  }

  fs.writeFile('challengeScoreHistory.js', `module.exports = ${JSON.stringify(resultObj, null, 2)};`, err => {
    if (err) {
        console.error('Error writing to file:', err);
        return;
    } else {
        console.log('Message history object saved to challengeScoreHistory.js');
    }
  });
}


update()