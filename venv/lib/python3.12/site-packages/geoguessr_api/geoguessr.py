from urllib import parse
import requests
from models import *

class Geoguessr:
    """Represents a geoguessr connection that connects to the Geoguessr API.
    This class is used to interact with the Geoguess API/
    """
    def __init__(self, _ncfa) -> None:
        self._ncfa = _ncfa
        self.headers = {
            "Content-Type": "application/json",
            "cookie": f"_ncfa={self._ncfa}",
        }
        self.session = requests.Session()
        self.session.headers = self.headers
        self.me = None
        self.me_stats = None
        self.friends = None

    def get_all_my_infos(self):
        """
        Retrieves all the necessary information for the current user.

        This function sends a GET request to the Geoguessr API to retrieve the user's profile information
        using the provided session. It then extracts the user's ID from the response and stores it in the
        'id' attribute of the class. The function also calls the 'get_user_infos' method to retrieve the
        user's detailed information, the 'get_user_stats' method to retrieve the user's stats, and the
        '__get_my_friends_list' method to retrieve the user's friends list.

        Parameters:
            self (object): The instance of the class that the method is called on.

        Returns:
            None
        """
        with self.session.get("https://www.geoguessr.com/api/v3/profiles/") as r:
            self.id = (r.json())["user"]["id"]
        self.me = self.get_user_infos(self.id)
        self.me_stats = self.get_user_stats(self.id)
        self.friends = self.__get_my_friends_list()

    def __get_my_friends_list(self):
        with self.session.get(
            "https://www.geoguessr.com/api/v3/social/friends/summary?page=0&fast=true"
        ) as r:
            js = r.json()
            return {friend["nick"]: friend["userId"] for friend in js["friends"]}

    def get_user_infos(self, userId: str) -> GeoguessrProfile:
        """Give you all Geoguessr profile information about a player with the player's id

        Args:
            userId (str): The Geoguessr Id of the player you want the informations of

        Returns:
            GeoguessrProfile: All the informations about the player's profile
        """
        with self.session.get(
            f"https://www.geoguessr.com/api/v3/users/{userId}"
        ) as r:
            if r.status == 200:
                user = GeoguessrProfile(r.json())
                user.add_stats(self.get_user_stats(user.id))
                return user

    def get_user_stats(self, userId: str) -> GeoguessrStats:
        """Give you all Geoguessr stats about a player with the player's id

        Args:
            userId (str): The Geoguessr Id of the player you want the stats of

        Returns:
            GeoguessrStats: All the stats about the player's profile
        """

        with self.session.get(
            f"https://www.geoguessr.com/api/v4/stats/users/{userId}"
        ) as r:
            return GeoguessrStats(r.json())

    def play_challenge(self, challenge_url: str):
        """Play a challenge with your account (5 guesses are in 0,0 coordinates by default)

        Args:
            challenge_url (str): The URL of the challenge you want to play
        """
        challenge_token = (
            challenge_url.split("/")[-1] if "/" in challenge_url else challenge_url
        )
        for i in range(5):
            with self.session.post(
                f"https://www.geoguessr.com/api/v3/challenges/{challenge_token}",
                json={},
            ) as r:
                js = r.json()
                game_token = js["token"]
            self.__play_round(game_token, i)

    def __play_round(self, game_token: str, round_number: int):
        request_data = {"token": game_token, "lat": 0, "lng": 0, "timedOut": True}

        self.session.post(
            f"https://www.geoguessr.com/api/v3/games/{game_token}", json=request_data
        )
        if round_number != 4:
            self.session.get(
                f"https://www.geoguessr.com/api/v3/games/{game_token}?client=web"
            )

    def get_challenge_score(self, challenge_url: str):
        """Get scores on a standard challenge

        Args:
            challenge_url (str): The URL of the challenge you want to get results of

        Returns:
            list[GeoguessrScore]: A list of different scores for the challenge
        """
        challenge_token = (
            challenge_url.split("/")[-1] if "/" in challenge_url else challenge_url
        )

        link = f"https://geoguessr.com/api/v3/results/highscores/{challenge_token}?friends=false&limit=26&minRounds=5"
        r = self.session.get(link)

        if r.status != 200:  # Map not already played
            self.play_challenge(challenge_url)
            r = self.session.get(link)

        js = r.json()

        results = js["items"]
        pagination_token = js["paginationToken"]

        while pagination_token is not None:
            link = f"https://geoguessr.com/api/v3/results/highscores/{challenge_token}?friends=false&limit=26&minRounds=5&paginationToken={parse.quote(pagination_token)}"
            with self.session.get(link) as r:
                js = r.json()

            results += js["items"]
            pagination_token = js["paginationToken"]

        return [GeoguessrScore(result) for result in results]

    def get_challenge_infos(self, challenge_url: str):
        """Get informations about a challenge

        Args:
            challenge_url (str): The URL of the challenge you want infos of

        Returns:
            GeoguessrChallenge: All infos about the challenge
        """
        challenge_token = (
            challenge_url.split("/")[-1] if "/" in challenge_url else challenge_url
        )
        with self.session.get(
            f"https://www.geoguessr.com/api/v3/challenges/{challenge_token}"
        ) as r:
            js = r.json()

        seconds = js["challenge"]["timeLimit"]

        js["challenge"]["str_timeLimit"] = (
            "No time limit"
            if seconds == 0
            else f"{(str(int(seconds / 60)) + ' min ') if int(seconds / 60) != 0 else ''}{(str(int(seconds % 60)) + ' sec') if int(seconds % 60) != 0 else ''}".strip()
        )
        move = not js["challenge"]["forbidMoving"]
        pan = not js["challenge"]["forbidRotating"]
        zoom = not js["challenge"]["forbidZooming"]

        js["mode"] = "Unknown"

        if move and pan and zoom:
            js["mode"] = "Move"
        elif not move and pan and zoom:
            js["mode"] = "No Move"
        elif not (move or pan or zoom):
            js["mode"] = "NMPZ"

        return GeoguessrChallenge(js)

    def get_map_infos(self, map_url: str):
        """Get informations about a map

        Args:
            map_url (str): The URL of the map you want info from

        Returns:
            GeoguessrMap: All infos about the map
        """
        map_token = map_url.split("/")[-1] if "/" in map_url else map_url
        with self.session.get(
            f"https://www.geoguessr.com/api/maps/{map_token}"
        ) as r:
            js = r.json()
        with self.session.get(
            f"https://www.geoguessr.com/api/v3/search/map?q={map_token}"
        ) as r:
            js['coordinateCount'] = (r.json())[0]["coordinateCount"]

        return GeoguessrMap(js)

    def generate_challenge(self, map_url: str, move: bool = True, pan: bool = True, zoom: bool = True, timeLimit: int = 120, play_map: bool = True) -> str:
        """
        Generates a challenge based on a given map URL.

        Parameters:
            map_url (str): The URL of the map to generate the challenge from.
            move (bool, optional): Whether moving is allowed in the challenge. Defaults to True.
            pan (bool, optional): Whether panning (rotating) is allowed in the challenge. Defaults to True.
            zoom (bool, optional): Whether zooming is allowed in the challenge. Defaults to True.
            timeLimit (int, optional): The time limit for the challenge in seconds. Defaults to 120.
            play_map (bool, optional): Whether to automatically play the generated challenge. Defaults to True.

        Returns:
            str: The URL of the generated challenge.

        """
        map_id = map_url.split("/")[-1] if "/" in map_url else map_url
        url = "https://www.geoguessr.com/api/v3/challenges"
        data = {
            "map": map_id,
            "forbidMoving": not move,
            "forbidRotating": not pan,
            "forbidZooming": not zoom,
            "timeLimit": timeLimit,
            "rounds": 5
        }

        with self.session.post(url, json=data) as response:
            js = response.json()

        challenge_token = js["token"]
        challenge_link = f"https://www.geoguessr.com/challenge/{challenge_token}"

        if play_map:
            self.play_challenge(challenge_link)

        return challenge_link

    def get_duel_info(self, duel_url: str):
        pass

    def __del__(self):
        self.session.close()
