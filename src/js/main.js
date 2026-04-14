import { BubbleMap } from "./BubbleMap.js";
import { DataLoader } from "./DataLoader.js";

new BubbleMap({
  containerSelector: "#teams",
  dataLoader: new DataLoader("./team_seasons.csv", (row) => row.teamName),
});
