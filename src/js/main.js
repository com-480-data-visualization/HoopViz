import { BubbleMap } from "./BubbleMap.js";
import { Screens } from "./Screens.js";
import { SeasonsLoader } from "./SeasonsLoader.js";
import * as Stats from "./stats.js";

new Screens({
  containerSelector: "#screens",
  screenSelector: "#screen-select",
  minYear: 1980,
  maxYear: 2025,
  // teams BubbleMap
  leftBubbleMap: new BubbleMap({
    containerSelector: "#teams",
    seasonsLoader: new SeasonsLoader("./data/team_seasons.csv", (row) => row.teamName),
    statsUpdate: Stats.updateTeamStats,
    attributes: [
      // display name, row to value function, aggregation function
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
    seasonsLoader: new SeasonsLoader("./data/team_seasons.csv", (row) => row.teamName),
    statsUpdate: Stats.updateTeamStats,
    attributes: [
      // display name, row to value function, aggregation function
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
})
