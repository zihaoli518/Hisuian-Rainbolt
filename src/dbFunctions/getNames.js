const db = require('../dbModel.js');
const fetch = require('node-fetch')

// goes thru this channel to match usernames to discordIDs and updates database
const channelID = process.env.USERNAME_CHANNEL_ID; 
