require('dotenv').config();
const fs = require('fs');
const fetch = require('node-fetch');
const challengeScoreHistory = require('../../challengeScoreHistory.js');
const getScores = require('../getScores.js');
const countryCodeDict = require('./countryCodes.js')
const regionCodeDict = require('./regionCountryCodes.js')

// running this script updates region guesses for all exisiting data in challengeScoreHistory.js

let once = false 

const update = async() => {

  const oldObj = challengeScoreHistory; 
  console.log('inside update')

  const challengeLinksHistoryKeys = Object.keys(challengeScoreHistory);

  for (let date of challengeLinksHistoryKeys) {
    console.log('processing...', date);
    const rankingArray = oldObj[date].ranking;
    rankingArray.forEach(playerObj => {
      let regionCounter = 0; 
      playerObj.guesses.forEach(guess => {
        let guessRegion={}; let rightRegion={}; 
        for (let region in regionCodeDict) {
          if (regionCodeDict[region][guess.guessCountryCode]) guessRegion[region] = true; 
          if (regionCodeDict[region][guess.correctCountryCode]) rightRegion[region] = true; 
        }
        guess['guessRegion'] = guessRegion; 
        guess['correctRegion'] = rightRegion; 
        let correct = false; 
        for (let key in guessRegion) {
          if (rightRegion[key]) correct=true
        }
        guess['rightRegion'] = correct;
        if (correct) regionCounter++;
      })
      playerObj['regionRight'] = regionCounter;
    })
  }

    fs.writeFile('challengeScoreHistory.js', `module.exports = ${JSON.stringify(oldObj, null, 2)};`, err => {
    if (err) {
        console.error('Error writing to file:', err);
        return;
    } else {
        console.log('Message history object saved to challengeScoreHistory.js');
    }
  });
}




if (!once) {
  update()
  once = true
  // const realResult = []
  // const challengeLinksHistoryKeys = Object.keys(challengeScoreHistory);
  // for (let date of challengeLinksHistoryKeys) {
  //   if (!result.includes(date)) realResult.push(date)
  // }
  // console.log(realResult)
}

