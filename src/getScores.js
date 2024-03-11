// input: a url such as 'https://www.geoguessr.com/challenge/sAF4oji97OiV6OTF?friends=false&limit=26&minRounds=5'
// output: an array of objects of scores such as 
// [{playerName: 'test', rank: 1, totalScore: 1000, totalDistance:'10km'}]
require('dotenv').config();
const fetch = require('node-fetch');

// const link = "https://geoguessr.com/api/v3/results/highscores/VIT6mW6KIg0pthxj?friends=false&limit=26&minRounds=5";

const cookie = `_ncfa=${process.env.GEOGUESSR_COOKIE}`; // Replace with your cookie value

const headers = {
  'Content-Type': 'application/json',
  'cookie': cookie
};

const getScores = async (challengeURL) => {
  console.log('inside getScores, ', challengeURL)
  // first convert it to the correct api endpoint 
  const challengeId = extractChallengeId(challengeURL);
  const apiEndpoint = `https://geoguessr.com/api/v3/results/highscores/${challengeId}?friends=false&limit=26&minRounds=5`
  try {
    const response = await fetch(apiEndpoint, { headers });
    const data = await response.json();
    const resultArray = [];
    let rankCounter = 1;
    for (const row of data.items) {
      const result = {};
      result['rank'] = rankCounter;
      rankCounter++;
      result['playerName'] = row.playerName;
      result['totalScore'] = row.totalScore;
      const distanceInMeters = row.game.player.totalDistanceInMeters;
      const distanceInKm = (distanceInMeters / 1000).toFixed(1);
      result['totalDistance'] = distanceInKm + 'km'; 
      result['countryStreak'] = 'coming soon'
      resultArray.push(result);
    }
    return resultArray;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};

const extractChallengeId = (url) => {
  const parts = url.split('/');
  // The challenge ID is the last part of the URL
  const challengeId = parts[parts.length - 1];
  return challengeId;
}

// getScores('https://www.geoguessr.com/challenge/sAF4oji97OiV6OTF')

module.exports = getScores;
