import { BubbleMap } from "./BubbleMap.js";
import { DataLoader } from "./DataLoader.js";
import * as Stats from "./stats.js";

// Team Bubble Map
new BubbleMap({
  containerSelector: "#teams",
  dataLoader: new DataLoader("./team_seasons.csv", (row) => row.teamName),
  statsUpdate: Stats.updateTeamStats,
});
