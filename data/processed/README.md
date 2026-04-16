# Processed Data

This folder contains the processed data files that are used for visualization.

Can be found here: 

## Description of files

### player_seasons.csv

Contains aggregated season-level statistics for players. Each row corresponds to a player's performance in a specific season, with the following columns:

- `season`: The NBA season (e.g., 2020 for the 2020-2021 season)
- `personId`: Unique identifier for the player (NBA player ID)
- `firstName`, `lastName`: Player's first and last name
- `gameType`: Regular Season or Playoffs
- `teamScore`: Average number of points scored by the player's team in the season
- `opponentScore`: Average number of points scored by the opponent teams in the season
- `points`, `assists`, `rebounds`, `blocks`, `steals`, `turnovers`: Average per game general statistics for the player in the season
- `pointsTotal`, `assistsTotal`, `reboundsTotal`, `blocksTotal`, `stealsTotal`, `turnoversTotal`: Sum throughout the season of the corresponding statistics for the player
- `fieldGoalsMade`, `fieldGoalsAttempted`, `threePointersMade`, `threePointersAttempted`, `freeThrowsMade`, `freeThrowsAttempted`: Sum throughout the season of the corresponding shot statistics for the player
- `plusMinusPoints`: Average plus/minus points per game for the player in the season (i.e., the average point differential when the player is on the court)
- `foulsPersonal`: Average personal fouls per game for the player in the season
- `numMinutes`: Average minutes played per game for the player in the season
- `win`: Number of games won by the player's team in the season
- `gamesPlayed`: Number of games played by the player in the season
- `proportionThreePoint`: Proportion of three-point shots attempted out of total field goal attempts for the player in the season
- `fieldGoalsPercentage`, `threePointersPercentage`, `freeThrowsPercentage`: Shooting percentages for the player in the season
- `salary`: Average salary for the player in the season (if available, otherwise NaN)

### player_games.csv

TODO

### shot_events.csv

TODO

### player_metadata.csv

Contains metadata about players (from nba_api), with the following columns:

- `personId`: Unique identifier for the player (NBA player ID)
- `firstName`: Player's first name
- `lastName`: Player's last name
- `birthDate`: Player's birth date (in datetime format)
- `height`: Player's height in centimeters
- `weight`: Player's weight in pounds
- `nbSeasons`: Number of seasons the player has played in the NBA
- `jerseyNumber`: The jersey number the player wore in the NBA (e.g., 23)
- `position`: The position the player played in the NBA (e.g., "Guard", "Forward", "Center")
- `startYear`: The year the player started playing in the NBA
- `endYear`: The year the player ended playing in the NBA
- `draftYear`: The year the player was drafted into the NBA
- `draftRound`: The round in which the player was drafted
- `draftNumber`: The number of the pick in the draft

### team_seasons.csv

Contains aggregated season-level statistics for teams. Each row corresponds to a team's performance in a specific season, with the following columns:

- `season`: The NBA season (e.g., 2020 for the 2020-2021 season)
- `teamId`: Unique identifier for the team (NBA team ID)
- `gameType`: Regular Season or Playoffs
- `teamName`: Name of the team (e.g., "Lakers")
- `teamCity`: City of the team (e.g., "Los Angeles")
- `teamScore`: Average number of points scored by the team in the season
- `opponentScore`: Average number of points scored by the opponent teams in the season
- `assists`, `rebounds`, `blocks`, `steals`, `turnovers`: Average per game general statistics for the team in the season
- `teamScoreTotal`, `opponentScoreTotal`, `assistsTotal`, `reboundsTotal`, `blocksTotal`, `stealsTotal`, `turnoversTotal`: Sum throughout the season of the corresponding statistics for the team
- `fieldGoalsMade`, `fieldGoalsAttempted`, `threePointersMade`, `threePointersAttempted`, `freeThrowsMade`, `freeThrowsAttempted`: Average per game shot statistics for the team in the season
- `fieldGoalsPercentage`, `threePointersPercentage`, `freeThrowsPercentage`: Shooting percentages for the team in the season
- `proportionThreePoint`: Proportion of three-point shots attempted out of total field goal attempts for the team in the season
- `plusMinusPoints`: Average plus/minus points per game for the team in the season (i.e., the average point differential when the team is on the court)
- `foulsPersonal`: Average personal fouls per game for the team in the season
- `numMinutes`: Average minutes played per game for the team in the season
- `win`: Number of games won by the team in the season
- `losses`: Number of games lost by the team in the season
- `gamesPlayed`: Number of games played by the team in the season (should be 82 for regular season, but can be less for older seasons or playoffs)
- `salary`: Average salary for the team in the season (if available, otherwise NaN)


### team_games.csv

Contains detailed game-level statistics for teams. Each row corresponds to a team's performance in a specific game, with the following columns:

- `gameId`: Unique identifier for the game
- `gameDateTimeEst`: Date and time of the game in Eastern Standard Time
- `teamCity`: City of the team (e.g., "Los Angeles")
- `teamName`: Name of the team (e.g., "Lakers")
- `teamId`: Unique identifier for the team (NBA team ID)
- `opponentTeamCity`: City of the opponent team (e.g., "Boston")
- `opponentTeamName`: Name of the opponent team (e.g., "Celtics")
- `opponentTeamId`: Unique identifier for the opponent team (NBA team ID)
- `home`: Boolean indicating if the team was playing at home (0) or away (1)
- `win`: Boolean indicating if the team won (1) or lost (0) the game
- `season`: The NBA season (e.g., 2020 for the 2020-2021 season)
- `gameType`: Regular Season or Playoffs
- `teamScore`: Number of points scored by the team in the game
- `opponentScore`: Number of points scored by the opponent team in the game
- `numMinutes`: Duration of the game in minutes (should be 48 for regular season, but can be more for overtime games)
- `assists`, `rebounds`, `reboundsDefensive`, `reboundsOffensive`, `blocks`, `steals`, `turnovers`: General statistics for the team in the game
- `foulsPersonal`: Number of fouls committed by the team in the game
- `fieldGoalsMade`, `fieldGoalsAttempted`, `threePointersMade`, `threePointersAttempted`, `freeThrowsMade`, `freeThrowsAttempted`: Shot statistics for the team in the game
- `fieldGoalsPercentage`, `threePointersPercentage`, `freeThrowsPercentage`: Shooting percentages for the team in the game


### team_metadata.csv

Contains metadata about teams, with the following columns:

- `teamId`: Unique identifier for the team (NBA team ID)
- `teamAbbrev`: Abbreviation of the team name (e.g., "LAL" for Los Angeles Lakers)
- `teamSlug`: Slug version of the team name (e.g., "los-angeles-lakers" should be used to get the team logo from the https://i.logocdn.com/nba/{year}/{teamSlug}.svg URL)
- `Color1`, `Color2`, `Color3`, `Color4`, `Color5`: Colors associated with the team (in hexadecimal format, e.g., "#552583")
- `seasonFounded`: The season in which the team was founded (e.g., 1947 for the first NBA season)
- `seasonActiveTill`: The most recent season in which the team was active (e.g., 2100 for the active teams, or a past season for defunct teams)