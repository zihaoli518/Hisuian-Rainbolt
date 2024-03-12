const puppeteer = require('puppeteer');
const fs = require('fs');
let historyObject = require('../challengeHistory.js');


require('dotenv').config();


const generateDailyChallengeLink = async () =>  {
  console.log('inside generateDailyChallengeLink...');
  

  const url = 'https://www.geoguessr.com/maps/world/play';
  // const url = 'https://www.geoguessr.com/signin?target=%2Fmaps%2Fworld%2Fplay'

  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();
  await page.goto(url);


  // Set the viewport to match the browser window size
  await page.setViewport({ width: 1920, height: 1080 });

  
  // login 
  await page.waitForSelector('#onetrust-accept-btn-handler');
  await page.click('#onetrust-accept-btn-handler');

  const geoCookie = process.env.GEOGUESSR_COOKIE; 
  await page.setCookie({name: '_ncfa', value: geoCookie});

  // reload page so cookie 
  await page.reload();

  await page.waitForSelector('img[alt="Challenge"]');
  await page.click('img[alt="Challenge"]');

  // change settings 
  const checkbox = await page.$('input[type="checkbox"].toggle_toggle__hwnyw');
  await checkbox.click();

  // Calculate the new position (e.g., halfway across the slider)
  const timeLimit = 40;

  const sliderElement = await page.$('.game-options_slider__JwEe2 .styles_rangeslider__y45WS');
  const box = await sliderElement.boundingBox(); 
  let newX = box.x + ((timeLimit/600) * box.width) + box.width*0.086;
  await page.mouse.click(newX, box.y, { clickCount: 2 });

  // disable move pan zoom 
  const checkboxes = await page.$$('.game-options_optionInput__TAqdI input[type="checkbox"].toggle_toggle__hwnyw');
  for (const checkbox of checkboxes) {
      await checkbox.click();
  }


  await page.waitForSelector('button[data-qa="invite-friends-button"]');
  await page.click('button[data-qa="invite-friends-button"]');

  await page.waitForSelector('input[name="copy-link"]');

  const gameURL = await page.evaluate(() => {
    const inputElement = document.querySelector('input[name="copy-link"]');
    console.log('inside gameURL await...', inputElement)
    return inputElement ? inputElement.value : null;
  });

  const dateToday = getDateStr();

  historyObject[dateToday] = gameURL;

  // Convert the object to a string and write it back to the file
  fs.writeFile('challengeHistory.js', `module.exports = ${JSON.stringify(historyObject, null, 2)};`, err => {
      if (err) {
          console.error('Error writing to file:', err);
      } else {
          console.log('Message history object saved to challengeHistory.js');
      }
  });

  return gameURL;
}




const getDateStr = (date) => {
  let currentDate = date;
  if (!date) currentDate = new Date();
  console.log('getDataStr....', date, currentDate)
  // Get the day, month, and year
  const day = currentDate.getDate();
  const month = currentDate.getMonth() + 1; // Month is zero-based, so add 1
  const year = currentDate.getFullYear();

  return`${month}-${day}-${year}`;
}


module.exports = generateDailyChallengeLink;
