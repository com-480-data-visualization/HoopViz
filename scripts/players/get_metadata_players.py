import time
import random

from tqdm import tqdm
from nba_api.stats.endpoints import commonplayerinfo


# NOTE: Must be run after running the players.ipynb notebook, which creates the player_seasons.csv file containing
# all the player ids and names
DATA_DIR = "data/processed/"
FILENAME = DATA_DIR + "players_metadata.csv"
SOURCE_PLAYERS_DATA = DATA_DIR + "player_seasons.csv"


def convert_to_centimeters(height_str):
    if isinstance(height_str, str) and "-" in height_str:
        feet, inches = height_str.split("-")
        return int(int(feet) * 30.48 + int(inches) * 2.54)
    return None


def convert_to_kilograms(weight_str):
    if isinstance(weight_str, str) and weight_str.isdigit():
        return int(int(weight_str) * 0.453592)
    return None


def get_player_metadata(id, max_retries=3, retry_delay=1):
    for _ in range(max_retries):
        try:
            data = commonplayerinfo.CommonPlayerInfo(id, timeout=10).get_dict()
            return {
                "personId": data['resultSets'][0]['rowSet'][0][0],
                "firstName": data['resultSets'][0]['rowSet'][0][1],
                "lastName": data['resultSets'][0]['rowSet'][0][2],
                "birthDate": data['resultSets'][0]['rowSet'][0][7][:-9],  # remove the time part
                "height": convert_to_centimeters(data['resultSets'][0]['rowSet'][0][11]),
                "weight": convert_to_kilograms(data['resultSets'][0]['rowSet'][0][12]),
                "nbSeasons": data['resultSets'][0]['rowSet'][0][13],
                "jerseyNumber": data['resultSets'][0]['rowSet'][0][14],
                "position": data['resultSets'][0]['rowSet'][0][15],
                "startYear": data['resultSets'][0]['rowSet'][0][24],
                "endYear": data['resultSets'][0]['rowSet'][0][25],
                "draftYear": data['resultSets'][0]['rowSet'][0][29],
                "draftRound": data['resultSets'][0]['rowSet'][0][30],
                "draftNumber": data['resultSets'][0]['rowSet'][0][31]
            }
        except KeyboardInterrupt:
            raise
        except Exception as e:
            print(f"Error fetching metadata for player id {id}: {e}")
            time.sleep(retry_delay)

    raise Exception(f"Failed to fetch metadata for player id {id} after {max_retries} retries")


def save_metadata(player_metadata, new_metadata):
     # save the metadata to a csv file
    to_save = pd.concat([player_metadata, pd.DataFrame(new_metadata)], ignore_index=True).sort_values("personId")
    to_save["birthDate"] = pd.to_datetime(to_save["birthDate"], errors='coerce').dt.date
    to_save.to_csv(FILENAME, index=False)


if __name__ == "__main__":
    import os
    import pandas as pd

    player_seasons = pd.read_csv(SOURCE_PLAYERS_DATA).sort_values("personId")
    player_ids = player_seasons["personId"].unique()
    
    if os.path.exists(FILENAME):
        player_metadata = pd.read_csv(FILENAME)
    else:
        player_metadata = pd.DataFrame(columns=["personId", "firstName", "lastName", "birthDate", "height", "weight", 
                                                "nbSeasons", "jerseyNumber", "position", "startYear", "endYear", "draftYear", 
                                                "draftRound", "draftNumber"])
        
    # checkpoint: keep only player id that are not already in the metadata file
    player_ids_to_fetch = [int(pid) for pid in player_ids if pid not in player_metadata["personId"].values]
    print(f"{len(player_ids_to_fetch)} player ids to fetch out of {len(player_ids)} total player ids...")
    new_metadata = []

    player_ids_to_fetch.remove(78493) # this player id doesn't exists in the endpoint

    for player_id in tqdm(player_ids_to_fetch, desc="Fetching player metadata"):
        try:
            time.sleep(random.uniform(0.5, 1))  # to avoid hitting the API rate limit
            metadata = get_player_metadata(player_id)
            new_metadata.append(metadata)
        except (Exception, KeyboardInterrupt) as e:
            save_metadata(player_metadata, new_metadata)
            print(f"Error fetching metadata for player id {player_id}: {e}")
            break
    
    save_metadata(player_metadata, new_metadata)
