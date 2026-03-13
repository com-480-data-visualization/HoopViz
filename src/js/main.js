import { BubbleMap } from "./bubble_map.js";
import { teams, teamsPositions } from "./data.js";

new BubbleMap({
  containerSelector: "#teams",
  items: teams,
  positions: teamsPositions,
});
