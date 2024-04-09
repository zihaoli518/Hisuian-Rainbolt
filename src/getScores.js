// input: a url such as 'https://www.geoguessr.com/challenge/sAF4oji97OiV6OTF?friends=false&limit=26&minRounds=5'
// output: an array of objects of scores such as 
// [{playerName: 'test', rank: 1, totalScore: 1000, totalDistance:'10km'}]
require('dotenv').config();
const fs = require('fs');
const fetch = require('node-fetch');
const GEOCODING_API_KEY = process.env.GEOCODING_API_KEY;
const countryCodeDict = require('./utils/countryCodes.js');
const adminDiscordID = process.env.ADMIN_DISCORD_ID;



let challengeScoreHistory = require('../challengeScoreHistory.js');



const cookie = `_ncfa=${process.env.GEOGUESSR_COOKIE}`; // Replace with your cookie value
const headers = {
  'Content-Type': 'application/json',
  'cookie': cookie,
  'User-Agent': 'Your User Agent String Here'
};



// for daily awards 
let dailyBestCounter = Infinity; 
let dailyWorstCounter = 0; 
let dailyInfo = {
  bestGuess: {playerName: '', score: 0, distance: 0, address: '', countrycode: '' },
  worstGuess: {playerName: '', score: 0, distance: 0, guessCountry: '', correctCountry: '', guessCountryCode: '' },
}


const getScores = async (challengeURL, dateStr, interaction) => {
  console.log('inside getScores, ', challengeURL);
    // Reset global variables
    resetDailyInfo();
  // first convert it to the correct api endpoint 
  const challengeId = extractChallengeId(challengeURL);
  const apiEndpoint = `https://geoguessr.com/api/v3/results/highscores/${challengeId}?friends=false&limit=26&minRounds=5`
  // format data to be sent back 
  try {
    const response = await fetch(apiEndpoint, { headers });
    const data = await response.json();
    // // check if cached 
    console.log('checking if url is cached....');
    const cached = challengeScoreHistory[dateStr];
    if (cached && cached.ranking && cached.ranking.length === data.items.length) {
      console.log('CACHED!')
      return {rankingArray: cached.ranking, dailyInfo: cached.dailyInfo};
    }
    // process data if new data found 
    const rankingArray = [];
    let rankCounter = 1;

    for (const row of data.items) {
      let result = {};
      // check if already cached 
      const foundPlayer = cached ? cached.ranking.find(cachedPlayer => cachedPlayer.playerName===row.playerName) : undefined;

      if (foundPlayer) {
        foundPlayer.rank = rankCounter;
        rankCounter++;
        rankingArray.push(foundPlayer);
        continue;
      }

      result['rank'] = rankCounter;
      result['playerName'] = row.playerName;
      result['totalScore'] = row.totalScore;
      const distanceInMeters = row.game.player.totalDistanceInMeters;
      const distanceInKm = Number((distanceInMeters / 1000).toFixed(1));
      result['totalDistance'] = distanceInKm; 

      const guessData = await checkCountryCodes(row.game.rounds, row.game.player.guesses, row.playerName);
      console.log('guessData: ', guessData)

      result['countryRight'] = guessData.totalRight;
      result['guesses'] = guessData.resultArray;
      result['averageDistance'] = distanceInKm/5;
      rankingArray.push(result);
      rankCounter++;
    }
    updatechallengeLinksHistory(dateStr, challengeURL, rankingArray, dailyInfo);

    return {rankingArray: rankingArray, dailyInfo: dailyInfo};

  } catch (error) {
    console.error('Error fetching data in getScores:', error, typeof(error), error.type);
    const errorType = error.type;
    if (interaction) interaction.reply('an error has occured: ' + errorType + '. this is most likely due to no one completing the challenge yet ' + `<@${adminDiscordID}>`)
    throw error;
  }
};

// reset global variables 
const resetDailyInfo = () => {
  dailyBestCounter = Infinity; 
  dailyWorstCounter = 0; 
  dailyInfo = {
    bestGuess: {playerName: '', score: 0, distance: 0, address: '', countrycode: '' },
    worstGuess: {playerName: '', score: 0, distance: 0, guessCountry: '', correctCountry: '', guessCountryCode: '' },
  }
}


async function checkCountryCodes(rounds, guesses, playerName) {
  console.log('inside checkCountryCodes.......', playerName);

  
  const resultArray = [];
  let totalRight = 0;
  const promiseArray = [];

  for (let i = 0; i < guesses.length; i++) {
    const guess = guesses[i];
    const result = { rightCountry: false };
    const { lat, lng, distanceInMeters } = guess;
    const roundCode = rounds[i].streakLocationCode;

    console.log('right before guessData');
    const promise = getCountryCode(lat, lng, i).then(guessData => {
      console.log('right after guessData, ', guessData);
      if (guessData.error==='Unable to geocode') {

      }
      const distance = Number((distanceInMeters / 1000).toFixed(1));
      result['lat'] = lat;
      result['lng'] = lng;
      result['correctCountryCode'] = roundCode;
      const guessCode = guessData.address && guessData.address.country_code ? guessData.address.country_code.toLowerCase() : '';
      result['guessCountryCode'] = guessCode;
      if (roundCode === guessCode) {
        result.rightCountry = true;
        totalRight++;
      }
      result['distance'] = distance;
      result['score'] = guess.roundScoreInPoints;
      result['address'] = guessData.display_name ? guessData.display_name : 'ocean lmao';

      resultArray.push(result);

      // check and update daily best guess 
      if (distance > 0 && distance < dailyBestCounter) {
        dailyBestCounter = distance; 
        dailyInfo.bestGuess = {playerName: playerName, score: result.score, distance: distance, address: result.address, countryCode: roundCode}
      }
      // check and update daily worse guess 
      if (distance > 0 && distance > dailyWorstCounter) {
        dailyWorstCounter = distance; 
        dailyInfo.worstGuess = {playerName: playerName, score: result.score, distance: distance, guessCountry: countryCodeDict[guessCode] ? countryCodeDict[guessCode] : 'ocean', correctCountry: countryCodeDict[roundCode], guessCountryCode: guessCode}
      }
    });

    promiseArray.push(promise);
  }

  await Promise.all(promiseArray);

  console.log('dataArray!');
  return { resultArray, totalRight };
}







async function getCountryCode(latitude, longitude, i) {
  console.log('inside getCountryCode...', i);
  const url = `https://geocode.maps.co/reverse?lat=${latitude}&lon=${longitude}&api_key=${GEOCODING_API_KEY}`;
  
  // Create a promise wrapper for fetch
  const fetchWithDelay = async () => {
        try {
          const response = await fetch(url, { headers });
          if (!response.ok) {
            throw new Error(`Failed to fetch country code: ${response.statusText}`);
          }
          const data = await response.json();
          // console.log(data);
          return(data);
        } catch (error) {
          console.error('Error fetching country code:', error);
          if (interaction) interaction.reply('an error has occured: ' + error + '. this is most likely due to no one completing the challenge yet ' + `<@${adminDiscordID}>`)
        }
  };

  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const guessCode = await fetchWithDelay();
        resolve(guessCode);
      } catch (error) {
        reject(error);
      }
    }, 2000 * (i+1));
  });
}

const updatechallengeLinksHistory = async (dateStr, url, rankingArray, dailyInfo) => {
  challengeScoreHistory[dateStr] = {url: url, ranking: rankingArray, dailyInfo: dailyInfo}; 

  fs.writeFile('challengeScoreHistory.js', `module.exports = ${JSON.stringify(challengeScoreHistory, null, 2)};`, err => {
    if (err) {
        console.error('Error writing to file:', err);
        return;
    } else {
        console.log('getScores.js made an update to challengeScoreHistory');
    }
  });
}




module.exports = getScores;



// utils
const extractChallengeId = (url) => {
  console.log(url)
  const parts = url.split('/');
  // The challenge ID is the last part of the URL
  const challengeId = parts[parts.length - 1];
  return challengeId;
}

// getScores('https://www.geoguessr.com/challenge/RFFxGcCIY2sYOnxG')
// console.log(getCountryCode(29.94524574279785, -95.2242660522461))