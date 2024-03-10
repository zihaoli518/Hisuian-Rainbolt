const puppeteer = require('puppeteer');
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

  return gameURL;
}



module.exports = generateDailyChallengeLink;
