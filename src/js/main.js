import { BubbleMap } from "./BubbleMap.js";
import { teams, teamsPositions } from "./data.js";

new BubbleMap({
  containerSelector: "#teams",
  items: teams,
  positions: teamsPositions,
});

import { DataLoader } from "./DataLoader.js";
const loader = new DataLoader("team_seasons.csv", (row) => row.teamName);
await loader.load();
console.log(loader.getYears());
console.log(loader.getData(2020, ["opponentScore", parseFloat], ["teamScore", (a) => a]));
