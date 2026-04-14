import { BubbleMap } from "./BubbleMap.js";
import { DataLoader } from "./DataLoader.js";

new BubbleMap({
  containerSelector: "#teams",
  dataLoader: new DataLoader("./team_seasons.csv", (row) => row.teamName),
});

let loader = new DataLoader("./team_seasons.csv", (row) => row.teamName);
await loader.load();
console.log(loader.getYears());
console.log(loader.getData(1980, ["win_norm", parseFloat], ["teamScore", (a) => a]));
