const puppeteer = require('puppeteer');
require('dotenv').config();
const fetch = import('node-fetch');


import('node-fetch').then(({ default: fetch }) => {
  const link = "https://geoguessr.com/api/v3/results/highscores/VIT6mW6KIg0pthxj?friends=false&limit=26&minRounds=5";

  const cookie = `_ncfa=${process.env.GEOGUESSR_COOKIE}`; // Replace with your cookie value

  const headers = {
    'Content-Type': 'application/json',
    'cookie': cookie
  };
  fetch(link, {headers})
    .then(data => data.json())
    .then(data => {
      console.log(data); // Handle the response data here
    })
    .catch(error => {
      console.error('Error fetching data:', error);
    });
});


