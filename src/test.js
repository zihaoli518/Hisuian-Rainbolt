const puppeteer = require('puppeteer');
require('dotenv').config();


const generateDailyChallengeLink = async (cookie) =>  {
  const url = 'https://www.geoguessr.com/maps/world/play';
  // const url = 'https://www.geoguessr.com/signin?target=%2Fmaps%2Fworld%2Fplay'

  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();
  await page.goto(url);

  const test = await page.evaluate(() => {

  })

  
  // login 
  await page.waitForSelector('#onetrust-accept-btn-handler');
  await page.click('#onetrust-accept-btn-handler');

  const geoCookie = process.env.GEOGUESSR_COOKIE; 
  await page.setCookie({name: '_ncfa', value: geoCookie});

  // reload page so cookie 
  await page.reload();

  await page.waitForSelector('img[alt="Challenge"]');
  await page.click('img[alt="Challenge"]');

  await page.waitForSelector('button[data-qa="invite-friends-button"]');
  await page.click('button[data-qa="invite-friends-button"]');

  await page.waitForSelector('input[name="copy-link"]');

  const gameURL = await page.evaluate(() => {
    const inputElement = document.querySelector('input[name="copy-link"]');
    console.log('inside gameURL await...', inputElement)
    return inputElement ? inputElement.value : null;
  });

  console.log(gameURL);
  // await page.waitForSelector('#__next > div > div.version4_layout__KcIcs.version4_noSideTray__ayVjE > div.version4_content__oaYfe > main > div > div > div > a.button_link__xHa3x.button_variantSecondary__lSxsR')
  // await page.click('#__next > div > div.version4_layout__KcIcs.version4_noSideTray__ayVjE > div.version4_content__oaYfe > main > div > div > div > a.button_link__xHa3x.button_variantSecondary__lSxsR')
  
  // await page.waitForSelector('#email');
  // await page.waitForSelector('#password');
  // page.type('#email', process.env.GEOGUESSR_USERNAME);
  // page.type('#password', process.env.GEOGUESSR_PASSWORD);
  // page.click('#__next > div > div.version4_layout__KcIcs.version4_noSideTray__ayVjE > div.version4_content__oaYfe > main > div > div > form > div > div.auth_forgotAndLoginButtonWrapper__PiLQi > div.form-field_formField__beWhf.form-field_typeActions__tMY1O > div > button')
  // console.log(page)
}


generateDailyChallengeLink();