import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const toSvgX = locX => 218.6 + locX * 0.8684;
const toSvgY = locY => 89.8 + locY * 0.761;

let _shotRequestId = 0;

// Court occupies x: 0–435, y: 36–444 in SVG space. Crop to remove dead space.
const COURT_VIEWBOX = "0 20 440 424";

export function drawShotChart(svgEl, shots, { onShotHover, onShotLeave } = {}) {
  const svg = d3.select(svgEl);
  svg.selectAll("*").remove();

  svg.attr("viewBox", COURT_VIEWBOX)
     .attr("preserveAspectRatio", "xMidYMid meet");

  svg.append("image")
    .attr("href", "data/nba-court.svg")
    .attr("width", 601)
    .attr("height", 444);

  if (shots.length === 0) {
    svg.append("text")
      .attr("x", 300).attr("y", 222)
      .attr("text-anchor", "middle")
      .attr("fill", "#ffffff").attr("font-size", 16)
      .text("No shot data available");
    return;
  }

  const filtered = shots.filter(d => isFinite(+d.locX) && isFinite(+d.locY) && +d.locY <= 470);
  const made = filtered.filter(d => +d.shotMade === 1);
  const missed = filtered.filter(d => +d.shotMade === 0);

  const MADE_COLOR = "#14ad4c";
  const MISSED_COLOR = "#d21818";
  const CROSS_HALF = 5.5;
  const hasHover = onShotHover && onShotLeave;

  svg.selectAll(".shot-made")
    .data(made)
    .join("circle")
    .attr("class", "shot-made")
    .attr("cx", d => toSvgX(+d.locX))
    .attr("cy", d => toSvgY(+d.locY))
    .attr("r", 5)
    .attr("fill", MADE_COLOR)
    .attr("fill-opacity", 0.25)
    .attr("stroke", MADE_COLOR)
    .attr("stroke-width", 1.5)
    .attr("opacity", 0.85)
    .style("cursor", hasHover ? "pointer" : null)
    .on("mouseover", hasHover ? (event, d) => onShotHover(d.gameId, event) : null)
    .on("mouseout",  hasHover ? () => onShotLeave() : null);

  const crossGroup = svg.selectAll(".shot-missed")
    .data(missed)
    .join("g")
    .attr("class", "shot-missed")
    .attr("transform", d => `translate(${toSvgX(+d.locX)},${toSvgY(+d.locY)})`)
    .attr("opacity", 0.8)
    .style("cursor", hasHover ? "pointer" : null)
    .on("mouseover", hasHover ? (event, d) => onShotHover(d.gameId, event) : null)
    .on("mouseout",  hasHover ? () => onShotLeave() : null);

  crossGroup.append("line")
    .attr("x1", -CROSS_HALF).attr("y1", -CROSS_HALF)
    .attr("x2",  CROSS_HALF).attr("y2",  CROSS_HALF)
    .attr("stroke", MISSED_COLOR).attr("stroke-width", 1.8).attr("stroke-linecap", "round");

  crossGroup.append("line")
    .attr("x1",  CROSS_HALF).attr("y1", -CROSS_HALF)
    .attr("x2", -CROSS_HALF).attr("y2",  CROSS_HALF)
    .attr("stroke", MISSED_COLOR).attr("stroke-width", 1.8).attr("stroke-linecap", "round");
}

export function highlightShotsByGame(svgEl, gameId) {
  const svg = d3.select(svgEl);
  if (!gameId) {
    svg.selectAll('.shot-made').attr('opacity', 0.85);
    svg.selectAll('.shot-missed').attr('opacity', 0.8);
    return;
  }
  const gid = String(gameId);
  svg.selectAll('.shot-made')
    .attr('opacity', d => String(d.gameId) === gid ? 1 : 0.06)
    .attr('r', d => String(d.gameId) === gid ? 6 : 5);
  svg.selectAll('.shot-missed')
    .attr('opacity', d => String(d.gameId) === gid ? 1 : 0.06);
}

function getShotFile(season) {
  const s = +season;
  if (s <= 2006) return "data/shot_events_1996_2006.csv";
  if (s <= 2015) return "data/shot_events_2007_2015.csv";
  return "data/shot_events_2016_2024.csv";
}

export async function loadShots(personId, season, gameType = "Regular Season") {
  const requestId = ++_shotRequestId;
  const seasonNum = +season;

  if (seasonNum < 1996 || seasonNum > 2024) {
    throw new Error("Shot data available  only between 1996 and 2024");
  }

  let rows;
  try {
    rows = await d3.csv(getShotFile(season));
  } catch (e) {
    throw new Error(`Failed to load shot data: ${e.message}`);
  }
  if (requestId !== _shotRequestId) return null;
  const isPlayoffs = gameType === "Playoffs" ? 1 : 0;
  return rows.filter(d => +d.personId === +personId && +d.season === +season && +d.playoffs === isPlayoffs);
}
