import { BubbleMap } from "./BubbleMap.js";
import { SeasonsLoader } from "./SeasonsLoader.js";
import * as Stats from "./stats.js";

// Team Bubble Map
new BubbleMap({
  containerSelector: "#teams",
  seasonsLoader: new SeasonsLoader("./team_seasons.csv", (row) => row.teamName),
  statsUpdate: Stats.updateTeamStats,
  attributes: [
    ["Wins", (r) => parseFloat(r["win_norm"])],
    ["Win %", (r) => parseFloat(r["win"]) / parseFloat(r["gamesPlayed"])],
    ["Average points", (r) => parseFloat(r["teamScore_norm"])],
    ["Three points %", (r) => parseFloat(r["threePointersPercentage_norm"])],
    ["Assists", (r) => parseFloat(r["assists_norm"])],
    ["Rebounds", (r) => parseFloat(r["rebounds_norm"])],
    ["Blocks", (r) => parseFloat(r["blocks_norm"])],
    ["Steals", (r) => parseFloat(r["steals_norm"])],
  ],
});
