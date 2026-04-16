# NBA Data

This folder contains the datasets that we will be using for our project. We have 3 main datasets:

- nba_awards/ : Details about the awards given to players and teams in the NBA (MVP, ROY, DPOY, etc.) : https://www.kaggle.com/api/v1/datasets/download/sumitrodatta/nba-aba-baa-stats

- nba_database/ : Contains player and team statistics for every NBA game from 1947 to the present. It is historical and comprehensive, updated daily. It provides a solid foundation for exploring basketball history, player performance, and team dynamics : https://www.kaggle.com/api/v1/datasets/download/eoinamoore/historical-nba-data-and-player-box-scores

- nba_play_by_play_shot_data/ : A large-scale play-by-play and shot-detail dataset covering both NBA and WNBA games, collected from multiple public sources (e.g., official league APIs and stats sites). It provides every in-game event—from period starts, jump balls, fouls, turnovers, rebounds, and field-goal attempts through free throws—along with detailed shot metadata (shot location, distance, result, assisting player, etc.) : https://www.kaggle.com/api/v1/datasets/download/brains14482/nba-playbyplay-and-shotdetails-data-19962021

- nba_salary/ : Contains player/team salary data for the NBA from 1990 to 2026, scraped from HoopsHype (https://eu.hoopshype.com/salaries/players/ & https://eu.hoopshype.com/salaries/teams/) using the script in the folder (scrapping for each year, then merge into one csv, finally match to the personId with the player database for future use). It includes player names, seasons, and corresponding salaries : https://drive.google.com/drive/folders/1AI6Z8fIpP7RxhImdtOexrn6dgmB05izz?usp=share_link

- nba_team_colors/ : Contains the main color palette for each NBA team (source: https://www.trucolor.net/portfolio/national-basketball-association-official-colors-franchise-records-1946-1947-through-present/) : https://drive.google.com/drive/folders/1-yfOkoxvzeTDWPNqtZtBHt1_TOxrQw8o?usp=sharing

- processed/ : Contains the processed data files that are used for visualization. The files in this folder are generated from the raw datasets after cleaning, transforming, and aggregating the data to make it suitable for analysis and visualization : https://drive.google.com/drive/folders/1fipeswQbiNC3rnPsH2NQ-axi6x91Rk9n?usp=share_link

