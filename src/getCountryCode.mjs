import fetch from 'node-fetch';


async function getCountryCode(latitude, longitude) {
  const nominatimUrl = `https://nominatim.openstreetmap.org/reverse.php?lat=${latitude}&lon=${longitude}`;
  const response = await fetch(nominatimUrl);
  const data = await response.json();

  if (!response.ok) {
      throw new Error(`Failed to fetch country code: ${data.error}`);
  }

  return data.address.country_code.toUpperCase();
}

// Example usage:
const latitude = 51.5074; // London
const longitude = -0.1278; // London
getCountryCode(latitude, longitude)
  .then(countryCode => console.log(`Country code: ${countryCode}`))
  .catch(error => console.error(`Error: ${error.message}`));