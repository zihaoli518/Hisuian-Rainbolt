require('dotenv').config();
const fs = require('fs');
const fetch = require('node-fetch');
const challengeScoreHistory = require('../../challengeScoreHistoryBackup.js');
const getScores = require('../getScores.js');
const countryCodeDict = require('./countryCodes.js')






const result = [];
let once = false 

const update = async() => {

  console.log('inside update')
  const challengeHistoryKeys = Object.keys(challengeScoreHistory);
  for (let date of challengeHistoryKeys) {
    console.log('processing...', date);
    try {
      const { ranking } = await getScores(challengeScoreHistory[date].url, date);
      for (let player of ranking) {
        if (player.playerName === 'Kanjidai') result.push(date);
      }
    } catch (error) {
      console.error('Error processing challenge:', error);
      // Handle error if needed
    }
  }
}




if (!once) {
  update()
  once = true
  const realResult = []
  const challengeHistoryKeys = Object.keys(challengeScoreHistory);
  for (let date of challengeHistoryKeys) {
    if (!result.includes(date)) realResult.push(date)
  }
  console.log(realResult)
}

