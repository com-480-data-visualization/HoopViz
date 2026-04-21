import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import * as Data from "./data.js";

// TODO set all attributes

export const TEAM_ATTRIBUTES = [
  // [display name, row to value function]
  ["Wins", (r) => parseFloat(r["win"])],
  ["Average points", (r) => parseFloat(r["teamScore"])],
  ["Three points %", (r) => parseFloat(r["threePointersPercentage"])],
  ["Assists", (r) => parseFloat(r["assists"])],
  ["Rebounds", (r) => parseFloat(r["rebounds"])],
  ["Blocks", (r) => parseFloat(r["blocks"])],
  ["Steals", (r) => parseFloat(r["steals"])],
  // ["Win %", (r) => parseFloat(r["win"]) / parseFloat(r["gamesPlayed"])],
];

export const PLAYER_ATTRIBUTES = [
  // [display name, row to value function]
  ["Wins", (r) => parseFloat(r["win"])],
  ["Average points", (r) => parseFloat(r["points"])],
  ["Three points %", (r) => parseFloat(r["threePointersPercentage"])],
  ["Free throws %", (r) => parseFloat(r["freeThrowsPercentage"])],
  ["Assists", (r) => parseFloat(r["assists"])],
  ["Rebounds", (r) => parseFloat(r["rebounds"])],
  ["Blocks", (r) => parseFloat(r["blocks"])],
  ["Steals", (r) => parseFloat(r["steals"])],
];

export function updateTeamStats(container, seasonsLoader, metadataLoader, currentYear, teamId) {
  // example use of the system
  const name = container.querySelector(".name");
  const year = container.querySelector(".year");
  const content = container.querySelector(".content");

  console.log(teamId + " " + currentYear);

  name.innerText = metadataLoader.getValue(teamId, (row) => row["teamAbbrev"]); // TODO we don't have the team name in metada
  year.innerText = currentYear;

  let attributes = [TEAM_ATTRIBUTES[0], TEAM_ATTRIBUTES[1]];
  let attributesParse = attributes.map((a) => a[1]);
  let attributesDisplay = attributes.map((a) => a[0]);
  let seasonData = Data.filter_error_values(seasonsLoader.getData(currentYear, ...attributesParse));

  let teamData = seasonData.get(teamId);
  content.innerText = attributesDisplay.map((display, index) => display + ": " + teamData[index]).join("\n");

  // D3.js example
  const dataMap = new Map([
    ["1", [35, 117]], ["2", [43, 114]], ["3", [40, 118]], ["4", [22, 115]]
  ]);
  const data = Array.from(dataMap.values()).map(d => d[0]);

  d3.select("#team-chart")
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", (_, i) => i * 45 + 10)
    .attr("y", d => 150 - d)
    .attr("width", 40)
    .attr("height", d => d)
    .attr("fill", "steelblue");
}

export function updatePlayerStats(container, seasonsLoader, metadataLoader, currentYear, playerId) {
  // example use of the system
  const name = container.querySelector(".name");
  const year = container.querySelector(".year");
  const content = container.querySelector(".content");

  console.log(playerId + " " + currentYear);

  name.innerText = metadataLoader.getValue(playerId, (row) => row["firstName"] + " " + row["lastName"]);
  year.innerText = currentYear;

  let attributes = [PLAYER_ATTRIBUTES[0], PLAYER_ATTRIBUTES[1]];
  let attributesParse = attributes.map((a) => a[1]);
  let attributesDisplay = attributes.map((a) => a[0]);
  let seasonData = Data.filter_error_values(seasonsLoader.getData(currentYear, ...attributesParse));

  let playerData = seasonData.get(playerId);
  content.innerText = attributesDisplay.map((display, index) => display + ": " + playerData[index]).join("\n");

  // D3.js example
  const dataMap = new Map([
    ["1", [35, 117]], ["2", [43, 114]], ["3", [40, 118]], ["4", [22, 115]]
  ]);
  const data = Array.from(dataMap.values()).map(d => d[0]);

  d3.select("#player-chart")
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", (_, i) => i * 45 + 10)
    .attr("y", d => 150 - d)
    .attr("width", 40)
    .attr("height", d => d)
    .attr("fill", "steelblue");
}
