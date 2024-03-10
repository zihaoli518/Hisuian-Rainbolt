import asyncio
from geoguessr import Geoguessr
from geoguessr.util import clean

from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Access environment variables
geo_cookie = os.getenv("GEOGUESSR_COOKIE")


# make the html request to API
url = 'https://www.geoguessr.com/challenge/VIT6mW6KIg0pthxj'
urlShort = 'VIT6mW6KIg0pthxj'

# challenge = client.get_challenge_infos(url)
# print(challenge)

geo = Geoguessr()

async def test():
        print('test() starting......')
        # initialize our instance of the class

        # make the html request to API
        raw_data = geo.get_challenge_scores(url)
        scores = clean(raw_data)
        print(scores)


def main():
  print('sup')
  result = asyncio.run(test());
  print('result')
  print('end of main()')
  
    # try:
    #     print("running test func")
    #     asyncio.run(test())
    # except Exception as e:
    #     print("An error occurred:", e)





if __name__ == "__main__":
    main()