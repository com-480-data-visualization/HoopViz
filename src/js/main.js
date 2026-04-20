import { BubbleMap } from "./BubbleMap.js";
import { Screens } from "./Screens.js";
import { SeasonsLoader } from "./SeasonsLoader.js";
import { MetadataLoader } from "./MetadataLoader.js";
import * as Stats from "./stats.js";

// TODO set all attributes

new Screens({
  containerSelector: "#screens",
  screenSelector: "#screen-select",
  minYear: 1980,
  maxYear: 2025,
  // teams BubbleMap
  leftBubbleMap: new BubbleMap({
    containerSelector: "#teams",
    seasonsLoader: new SeasonsLoader("./data/team_seasons.csv", (row) => row["teamId"]),
    metadataLoader: new MetadataLoader("./data/team_metadata.csv", (row) => row["teamId"]),
    bubbleContent: (row) => row["teamAbbrev"],
    bubbleColor: (row) => row["Color1"],
    statsUpdate: Stats.updateTeamStats,
    attributes: [
      // display name, row to value function
      ["Wins", (r) => parseFloat(r["win"])],
      ["Average points", (r) => parseFloat(r["teamScore"])],
      ["Three points %", (r) => parseFloat(r["threePointersPercentage"])],
      ["Assists", (r) => parseFloat(r["assists"])],
      ["Rebounds", (r) => parseFloat(r["rebounds"])],
      ["Blocks", (r) => parseFloat(r["blocks"])],
      ["Steals", (r) => parseFloat(r["steals"])],
      // ["Win %", (r) => parseFloat(r["win"]) / parseFloat(r["gamesPlayed"])],
    ],
  }),
  // players BubbleMap
  rightBubbleMap: new BubbleMap({
    containerSelector: "#players",
    seasonsLoader: new SeasonsLoader("./data/player_seasons.csv", (row) => row["personId"]),
    metadataLoader: new MetadataLoader("./data/players_metadata.csv", (row) => row["personId"]),
    bubbleContent: (row) => row["firstName"] + " " + row["lastName"],
    bubbleColor: (row) => "#005ce6",
    statsUpdate: Stats.updatePlayerStats,
    attributes: [
      // display name, row to value function
      ["Wins", (r) => parseFloat(r["win"])],
      ["Average points", (r) => parseFloat(r["points"])],
      ["Three points %", (r) => parseFloat(r["threePointersPercentage"])],
      ["Free throws %", (r) => parseFloat(r["freeThrowsPercentage"])],
      ["Assists", (r) => parseFloat(r["assists"])],
      ["Rebounds", (r) => parseFloat(r["rebounds"])],
      ["Blocks", (r) => parseFloat(r["blocks"])],
      ["Steals", (r) => parseFloat(r["steals"])],
    ],
  }),
})
