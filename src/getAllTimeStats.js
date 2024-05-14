require('dotenv').config();
const fs = require('fs');
const fetch = require('node-fetch');
let historyObject = require('../challengeLinksHistory.js');
const challengeScoreHistory = require('../challengeScoreHistory.js');
const regionCodeDict = require('./utils/regionCountryCodes');
const getScores = require('./getScores.js');




// input: (playerName) 
// outpu: {average score: 1000, average distance: 1000, Number((totalRank / allTimeStats.gamesPlayed).toFixed(2));: 40, wins: 10, topThree: 20, bestGuessOfTheDay: 3, worstGuessOfTheDay:10,}
const getAllTimeStats = (playerName, monthStr) => {
  // console.log('inside getAllTimeStats... ', playerName, monthStr)
  
  let totalScore = 0;
  let totalDistance = 0;
  let totalRank = 0; 
  const allTimeStats = {
    averageScore: 0, 
    averageDistance: 0, 
    gamesPlayed: 0, 
    wins: 0, 
    topThree: 0, 
    averageRank: 0,
    personalBestScore: 0,
    personalBestRound: 0,
    bestGuessOfTheDay: 0, 
    worstGuessOfTheDay: 0,
    allTimeBestGuess: Infinity, 
    allTimeBestGuessAddress: '',
    allTimeWorstGuess: 0, 
    correctCountries: 0,
    correctRegions: 0, 
    countryStats: {
      // us : {right: 1, wrong: 3}, ru: 3, .... 
    },
    regionStats: {
      // 'north america' : {right: 1, wrong: 3, total: 4}
    }
  };
  // initialize regionStats object
  for (let regionName in regionCodeDict) {
    allTimeStats.regionStats[regionName] = {right: 0, wrong: 0, total: 0}
  }
  
  const dateKeys = Object.keys(challengeScoreHistory); 
  for (let date of dateKeys) {
    const dailyData = challengeScoreHistory[date];
    // filter date 
    if (monthStr) {
       if (dateStrToMonthStr(date) !== monthStr) continue;
    }
    // look for userName in ranking array 
    for (let player of dailyData.ranking) {
      if (player.playerName !== playerName) continue;

      totalScore += player.totalScore;
      totalDistance += player.totalDistance;
      allTimeStats.gamesPlayed++;
      if (player.rank===1) allTimeStats.wins++;
      if (player.rank<=3) allTimeStats.topThree++; 
      totalRank += player.rank; 
      if (player.totalScore>allTimeStats.personalBestScore) allTimeStats.personalBestScore = player.totalScore;
      // go thru every round 
      player.guesses.forEach(guess => {
        // first check for all time best worst rounds 
        if (guess.score>allTimeStats.personalBestRound) allTimeStats.personalBestRound = guess.score;
        if (guess.distance<allTimeStats.allTimeBestGuess) {
          allTimeStats.allTimeBestGuess = guess.distance;
          allTimeStats.allTimeBestGuessAddress = guess.address;
        }
        if (guess.distance>allTimeStats.allTimeWorstGuess) allTimeStats.allTimeWorstGuess = guess.distance;
        // go thru country guessing stats  
        if (!allTimeStats.countryStats[guess.correctCountryCode]) allTimeStats.countryStats[guess.correctCountryCode] = {right: 0, wrong: 0, total: 0};
        allTimeStats.countryStats[guess.correctCountryCode].total++;
        if (guess.rightCountry) {
          allTimeStats.countryStats[guess.correctCountryCode].right++;
          allTimeStats.correctCountries++;
        }
        if (!guess.rightCountry) allTimeStats.countryStats[guess.correctCountryCode].wrong++;
        // go thru region guesing stats 
        for (let region in guess.correctRegion) {
          allTimeStats.regionStats[region].total++; 
        }
        if (guess.rightRegion) {
          allTimeStats.correctRegions++;
          for (let region in guess.correctRegion) {
            allTimeStats.regionStats[region].right++; 
          }
        }
        if (!guess.rightRegion) {
          for (let region in guess.correctRegion) {
            allTimeStats.regionStats[region].wrong++; 
          }
        }
      });
    }
    if (dailyData.dailyInfo.bestGuess.playerName===playerName) allTimeStats.bestGuessOfTheDay++;
    if (dailyData.dailyInfo.worstGuess.playerName===playerName) allTimeStats.worstGuessOfTheDay++;

  }

  // calculate data 
  allTimeStats.averageScore = Number((totalScore / allTimeStats.gamesPlayed).toFixed(1));
  allTimeStats.averageRank = Number((totalRank / allTimeStats.gamesPlayed).toFixed(2));
  allTimeStats.averageDistance = Number(((totalDistance / allTimeStats.gamesPlayed) / 5).toFixed(2));
  // console.log('allTimeStats', allTimeStats);
  return allTimeStats;
}


module.exports = getAllTimeStats;



const dateStrToMonthStr = (str) => {
  const parts = str.split('-'); // Split the string by the hyphen character
  const monthYearString = `${parts[0]}-${parts[2]}`;
  return monthYearString
}