import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { RadarChart } from "./radar_chart/radarChart.js";
import * as Utils from "./utils.js";
import * as Data from "./data.js";
import { drawShotChart, loadShots, highlightShotsByGame } from "./ShotChart.js";

export const TEAM_ATTRIBUTES = [
  // [display name, row to value function]
  ["Wins", (r) => parseFloat(r["win"])],
  ["Points", (r) => parseFloat(r["teamScore"])],
  ["Three points %", (r) => parseFloat(r["threePointersPercentage"])],
  ["Assists", (r) => parseFloat(r["assists"])],
  ["Rebounds", (r) => parseFloat(r["rebounds"])],
  ["Blocks", (r) => parseFloat(r["blocks"])],
  ["Steals", (r) => parseFloat(r["steals"])],
  ["Turnovers", (r) => parseFloat(r["turnovers"])],
  ["Fouls", (r) => parseFloat(r["foulsPersonal"])],
  ["Salaries (M)", (r) => parseFloat(r["salary"]) / 1e6],
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
  ["Turnovers", (r) => parseFloat(r["turnovers"])],
  ["Fouls", (r) => parseFloat(r["foulsPersonal"])],
  ["Salaries (M)", (r) => parseFloat(r["salary"]) / 1e6],
];

function getMetaValue(metadataLoader, id, getter, year) {
  return metadataLoader.getValueForSeason(id, getter, year);
}

function mapHasEntity(data, entityId) {
  const target = String(entityId);
  for (const key of data.keys()) {
    if (String(key) === target) return true;
  }
  return false;
}

function clearDataUnavailableMessage(container) {
  const statsArea = container.querySelector(".stats-area");
  if (!statsArea) return;
  statsArea.classList.remove("has-data-unavailable-message");
  statsArea.querySelector(".data-unavailable-message")?.remove();
}

function showDataUnavailableMessage(container, message) {
  const statsArea = container.querySelector(".stats-area");
  if (!statsArea) return;
  statsArea.classList.add("has-data-unavailable-message");
  let messageEl = statsArea.querySelector(".data-unavailable-message");
  if (!messageEl) {
    messageEl = document.createElement("div");
    messageEl.className = "data-unavailable-message";
    statsArea.appendChild(messageEl);
  }
  messageEl.textContent = message;
}

function formatValue(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "N/A";
}

export const TRANSITION_TIME = 500;
const RADAR_AXES = 6;
const EVOLUTION_COLOR_A = "#2e7d32";
const EVOLUTION_COLOR_B = "#1e40af";
const EVOLUTION_TOOLTIP_PADDING = 12;
const GAME_WIN_COLOR = "rgba(20, 173, 76, 0.84)";
const GAME_LOSS_COLOR = "rgba(210, 24, 24, 0.62)";

// stores the in-flight promise, not the resolved data, concurrent callers get the same promise instead of firing duplicate fetches
const csvCache = new Map();

function getAttributeByLabel(label) {
  return TEAM_ATTRIBUTES.find((attribute) => attribute[0] === label);
}

function coerceNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function isColorTooLight(color) {
  if (!color) return false;
  const hex = color.trim();
  if (!hex.startsWith("#")) return false;
  // expand shorthand (#rgb → #rrggbb)
  const full = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
  const r = parseInt(full.slice(1, 3), 16);
  const g = parseInt(full.slice(3, 5), 16);
  const b = parseInt(full.slice(5, 7), 16);
  // standard perceived luminance weights, some team colors (e.g. white) would be invisible on a light background
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.85;
}

function resolveColor(color, fallback) {
  return (color && !isColorTooLight(color)) ? color : fallback;
}

function clampTooltip(tooltip, clientX, clientY) {
  const tooltipRect = tooltip.getBoundingClientRect();
  const padding = 12;
  let left = clientX + padding;
  let top = clientY - tooltipRect.height - padding;
  if (left + tooltipRect.width > window.innerWidth) left = clientX - tooltipRect.width - padding;
  if (top < padding) top = clientY + padding;
  left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));
  top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
  tooltip.style.transform = `translate(${left}px, ${top}px)`;
}

function averageArrays(arrays) {
  if (!arrays || arrays.length === 0) return [];
  const length = arrays[0].length;
  const sums = new Array(length).fill(0);
  const counts = new Array(length).fill(0);
  arrays.forEach((arr) => {
    arr.forEach((value, index) => {
      if (Number.isFinite(value)) {
        sums[index] += value;
        counts[index] += 1;
      }
    });
  });
  return sums.map((sum, index) => counts[index] ? sum / counts[index] : 0);
}

function buildRadarSeries(attributes, normalizedValues, rawValues) {
  return attributes.map((attr, i) => {
    const value = normalizedValues?.[i];
    const rawValue = rawValues?.[i];
    return {
      axis: i,
      value: Number.isFinite(value) ? value : 0,
      rawValue: Number.isFinite(rawValue) ? rawValue : null,
      axisName: attr[0],
    };
  });
}

function normalizeRadarValuesByAxis(data, axisCount) {
  if (!data || data.size === 0) return new Map();
  const minValues = new Array(axisCount).fill(Infinity);
  const maxValues = new Array(axisCount).fill(-Infinity);

  for (const values of data.values()) {
    for (let i = 0; i < axisCount; i++) {
      const value = Number(values?.[i]);
      if (!Number.isFinite(value)) continue;
      if (value < minValues[i]) minValues[i] = value;
      if (value > maxValues[i]) maxValues[i] = value;
    }
  }

  const normalized = new Map();
  for (const [key, values] of data.entries()) {
    const row = new Array(axisCount);
    for (let i = 0; i < axisCount; i++) {
      const value = Number(values?.[i]);
      if (!Number.isFinite(value) || !Number.isFinite(minValues[i]) || !Number.isFinite(maxValues[i])) {
        row[i] = NaN;
        continue;
      }
      const range = maxValues[i] - minValues[i];
      row[i] = range === 0 ? 0 : (value - minValues[i]) / range;
    }
    normalized.set(key, row);
  }

  return normalized;
}

function getRankMap(rows, year, gameType) {
  const teams = rows
    .filter((row) => row.season === String(year) && row.gameType === gameType)
    .map((row) => {
      const wins = parseFloat(row.win) || 0;
      // some rows don't have a losses column, so derive it from gamesPlayed if needed
      const losses = parseFloat(row.losses) || Math.max(0, (parseFloat(row.gamesPlayed) || 0) - wins);
      const games = wins + losses;
      const winPct = games ? wins / games : 0;
      return { teamId: row.teamId, wins, losses, winPct };
    });

  teams.sort((a, b) => b.winPct - a.winPct || b.wins - a.wins);
  const rankById = new Map();
  teams.forEach((team, index) => {
    rankById.set(team.teamId, { rank: index + 1, wins: team.wins, losses: team.losses });
  });
  return rankById;
}

function formatNumber(value, decimals = 1) {
  if (!Number.isFinite(value)) return "N/A";
  return value.toFixed(decimals);
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "N/A";
  return `${(value * 100).toFixed(1)}%`;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getTeamLogoUrl(metadataLoader, teamId, year) {
  const teamSlug = getMetaValue(metadataLoader, teamId, (row) => row["teamSlug"], year);
  if (!teamSlug) return null;
  const activeTill = getMetaValue(metadataLoader, teamId, (row) => row["seasonActiveTill"], year);
  const activeTillYear = parseInt(activeTill, 10);
  const logoYear = Number.isNaN(activeTillYear) ? year : activeTillYear;
  const logoYearSegment = logoYear > 2024 ? "current" : logoYear;
  return `https://i.logocdn.com/nba/${logoYearSegment}/${teamSlug}.svg`;
}

function getTeamMetaRowForSeason(teamMetaRows, teamId, year) {
  const targetTeamId = String(teamId);
  const targetYear = parseInt(year, 10);
  let firstMatch = null;
  let hasSeasonInfo = false;

  for (const row of teamMetaRows) {
    if (String(row.teamId) !== targetTeamId) continue;
    if (!firstMatch) firstMatch = row;

    const start = parseInt(row.seasonFounded, 10);
    const end = parseInt(row.seasonActiveTill, 10);
    if (!Number.isNaN(start) && !Number.isNaN(end)) {
      hasSeasonInfo = true;
      if (!Number.isNaN(targetYear) && targetYear >= start && targetYear <= end) {
        return row;
      }
    }
  }

  if (!Number.isNaN(targetYear) && hasSeasonInfo) {
    return null;
  }

  return firstMatch;
}

function buildTeamLogoUrlFromMeta(metaRow, fallbackYear) {
  if (!metaRow?.teamSlug) return null;
  const activeTill = parseInt(metaRow.seasonActiveTill, 10);
  const parsedFallbackYear = parseInt(fallbackYear, 10);
  const logoYear = Number.isNaN(activeTill) ? parsedFallbackYear : activeTill;
  if (Number.isNaN(logoYear)) return null;
  const logoYearSegment = logoYear > 2024 ? "current" : logoYear;
  return `https://i.logocdn.com/nba/${logoYearSegment}/${metaRow.teamSlug}.svg`;
}

function renderTopTeamLogos(container, logoUrls) {
  const bar = container.querySelector(".player-main-team-logos-bar");
  if (!bar) return;
  const uniqueUrls = [...new Set((logoUrls || []).filter(Boolean))].slice(0, 2);
  const newKey = uniqueUrls.join("|");
  if ((bar.dataset.logoKey || "") === newKey) return;
  bar.dataset.logoKey = newKey;
  bar.innerHTML = "";
  uniqueUrls.forEach((url, i) => {
    const img = document.createElement("img");
    img.className = "logo-item";
    img.src = url;
    img.alt = `Team logo ${i + 1}`;
    img.decoding = "async";
    img.loading = "lazy";
    bar.appendChild(img);
  });
}

function renderPlayerTeamLogos(container, logoUrls) {
  const headshotCard = container.querySelector(".player-headshot-card");
  if (!headshotCard) return;

  let logosEl = headshotCard.querySelector(".player-team-logos");
  if (!logosEl) {
    logosEl = document.createElement("div");
    logosEl.className = "player-team-logos";
    headshotCard.appendChild(logosEl);
  }

  const uniqueUrls = [...new Set((logoUrls || []).filter(Boolean))];
  logosEl.innerHTML = "";
  uniqueUrls.forEach((url, index) => {
    const img = document.createElement("img");
    img.className = "player-team-logo-item";
    img.src = url;
    img.alt = `Team logo ${index + 1}`;
    img.decoding = "async";
    img.loading = "lazy";
    logosEl.appendChild(img);
  });
  logosEl.hidden = uniqueUrls.length === 0;
}

const REGULAR_MATCHUP_HTML = `
  <div class="matchup-card win">
    <div class="matchup-title">Best opponents</div>
    <div class="matchup-grid">
      <div class="matchup-slot"></div><div class="matchup-slot"></div>
      <div class="matchup-slot"></div><div class="matchup-slot"></div>
    </div>
  </div>
  <div class="matchup-card lose">
    <div class="matchup-title">Worst opponents</div>
    <div class="matchup-grid">
      <div class="matchup-slot"></div><div class="matchup-slot"></div>
      <div class="matchup-slot"></div><div class="matchup-slot"></div>
    </div>
  </div>`;

const PLAYOFF_ROUND_NAMES = ["First Round", "Conf. Semifinals", "Conf. Finals", "NBA Finals"];

async function updateMatchups(container, currentYear, teamId, metadataLoader, gameType = "Regular Season") {
  const statsRight = container.querySelector(".stats-right");
  if (!statsRight) return;

  const targetMode = gameType === "Playoffs" ? "playoff" : "regular";
  // only rebuild the skeleton when the mode actually changes, avoids wiping the DOM on every stat update
  if (statsRight.dataset.mode !== targetMode) {
    statsRight.dataset.mode = targetMode;
    statsRight.innerHTML = targetMode === "regular" ? REGULAR_MATCHUP_HTML : "";
  }

  let rows = [];
  try {
    rows = await loadCsv("./data/team_games.csv");
  } catch (_) {
    return;
  }

  const teamRows = rows.filter(
    (row) => row.season === String(currentYear) && row.teamId === String(teamId) && row.gameType === gameType
  );

  if (targetMode === "playoff") {
    renderPlayoffRun(statsRight, teamRows, currentYear, metadataLoader);
  } else {
    renderRegularMatchups(statsRight, teamRows, currentYear, metadataLoader);
  }
}

function cleanupPlayoffTooltips() {
  document.querySelectorAll(".playoff-series-tooltip").forEach((el) => el.remove());
}

function renderPlayoffRun(statsRight, teamRows, currentYear, metadataLoader) {
  cleanupPlayoffTooltips();
  const seriesByOpponent = new Map();
  teamRows.forEach((row) => {
    const oppId = row.opponentTeamId;
    if (!oppId) return;
    if (!seriesByOpponent.has(oppId)) seriesByOpponent.set(oppId, []);
    seriesByOpponent.get(oppId).push(row);
  });

  statsRight.innerHTML = "";
  const card = document.createElement("div");
  card.className = "matchup-card playoff-run";

  const title = document.createElement("div");
  title.className = "matchup-title";
  title.textContent = "Playoff Run";
  card.appendChild(title);

  if (seriesByOpponent.size === 0) {
    const empty = document.createElement("p");
    empty.className = "playoff-no-data";
    empty.textContent = "No playoff data for this year";
    card.appendChild(empty);
    statsRight.appendChild(card);
    return;
  }

  const series = [...seriesByOpponent.entries()].map(([oppId, games]) => {
    games.sort((a, b) => new Date(a.gameDateTimeEst) - new Date(b.gameDateTimeEst));
    const wins = games.filter((g) => Number(g.win) === 1).length;
    const losses = games.length - wins;
    return { oppId, games, wins, losses, firstDate: games[0].gameDateTimeEst };
  });
  series.sort((a, b) => new Date(a.firstDate) - new Date(b.firstDate));

  const list = document.createElement("div");
  list.className = "playoff-series-list";

  series.forEach(({ oppId, games, wins, losses }, index) => {
    const roundName = PLAYOFF_ROUND_NAMES[index] || `Round ${index + 1}`;
    const seriesWon = wins > losses;
    const oppName = [games[0].opponentTeamCity, games[0].opponentTeamName].filter(Boolean).join(" ");
    const logoUrl = getTeamLogoUrl(metadataLoader, oppId, currentYear);

    const seriesEl = document.createElement("div");
    seriesEl.className = `playoff-series ${seriesWon ? "won" : "lost"}`;

    const roundLabel = document.createElement("div");
    roundLabel.className = "playoff-round-label";
    roundLabel.textContent = roundName;
    seriesEl.appendChild(roundLabel);

    const main = document.createElement("div");
    main.className = "playoff-series-main";

    if (logoUrl) {
      const logoSlot = document.createElement("div");
      logoSlot.className = "playoff-logo-slot";
      const img = document.createElement("img");
      img.src = logoUrl;
      img.alt = oppName;
      img.decoding = "async";
      img.loading = "lazy";
      logoSlot.appendChild(img);
      main.appendChild(logoSlot);
    }

    const info = document.createElement("div");
    info.className = "playoff-series-info";

    const nameLine = document.createElement("div");
    nameLine.className = "playoff-opponent-name";
    nameLine.textContent = oppName;
    info.appendChild(nameLine);

    const result = document.createElement("div");
    result.className = `playoff-series-result ${seriesWon ? "win" : "lose"}`;
    result.textContent = seriesWon ? `W ${wins}-${losses}` : `L ${wins}-${losses}`;
    info.appendChild(result);

    const dotsEl = document.createElement("div");
    dotsEl.className = "playoff-game-dots";
    games.forEach((game) => {
      const isWin = Number(game.win) === 1;
      const dot = document.createElement("span");
      dot.className = `playoff-game-dot ${isWin ? "win" : "lose"}`;
      dot.title = `${isWin ? "W" : "L"} ${game.teamScore}-${game.opponentScore}`;
      dotsEl.appendChild(dot);
    });
    info.appendChild(dotsEl);

    main.appendChild(info);
    seriesEl.appendChild(main);

    // compute series averages for tooltip
    const avg = (getter) => {
      const vals = games.map(getter).filter(Number.isFinite);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    const fmtNum = (v, decimals = 1) => v != null ? v.toFixed(decimals) : "—";
    const fmtPct = (v) => v != null ? `${(v * 100).toFixed(1)}%` : "—";

    const avgPts = avg((g) => coerceNumber(g.teamScore));
    const avgOppPts = avg((g) => coerceNumber(g.opponentScore));
    const avgAst = avg((g) => coerceNumber(g.assists));
    const avgReb = avg((g) => coerceNumber(g.rebounds));
    const avgBlk = avg((g) => coerceNumber(g.blocks));
    const avgStl = avg((g) => coerceNumber(g.steals));
    const avgTov = avg((g) => coerceNumber(g.turnovers));
    const avgFg = avg((g) => coerceNumber(g.fieldGoalsPercentage));
    const avg3p = avg((g) => coerceNumber(g.threePointersPercentage));
    const avgFt = avg((g) => coerceNumber(g.freeThrowsPercentage));

    const tooltip = document.createElement("div");
    tooltip.className = "playoff-series-tooltip";
    tooltip.innerHTML = `
      <div class="playoff-tooltip-title">${roundName} vs ${oppName}</div>
      <div class="playoff-tooltip-score">${fmtNum(avgPts, 1)} &nbsp;—&nbsp; ${fmtNum(avgOppPts, 1)} pts <span style="font-weight:400;font-size:10px">(avg/game)</span></div>
      <div class="playoff-tooltip-grid">
        <div class="playoff-tooltip-row"><span class="label">AST</span><span class="value">${fmtNum(avgAst)}</span></div>
        <div class="playoff-tooltip-row"><span class="label">REB</span><span class="value">${fmtNum(avgReb)}</span></div>
        <div class="playoff-tooltip-row"><span class="label">BLK</span><span class="value">${fmtNum(avgBlk)}</span></div>
        <div class="playoff-tooltip-row"><span class="label">STL</span><span class="value">${fmtNum(avgStl)}</span></div>
        <div class="playoff-tooltip-row"><span class="label">TOV</span><span class="value">${fmtNum(avgTov)}</span></div>
        <div class="playoff-tooltip-row"><span class="label">FG%</span><span class="value">${fmtPct(avgFg)}</span></div>
        <div class="playoff-tooltip-row"><span class="label">3P%</span><span class="value">${fmtPct(avg3p)}</span></div>
        <div class="playoff-tooltip-row"><span class="label">FT%</span><span class="value">${fmtPct(avgFt)}</span></div>
      </div>
    `;
    document.body.appendChild(tooltip);

    seriesEl.addEventListener("mouseenter", (e) => { tooltip.style.opacity = "1"; clampTooltip(tooltip, e.clientX, e.clientY); });
    seriesEl.addEventListener("mousemove", (e) => { clampTooltip(tooltip, e.clientX, e.clientY); });
    // move off-screen too, otherwise the tooltip div blocks mouse events on whatever is underneath it
    seriesEl.addEventListener("mouseleave", () => { tooltip.style.opacity = "0"; tooltip.style.transform = "translate(-9999px, -9999px)"; });

    list.appendChild(seriesEl);
  });

  card.appendChild(list);
  statsRight.appendChild(card);
}

function renderRegularMatchups(statsRight, teamRows, currentYear, metadataLoader) {
  cleanupPlayoffTooltips();
  const winSlots = statsRight.querySelectorAll(".matchup-card.win .matchup-slot");
  const loseSlots = statsRight.querySelectorAll(".matchup-card.lose .matchup-slot");

  const winCounts = new Map();
  const lossCounts = new Map();
  const totalCounts = new Map();
  const opponentNames = new Map();
  const opponentPointsFor = new Map();
  const opponentPointsAgainst = new Map();
  const opponentGames = new Map();

  teamRows.forEach((row) => {
    const opponentId = row.opponentTeamId;
    if (!opponentId) return;
    const isWin = Number(row.win) === 1;
    const target = isWin ? winCounts : lossCounts;
    target.set(opponentId, (target.get(opponentId) || 0) + 1);
    totalCounts.set(opponentId, (totalCounts.get(opponentId) || 0) + 1);
    const teamScore = coerceNumber(row.teamScore);
    const opponentScore = coerceNumber(row.opponentScore);
    if (Number.isFinite(teamScore)) {
      opponentPointsFor.set(opponentId, (opponentPointsFor.get(opponentId) || 0) + teamScore);
    }
    if (Number.isFinite(opponentScore)) {
      opponentPointsAgainst.set(opponentId, (opponentPointsAgainst.get(opponentId) || 0) + opponentScore);
    }
    if (!opponentNames.has(opponentId)) {
      const name = [row.opponentTeamCity, row.opponentTeamName].filter(Boolean).join(" ");
      opponentNames.set(opponentId, name || "Opponent");
    }
    if (!opponentGames.has(opponentId)) opponentGames.set(opponentId, []);
    opponentGames.get(opponentId).push(row);
  });

  const getTopOpponentsByRate = (counts) =>
    [...counts.entries()]
      .map(([opponentId, count]) => {
        const total = totalCounts.get(opponentId) || 0;
        const rate = total ? count / total : 0;
        return { opponentId, count, total, rate };
      })
      .sort((a, b) => b.rate - a.rate || b.total - a.total || b.count - a.count)
      .slice(0, 4)
      .map((e) => e.opponentId);

  const topWins = getTopOpponentsByRate(winCounts);
  const topLosses = getTopOpponentsByRate(lossCounts);

  const fillSlots = (slots, teamIds) => {
    slots.forEach((slot, index) => {
      slot.innerHTML = "";
      const opponentId = teamIds[index];
      if (!opponentId) return;
      const logoUrl = getTeamLogoUrl(metadataLoader, opponentId, currentYear);
      if (!logoUrl) return;
      const total = totalCounts.get(opponentId) || 0;
      const wins = winCounts.get(opponentId) || 0;
      const losses = lossCounts.get(opponentId) || 0;
      const pointsFor = opponentPointsFor.get(opponentId) || 0;
      const pointsAgainst = opponentPointsAgainst.get(opponentId) || 0;
      const avgFor = total ? pointsFor / total : 0;
      const avgAgainst = total ? pointsAgainst / total : 0;
      const label = opponentNames.get(opponentId) || "Opponent";
      const recentGames = (opponentGames.get(opponentId) || [])
        .slice()
        .sort((a, b) => new Date(a.gameDateTimeEst || 0) - new Date(b.gameDateTimeEst || 0))
        .slice(-3)
        .reverse();
      const recentMarkup = recentGames.map((game) => {
        const date = formatDate(game.gameDateTimeEst);
        const ts = formatNumber(coerceNumber(game.teamScore), 0);
        const os = formatNumber(coerceNumber(game.opponentScore), 0);
        const r = Number(game.win) === 1 ? "W" : "L";
        return `<div class="matchup-tooltip-row">${date} · ${r} ${ts}-${os}</div>`;
      }).join("");

      const img = document.createElement("img");
      img.src = logoUrl; img.alt = label; img.decoding = "async"; img.loading = "lazy";
      const logoWrapper = document.createElement("div");
      logoWrapper.className = "matchup-logo";
      logoWrapper.appendChild(img);

      const tooltip = document.createElement("div");
      tooltip.className = "matchup-tooltip";
      tooltip.innerHTML = `
        <div class="matchup-tooltip-title">${label}</div>
        <div class="matchup-tooltip-row">Record: ${wins}-${losses}</div>
        <div class="matchup-tooltip-row">Games: ${total}</div>
        <div class="matchup-tooltip-row">Avg score ${formatNumber(avgFor, 1)} - ${formatNumber(avgAgainst, 1)}</div>
        <div class="matchup-tooltip-subtitle">Last games</div>
        ${recentMarkup || "<div class=\"matchup-tooltip-row\">No recent games</div>"}
      `;
      slot.appendChild(logoWrapper);
      slot.appendChild(tooltip);

      slot.addEventListener("mouseenter", (e) => { tooltip.style.opacity = "1"; clampTooltip(tooltip, e.clientX, e.clientY); });
      slot.addEventListener("mousemove", (e) => { clampTooltip(tooltip, e.clientX, e.clientY); });
      slot.addEventListener("mouseleave", () => { tooltip.style.opacity = "0"; tooltip.style.transform = "translate(-9999px, -9999px)"; });
    });
  };

  fillSlots(winSlots, topWins);
  fillSlots(loseSlots, topLosses);
}

async function loadCsv(url) {
  if (!csvCache.has(url)) {
    csvCache.set(url, (async () => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
      const text = await response.text();
      const lines = text.trim().split("\n");
      const headers = lines[0].split(",").map(h => h.trim());
      return lines.slice(1).map(line => {
        const values = parseCsvLine(line);
        const row = {};
        headers.forEach((h, i) => { row[h] = values[i]?.trim() ?? ""; });
        return row;
      });
    })());
  }
  return csvCache.get(url);
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function buildEvolutionSelector(btn, list, selectedLabel, onChange) {
  const textEl = btn.querySelector(".evo-label-text");
  if (textEl) textEl.textContent = selectedLabel;
  list.innerHTML = "";
  TEAM_ATTRIBUTES.forEach(([attr]) => {
    if (attr === "Wins" || attr === "Salaries (M)") return;
    const span = document.createElement("span");
    span.textContent = attr;
    if (attr === selectedLabel) span.classList.add("selected");
    span.addEventListener("click", (e) => {
      e.stopPropagation();
      list.style.display = "none";
      if (attr !== selectedLabel) onChange(attr);
    });
    list.appendChild(span);
  });
}

async function updateEvolutionChart(container, currentYear, teamId, built) {
  const chart = container.querySelector("#team-evolution-chart");
  const btnA  = container.querySelector(".evo-ctrl-a");
  const listA = container.querySelector(".evo-selector-a");
  const btnB  = container.querySelector(".evo-ctrl-b");
  const listB = container.querySelector(".evo-selector-b");

  if (!chart || !btnA || !listA || !btnB || !listB) return;

  if (!built.evolution) {
    built.evolution = {
      selectedA: TEAM_ATTRIBUTES[1][0],
      selectedB: TEAM_ATTRIBUTES[3][0],
      resizeObserver: null,
      observeTarget: null,
      resizeScheduled: false,
      tooltipEl: null,
    };

    buildEvolutionSelector(btnA, listA, built.evolution.selectedA, (attr) => {
      built.evolution.selectedA = attr;
      updateEvolutionChart(container, currentYear, teamId, built);
    });
    buildEvolutionSelector(btnB, listB, built.evolution.selectedB, (attr) => {
      built.evolution.selectedB = attr;
      updateEvolutionChart(container, currentYear, teamId, built);
    });

    const toggle = (list, other) => (e) => {
      e.stopPropagation();
      const open = list.style.display === "flex";
      other.style.display = "none";
      list.style.display = open ? "none" : "flex";
    };
    btnA.addEventListener("click", toggle(listA, listB));
    btnB.addEventListener("click", toggle(listB, listA));
    document.addEventListener("click", () => {
      listA.style.display = "none";
      listB.style.display = "none";
    });
  } else {
    buildEvolutionSelector(btnA, listA, built.evolution.selectedA, (attr) => {
      built.evolution.selectedA = attr;
      updateEvolutionChart(container, currentYear, teamId, built);
    });
    buildEvolutionSelector(btnB, listB, built.evolution.selectedB, (attr) => {
      built.evolution.selectedB = attr;
      updateEvolutionChart(container, currentYear, teamId, built);
    });
  }

  if (!built.evolution.resizeObserver) {
    built.evolution.resizeObserver = new ResizeObserver(() => {
      if (built.evolution.resizeScheduled) return;
      built.evolution.resizeScheduled = true;
      requestAnimationFrame(() => {
        built.evolution.resizeScheduled = false;
        updateEvolutionChart(container, currentYear, teamId, built);
      });
    });
  }

  const attributeA = getAttributeByLabel(built.evolution.selectedA);
  const attributeB = getAttributeByLabel(built.evolution.selectedB);
  const colorA = built.evolutionTheme?.colorA || EVOLUTION_COLOR_A;
  const colorB = built.evolutionTheme?.colorB || EVOLUTION_COLOR_B;

  let rows = [];
  try {
    rows = await loadCsv("./data/team_games.csv");
  } catch (error) {
    const svg = d3.select(chart);
    svg.selectAll("*").remove();
    const width = parseFloat(chart.getAttribute("width")) || 560;
    const height = parseFloat(chart.getAttribute("height")) || 220;
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "#666")
      .attr("font-size", 12)
      .text("Season evolution data unavailable");
    return;
  }

  const teamRows = rows.filter((row) => {
    return row.season === String(currentYear)
      && row.teamId === String(teamId)
      && row.gameType === (built.gameType || "Regular Season");
  });

  teamRows.sort((a, b) => {
    const dateA = new Date(a.gameDateTimeEst || 0).getTime();
    const dateB = new Date(b.gameDateTimeEst || 0).getTime();
    return dateA - dateB;
  });

  const values = teamRows.map((row, index) => ({
    index,
    date: row.gameDateTimeEst,
    valueA: attributeA ? coerceNumber(attributeA[1](row)) : null,
    valueB: attributeB ? coerceNumber(attributeB[1](row)) : null,
    row,
  })).filter((row) => row.valueA != null && row.valueB != null);

  const evolutionContainer = chart.closest(".evolution") || chart.parentElement;
  if (evolutionContainer && built.evolution.observeTarget !== evolutionContainer) {
    if (built.evolution.observeTarget) {
      built.evolution.resizeObserver.unobserve(built.evolution.observeTarget);
    }
    built.evolution.resizeObserver.observe(evolutionContainer);
    built.evolution.observeTarget = evolutionContainer;
  }

  const { width, height } = chart.getBoundingClientRect();
  if (width < 10 || height < 10) {
    return;
  }
  const margin = { top: 18, right: 70, bottom: 40, left: 70 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = d3.select(chart);
  svg.attr("width", width).attr("height", height);
  svg.selectAll("*").remove();

  const root = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  if (values.length === 0) {
    root.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "#666")
      .attr("font-size", 12)
      .text("No game data for this season");
    return;
  }

  const xScale = d3.scaleLinear()
    .domain([0, values.length - 1])
    .range([0, innerWidth]);

  const yScaleA = d3.scaleLinear()
    .domain(d3.extent(values, (d) => d.valueA))
    .nice()
    .range([innerHeight, 0]);

  const yScaleB = d3.scaleLinear()
    .domain(d3.extent(values, (d) => d.valueB))
    .nice()
    .range([innerHeight, 0]);

  root.append("g")
    .attr("class", "evolution-grid")
    .call(d3.axisLeft(yScaleA).ticks(4).tickSize(-innerWidth).tickFormat(""));

  root.append("g")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(d3.axisBottom(xScale).ticks(6).tickFormat((d) => Number.isInteger(d) ? `G${d + 1}` : ""))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll(".tick line").remove());

  root.append("g")
    .call(d3.axisLeft(yScaleA).ticks(4))
    .call((g) => g.selectAll("text").attr("fill", colorA))
    .call((g) => g.selectAll("path, line").attr("stroke", colorA));

  root.append("g")
    .attr("transform", `translate(${innerWidth}, 0)`)
    .call(d3.axisRight(yScaleB).ticks(4))
    .call((g) => g.selectAll("text").attr("fill", colorB))
    .call((g) => g.selectAll("path, line").attr("stroke", colorB));

  const lineA = d3.line()
    .x((d) => xScale(d.index))
    .y((d) => yScaleA(d.valueA));

  const lineB = d3.line()
    .x((d) => xScale(d.index))
    .y((d) => yScaleB(d.valueB));

  root.append("path")
    .datum(values)
    .attr("fill", "none")
    .attr("stroke", colorA)
    .attr("stroke-width", 2)
    .attr("d", lineA);

  root.append("path")
    .datum(values)
    .attr("fill", "none")
    .attr("stroke", colorB)
    .attr("stroke-width", 2)
    .attr("d", lineB);

  root.append("g")
    .attr("class", "evolution-win-dots")
    .selectAll("circle")
    .data(values)
    .enter()
    .append("circle")
    .attr("cx", (d) => xScale(d.index))
    .attr("cy", innerHeight)
    .attr("r", 3)
    .attr("fill", (d) => Number(d.row.win) === 1 ? "#2e7d32" : "#c62828")
    .attr("opacity", 0.85);

  root.append("text")
    .attr("x", 0)
    .attr("y", -6)
    .attr("fill", colorA)
    .attr("font-size", 11)
    .attr("font-weight", "bold")
    .text(built.evolution.selectedA);

  root.append("text")
    .attr("x", innerWidth)
    .attr("y", -6)
    .attr("text-anchor", "end")
    .attr("fill", colorB)
    .attr("font-size", 11)
    .attr("font-weight", "bold")
    .text(built.evolution.selectedB);

  const focusGroup = root.append("g")
    .attr("class", "evolution-focus")
    .style("display", "none");

  focusGroup.append("line")
    .attr("class", "evolution-focus-line")
    .attr("y1", 0)
    .attr("y2", innerHeight)
    .attr("stroke", "#9aa0a6")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "3 3");

  const focusCircleA = focusGroup.append("circle")
    .attr("r", 4)
    .attr("fill", "#fff")
    .attr("stroke", colorA)
    .attr("stroke-width", 2);

  const focusCircleB = focusGroup.append("circle")
    .attr("r", 4)
    .attr("fill", "#fff")
    .attr("stroke", colorB)
    .attr("stroke-width", 2);

  if (!built.evolution.tooltipEl) {
    const tooltip = document.createElement("div");
    tooltip.className = "evolution-tooltip";
    tooltip.style.opacity = "0";
    const evolutionContainer = chart.closest(".evolution") || chart.parentElement;
    if (evolutionContainer) {
      evolutionContainer.appendChild(tooltip);
    }
    built.evolution.tooltipEl = tooltip;
  }

  const tooltip = built.evolution.tooltipEl;
  if (tooltip) {
    tooltip.style.setProperty("--color-a", colorA);
    tooltip.style.setProperty("--color-b", colorB);
  }

  const overlay = root.append("rect")
    .attr("class", "evolution-overlay")
    .attr("width", innerWidth)
    .attr("height", innerHeight)
    .attr("fill", "transparent")
    .style("cursor", "crosshair");

  // const bisect = d3.bisector((d) => d.index).left;

  function showTooltip(d) {
    if (!tooltip) return;
    const row = d.row || {};
    const opponent = [row.opponentTeamCity, row.opponentTeamName].filter(Boolean).join(" ");
    const teamScore = coerceNumber(row.teamScore);
    const opponentScore = coerceNumber(row.opponentScore);
    const scoreLine = Number.isFinite(teamScore) && Number.isFinite(opponentScore)
      ? `${teamScore} - ${opponentScore}`
      : "N/A";
    const homeLabel = row.home === "1" || row.home === 1 ? "Home" : "Away";

    const statsRows = [
      { label: "Assists", value: formatNumber(coerceNumber(row.assists), 1) },
      { label: "Rebounds", value: formatNumber(coerceNumber(row.rebounds), 1) },
      { label: "Blocks", value: formatNumber(coerceNumber(row.blocks), 1) },
      { label: "Steals", value: formatNumber(coerceNumber(row.steals), 1) },
      { label: "Turnovers", value: formatNumber(coerceNumber(row.turnovers), 1) },
      { label: "Fouls", value: formatNumber(coerceNumber(row.foulsPersonal), 1) },
      {
        label: "FG",
        value: `${formatNumber(coerceNumber(row.fieldGoalsMade), 0)} / ${formatNumber(coerceNumber(row.fieldGoalsAttempted), 0)} (${formatPercent(coerceNumber(row.fieldGoalsPercentage))})`,
      },
      {
        label: "3PT",
        value: `${formatNumber(coerceNumber(row.threePointersMade), 0)} / ${formatNumber(coerceNumber(row.threePointersAttempted), 0)} (${formatPercent(coerceNumber(row.threePointersPercentage))})`,
      },
      {
        label: "FT",
        value: `${formatNumber(coerceNumber(row.freeThrowsMade), 0)} / ${formatNumber(coerceNumber(row.freeThrowsAttempted), 0)} (${formatPercent(coerceNumber(row.freeThrowsPercentage))})`,
      },
    ];

    tooltip.innerHTML = `
      <div class="evolution-tooltip-header">
        <div class="evolution-tooltip-title">G${d.index + 1} ${formatDate(d.date)}</div>
        <div class="evolution-tooltip-sub">${homeLabel}${opponent ? ` vs ${opponent}` : ""}</div>
        <div class="evolution-tooltip-score">${scoreLine}</div>
      </div>
      <div class="evolution-tooltip-metrics">
        <div class="metric">
          <span class="label">${built.evolution.selectedA}</span>
          <span class="value" style="color: ${colorA}">${formatNumber(d.valueA, 2)}</span>
        </div>
        <div class="metric">
          <span class="label">${built.evolution.selectedB}</span>
          <span class="value" style="color: ${colorB}">${formatNumber(d.valueB, 2)}</span>
        </div>
      </div>
      <div class="evolution-tooltip-grid">
        ${statsRows.map((row) => `
          <div class="row">
            <span class="label">${row.label}</span>
            <span class="value">${row.value}</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  function positionTooltip(x, y) {
    if (!tooltip) return;
    const evolutionContainer = chart.closest(".evolution") || chart.parentElement;
    if (!evolutionContainer) return;
    const containerRect = evolutionContainer.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    let left = margin.left + x + EVOLUTION_TOOLTIP_PADDING;
    let top = margin.top + y - tooltipRect.height - EVOLUTION_TOOLTIP_PADDING;

    if (left + tooltipRect.width > containerRect.width) {
      left = margin.left + x - tooltipRect.width - EVOLUTION_TOOLTIP_PADDING;
    }
    if (top < 0) {
      top = margin.top + y + EVOLUTION_TOOLTIP_PADDING;
    }

    left = Math.max(0, Math.min(left, containerRect.width - tooltipRect.width - EVOLUTION_TOOLTIP_PADDING));
    top = Math.max(0, Math.min(top, containerRect.height - tooltipRect.height - EVOLUTION_TOOLTIP_PADDING));

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function handleMove(event) {
    if (values.length === 0) return;
    const [mx] = d3.pointer(event, this);
    const xValue = xScale.invert(mx);
    const index = Math.max(0, Math.min(values.length - 1, Math.round(xValue)));
    const d = values[index];
    const x = xScale(d.index);

    focusGroup.style("display", null);
    focusGroup.select(".evolution-focus-line")
      .attr("x1", x)
      .attr("x2", x);
    focusCircleA.attr("cx", x).attr("cy", yScaleA(d.valueA));
    focusCircleB.attr("cx", x).attr("cy", yScaleB(d.valueB));

    if (tooltip) {
      tooltip.style.opacity = "1";
      showTooltip(d);
      positionTooltip(x, (yScaleA(d.valueA) + yScaleB(d.valueB)) / 2);
    }
  }

  function handleLeave() {
    focusGroup.style("display", "none");
    if (tooltip) {
      tooltip.style.opacity = "0";
    }
  }

  overlay.on("mousemove", handleMove).on("mouseenter", handleMove).on("mouseleave", handleLeave);
}

export function makeRadarBuild(radarId, options = {}) {
  return (bubbleMapAttributes, allAttributes, statsUpdate) => {
    const size = options.size || 200;
    const marginSize = options.margin || 80;
    const width = size;
    const height = size;
    const margin = { top: marginSize + 25, right: marginSize, bottom: marginSize, left: marginSize };

    const color = options.color || ["#CC333F"];
    const scaleRatio = Math.min(width, height) / 200;

    const radarInitialAttributes = Utils.pickItemsWithout(allAttributes, bubbleMapAttributes, RADAR_AXES - bubbleMapAttributes.length);

    const radarChartOptions = {
      w: width, h: height, margin: margin,
      maxValue: 1, levels: 4, roundStrokes: true, color: color,
      axisLabelFontSize: Math.round((options.axisLabelFontSize || 9) * scaleRatio),
      labelFontSize: Math.round((options.labelFontSize || 12) * scaleRatio),
      tooltipFontSize: Math.round((options.tooltipFontSize || 11) * scaleRatio),
      dotRadius: (options.dotRadius || 3) * scaleRatio,
      strokeWidth: (options.strokeWidth || 2) * scaleRatio,
      allAttributes: allAttributes,
      bubbleMapAttributes: bubbleMapAttributes,
      radarAttributes: radarInitialAttributes,
      axisContent: function(options, index) {
        const { allAttributes, bubbleMapAttributes, radarAttributes } = options;

        const fullRadar = Utils.makeList(bubbleMapAttributes, radarAttributes);
        const radarAvailable = Utils.listWithout(allAttributes, bubbleMapAttributes);

        const labelContainer = document.createElement("div");

        if (index === 0 || index === 1 || index == RADAR_AXES - 1) {
          labelContainer.classList.add("radar-naked-label");
          labelContainer.innerText = fullRadar[index][0];
        } else {
          labelContainer.classList.add("radar-labels");

          const label = document.createElement("div");
          label.classList.add("radar-label");
          label.innerText = fullRadar[index][0];
          labelContainer.appendChild(label)

          const selector = document.createElement("div");
          selector.classList.add("radar-selector");
          radarAvailable.forEach(attribute => {
            const span = document.createElement("span");
            span.innerText = attribute[0];
            selector.appendChild(span);

            if (attribute === fullRadar[index]) {
              span.classList.add("selected");
            }

            span.addEventListener("click", (_) => {
              const previous = fullRadar[index];
              const next = radarAttributes.map((a) => a == previous ? attribute : a);
              options.radarAttributes = radarAttributes.map((a) => a == previous ? attribute : a == attribute ? Utils.pickItemsWithout(radarAvailable, next.concat([previous]), 1)[0] : a);
              statsUpdate();
            });
          });

          selector.style.display = "none";
          labelContainer.addEventListener("click", (e) => {
            e.stopPropagation();
            if (selector.style.display === "none") {
              document.querySelectorAll(".radar-selector").forEach(e => e.style.display = "none");
              document.querySelectorAll(".htmlAxisLabel").forEach(el => el.style.zIndex = "");
              selector.style.display = "flex";
              const axisLabel = labelContainer.closest(".htmlAxisLabel");
              if (axisLabel) axisLabel.style.zIndex = "10";
            } else {
              selector.style.display = "none";
              const axisLabel = labelContainer.closest(".htmlAxisLabel");
              if (axisLabel) axisLabel.style.zIndex = "";
            }
          });

          labelContainer.appendChild(selector);
        }

        return labelContainer;
      }
    };

    const radarFullAttributes = Utils.makeList(bubbleMapAttributes, radarInitialAttributes);
    const start = [
      radarFullAttributes.map((_, i) => { return { axis: i, value: 0 }; })
    ];

    const radar = RadarChart(radarId, start, radarChartOptions);

    return {
      radar: radar,
      allAttributes: allAttributes,
      bubbleMapAttributes: bubbleMapAttributes,
      radarAttributes: radarInitialAttributes,
    };
  }
}

export function updateTeamStats(container, built, seasonsLoader, metadataLoader, currentYear, teamId, gameType = "Regular Season") {
  clearDataUnavailableMessage(container);
  const seasonData = seasonsLoader.getData(currentYear, (row) => row["teamId"]);
  const hasTeamDataThisYear = mapHasEntity(seasonData, teamId);
  const hasTeamIdentityThisYear = metadataLoader.getRowForSeason(teamId, currentYear) !== null;
  const hasTeamIdentityAnyYear = metadataLoader.getValue(teamId, () => true) !== null;

  if (!hasTeamDataThisYear) {
    cleanupPlayoffTooltips();
    if (built?.evolution?.tooltipEl) built.evolution.tooltipEl.style.opacity = "0";

    let message = `No data available for this team in ${currentYear}.`;
    if (gameType === "Playoffs") {
      message = hasTeamIdentityThisYear
        ? `No playoff participation for this team in ${currentYear}.`
        : `This team did not exist in ${currentYear}.`;
    } else if (!hasTeamIdentityThisYear && hasTeamIdentityAnyYear) {
      message = `This team did not exist in ${currentYear}.`;
    }

    showDataUnavailableMessage(container, message);
    return;
  }

  const logo = container.querySelector(".stats-logo");

  const teamAbbrev = getMetaValue(metadataLoader, teamId, (row) => row["teamAbbrev"], currentYear);
  const teamSlug = getMetaValue(metadataLoader, teamId, (row) => row["teamSlug"], currentYear);
  const teamCity = seasonsLoader.getData(currentYear, (row) => row["teamCity"]).get(teamId);
  const teamName = seasonsLoader.getData(currentYear, (row) => row["teamName"]).get(teamId);
  const displayName = [teamCity, teamName].filter(Boolean).join(" ");

  if (logo) {
    if (teamSlug) {
      const activeTill = getMetaValue(metadataLoader, teamId, (row) => row["seasonActiveTill"], currentYear);
      const activeTillYear = parseInt(activeTill, 10);
      const logoYear = Number.isNaN(activeTillYear) ? currentYear : activeTillYear;
      const logoYearSegment = logoYear > 2024 ? "current" : logoYear;
      logo.src = `https://i.logocdn.com/nba/${logoYearSegment}/${teamSlug}.svg`;
      logo.alt = displayName || teamAbbrev || teamId;
      logo.hidden = false;
    } else {
      logo.hidden = true;
      logo.removeAttribute("src");
    }
  }

  const rankRegularEl = container.querySelector(".summary-rank-regular");
  const rankPlayoffsEl = container.querySelector(".summary-rank-playoffs");
  const cityEl = container.querySelector(".summary-city");
  const teamEl = container.querySelector(".summary-team");
  const fullnameEl = container.querySelector(".team-fullname");

  if (cityEl) cityEl.textContent = teamCity || "--";
  if (teamEl) teamEl.textContent = teamName || "--";
  if (fullnameEl) fullnameEl.textContent = displayName || "--";

  // snapshot the ids before the async gap so we can bail if the user switched teams in the meantime
  const summaryTargetId = String(teamId);
  const summaryTargetYear = String(currentYear);
  loadCsv("./data/team_seasons.csv").then((rows) => {
    if (summaryTargetId !== String(teamId) || summaryTargetYear !== String(currentYear)) return;
    const regularRanks = getRankMap(rows, currentYear, "Regular Season");
    const playoffRanks = getRankMap(rows, currentYear, "Playoffs");
    const regularSummary = regularRanks.get(summaryTargetId);
    const playoffSummary = playoffRanks.get(summaryTargetId);

    if (rankRegularEl) {
      rankRegularEl.textContent = regularSummary
        ? `#${regularSummary.rank} (${regularSummary.wins}-${regularSummary.losses})`
        : "--";
    }
    if (rankPlayoffsEl) {
      rankPlayoffsEl.textContent = playoffSummary
        ? `#${playoffSummary.rank} (${playoffSummary.wins}-${playoffSummary.losses})`
        : "--";
    }
  }).catch(() => {
    if (rankRegularEl) rankRegularEl.textContent = "--";
    if (rankPlayoffsEl) rankPlayoffsEl.textContent = "--";
  });

  const legendTeam = container.querySelector(".radar-legend .legend-item.team");
  const legendAverage = container.querySelector(".radar-legend .legend-item.average");

  const rawColorA = getMetaValue(metadataLoader, teamId, (row) => row["Color1"], currentYear);
  const rawColorB = getMetaValue(metadataLoader, teamId, (row) => row["Color2"], currentYear);
  const color3 = getMetaValue(metadataLoader, teamId, (row) => row["Color3"], currentYear);
  const colorA = resolveColor(rawColorA, resolveColor(color3, "#CC333F"));
  const colorB = resolveColor(rawColorB, resolveColor(color3, "rgba(80, 80, 80, 0.7)"));
  const statsArea = container.querySelector(".stats-area");
  if (statsArea) statsArea.style.background = colorA;

  if (legendTeam) {
    legendTeam.style.color = colorA;
  }
  if (legendAverage) {
    legendAverage.style.color = colorB;
  }
  built.evolutionTheme = { colorA, colorB };

  // radar chart
  let radarFullAttributes = Utils.makeList(built.bubbleMapAttributes, built.radarAttributes);
  let rawData = seasonsLoader.getData(currentYear, ...radarFullAttributes.map((a) => a[1]));
  let data = normalizeRadarValuesByAxis(rawData, radarFullAttributes.length);
  const teamRawData = rawData.get(teamId) || [];
  const teamRadarData = data.get(teamId) || [];
  const allTeamData = Array.from(data.values());
  const averageRadarData = averageArrays(allTeamData);
  const averageRawData = averageArrays(Array.from(rawData.values()));

  const dataPoints = [
    buildRadarSeries(radarFullAttributes, teamRadarData, teamRawData),
    buildRadarSeries(radarFullAttributes, averageRadarData, averageRawData),
  ];

  built.gameType = gameType;
  built.colors = [colorA, colorB];
  built.radar.update(dataPoints, TRANSITION_TIME, built);

  const teamAvgEl = container.querySelector('.team-averages');
  if (teamAvgEl) {
    loadCsv('./data/team_games.csv').then(rows => {
      if (String(teamId) !== summaryTargetId || String(currentYear) !== summaryTargetYear) return;
      const games = rows.filter(r =>
        r.season === String(currentYear) &&
        r.teamId === String(teamId) &&
        r.gameType === gameType
      );
      renderTeamAverages(teamAvgEl, games, colorA);
    }).catch(() => {
      teamAvgEl.innerHTML = '';
    });
  }

  updateEvolutionChart(container, currentYear, teamId, built);
  updateMatchups(container, currentYear, teamId, metadataLoader, gameType);
}

const _gamesCache = new Map();
let playerStatsReqId = 0;
let calInstance = null;
let gamesByDate = new Map();

async function loadPlayerGames(personId) {
  if (_gamesCache.has(personId)) return _gamesCache.get(personId);
  const rows = await d3.csv(`data/games_by_player/${personId}.csv`);
  _gamesCache.set(personId, rows);
  return rows;
}

function colAvg(rows, field) {
  const vals = rows.map(r => +r[field]).filter(v => isFinite(v));
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

function fmt(v, d = 1) {
  return isFinite(+v) ? (+v).toFixed(d) : '--';
}

function fmtPM(v) {
  const n = +v;
  return !isFinite(n) ? '--' : (n >= 0 ? '+' : '') + n.toFixed(1);
}

function fmtDate(str) {
  if (!str) return '--';
  const d = new Date(str);
  return isNaN(d) ? str.slice(0, 10) : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getShotFilters(container) {
  const madePills = container.querySelector('#shot-filter-made');
  const valuePills = container.querySelector('#shot-filter-value');
  const activeBtn = el => el ? (el.querySelector('.shot-filter-btn.active') || {}).dataset?.value ?? 'all' : 'all';
  return {
    made: activeBtn(madePills),
    shotValue: activeBtn(valuePills),
  };
}

function applyShotFilters(shots, filters) {
  return shots.filter((d) => {
    if (filters.made === 'made' && +d.shotMade !== 1) return false;
    if (filters.made === 'missed' && +d.shotMade !== 0) return false;
    if (filters.shotValue !== 'all' && +d.shotValue !== +filters.shotValue) return false;
    return true;
  });
}

function wireShotFilterControls(container, onChange) {
  container.querySelectorAll('.shot-filter-pills').forEach(pills => {
    pills.querySelectorAll('.shot-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        pills.querySelectorAll('.shot-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onChange();
      });
    });
  });
}

function renderAverages(el, games, teamColor) {
  el.innerHTML = '';
  if (!games.length) return;
  const wins = games.filter(r => +r.win === 1).length;
  const losses = games.length - wins;

  const sections = [
    {
      title: 'Overview',
      rows: [
        ['Games', `${games.length}`],
        ['Record', `${wins}W – ${losses}L`],
        ['Min / game', `${fmt(colAvg(games, 'numMinutes'), 1)}`],
        ['Plus / minus', fmtPM(colAvg(games, 'plusMinusPoints'))],
      ],
    },
    {
      title: 'Scoring',
      rows: [
        ['Points / game', fmt(colAvg(games, 'points'), 1), true],
        ['FG%', `${fmt(colAvg(games, 'fieldGoalsPercentage') * 100, 1)}%`],
        ['3P%', `${fmt(colAvg(games, 'threePointersPercentage') * 100, 1)}%`],
        ['FT%', `${fmt(colAvg(games, 'freeThrowsPercentage') * 100, 1)}%`],
      ],
    },
    {
      title: 'Contribution',
      rows: [
        ['Rebounds / game', fmt(colAvg(games, 'reboundsTotal'), 1), true],
        ['Assists / game', fmt(colAvg(games, 'assists'), 1), true],
        ['Steals / game', fmt(colAvg(games, 'steals'), 1)],
        ['Blocks / game', fmt(colAvg(games, 'blocks'), 1)],
        ['Turnovers / game', fmt(colAvg(games, 'turnovers'), 1)],
        ['Fouls / game', fmt(colAvg(games, 'foulsPersonal'), 1)],
      ],
    },
  ];

  if (teamColor) el.style.setProperty('--player-stat-color', teamColor);

  sections.forEach(({ title, rows }) => {
    const section = document.createElement('div');
    section.className = 'player-stats-section';

    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'player-stats-section-title';
    sectionTitle.textContent = title;
    section.appendChild(sectionTitle);

    rows.forEach(([label, value, highlight]) => {
      const row = document.createElement('div');
      row.className = 'player-stat-row';
      const lbl = document.createElement('span');
      lbl.className = 'player-stat-label';
      lbl.textContent = label;
      const val = document.createElement('span');
      val.className = 'player-stat-value' + (highlight ? ' highlight' : '');
      val.textContent = value;
      row.append(lbl, val);
      section.appendChild(row);
    });

    el.appendChild(section);
  });
}

function renderTeamAverages(el, games, teamColor) {
  el.innerHTML = '';
  if (!games.length) return;
  const wins = games.filter(r => +r.win === 1).length;
  const losses = games.length - wins;

  const sections = [
    {
      title: 'Overview',
      rows: [
        ['Games', `${games.length}`],
        ['Record', `${wins}W – ${losses}L`],
        ['Points / game', fmt(colAvg(games, 'teamScore'), 1), true],
        ['Points Allowed / game', fmt(colAvg(games, 'opponentScore'), 1)],
        ['Plus / minus', fmtPM(colAvg(games, 'plusMinusPoints'))],
      ],
    },
    {
      title: 'Shooting',
      rows: [
        ['FG%', `${fmt(colAvg(games, 'fieldGoalsPercentage') * 100, 1)}%`],
        ['3P%', `${fmt(colAvg(games, 'threePointersPercentage') * 100, 1)}%`],
        ['FT%', `${fmt(colAvg(games, 'freeThrowsPercentage') * 100, 1)}%`],
      ],
    },
    {
      title: 'Other',
      rows: [
        ['Rebounds / game', fmt(colAvg(games, 'rebounds'), 1), true],
        ['Assists / game', fmt(colAvg(games, 'assists'), 1), true],
        ['Steals / game', fmt(colAvg(games, 'steals'), 1)],
        ['Blocks / game', fmt(colAvg(games, 'blocks'), 1)],
        ['Turnovers / game', fmt(colAvg(games, 'turnovers'), 1)],
        ['Fouls / game', fmt(colAvg(games, 'foulsPersonal'), 1)],
      ],
    },
  ];

  if (teamColor) el.style.setProperty('--player-stat-color', teamColor);

  sections.forEach(({ title, rows }) => {
    const section = document.createElement('div');
    section.className = 'player-stats-section';

    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'player-stats-section-title';
    sectionTitle.textContent = title;
    section.appendChild(sectionTitle);

    rows.forEach(([label, value, highlight]) => {
      const row = document.createElement('div');
      row.className = 'player-stat-row';
      const lbl = document.createElement('span');
      lbl.className = 'player-stat-label';
      lbl.textContent = label;
      const val = document.createElement('span');
      val.className = 'player-stat-value' + (highlight ? ' highlight' : '');
      val.textContent = value;
      row.append(lbl, val);
      section.appendChild(row);
    });

    el.appendChild(section);
  });
}

function isDateInSeason(dateStr, gameType) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const monthDay = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  if (gameType === "Playoffs") {
    // Playoffs: mid-April to end of June
    return monthDay >= "04-15" && monthDay <= "06-30";
  }
  // Regular Season: mid-October to mid-April
  return (monthDay >= "10-15") || (monthDay <= "04-15");
}

function renderCalendarHeatmap(games, currentYear, statsAreaEl, color = '#0f3285', onGameHover = null, onGameLeave = null, gameType = "Regular Season") {
  if (calInstance) {
    try { calInstance.destroy(); } catch (e) {}
    calInstance = null;
  }

  gamesByDate = new Map();
  const source = [];
  games.forEach(r => {
    const dateStr = r.gameDateTimeEst ? r.gameDateTimeEst.slice(0, 10) : null;
    if (!dateStr || !isDateInSeason(dateStr, gameType)) return;
    gamesByDate.set(dateStr, r);
    source.push({ date: dateStr, value: +r.points });
  });

  const maxPts = d3.max(games, d => +d.points) || 40;

  try {
    calInstance = new window.CalHeatmap();

    calInstance.on('mouseover', (event, timestamp, value) => {
      if (value == null) return;
      const d = new Date(timestamp);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (event.target?.tagName === 'rect') {
        event.target.style.stroke = color;
        event.target.style.strokeWidth = '2px';
      }
      d3.select('#player-games-chart').selectAll('rect')
        .filter(d => d?.gameDateTimeEst?.slice(0, 10) === dateStr)
        .attr('fill', color);
      const game = gamesByDate.get(dateStr);
      if (game) {
        showGamePopup(event, game, statsAreaEl);
        if (onGameHover) onGameHover(game.gameId);
      }
    });

    calInstance.on('mouseout', (event, timestamp, value) => {
      if (event.target?.tagName === 'rect') {
        event.target.style.stroke = '';
        event.target.style.strokeWidth = '';
      }
      d3.select('#player-games-chart').selectAll('rect')
        .attr('fill', d => d && +d.win === 1 ? GAME_WIN_COLOR : GAME_LOSS_COLOR);
      const popup = statsAreaEl.querySelector('.game-popup');
      if (popup) popup.style.display = 'none';
      if (onGameLeave) onGameLeave();
    });

    const startDate = gameType === "Playoffs"
      ? new Date(currentYear, 3, 15)
      : new Date(currentYear, 9, 15);
    const monthRange = gameType === "Playoffs" ? 3 : 6;

    calInstance.paint({
      itemSelector: '#player-calendar',
      data: {
        source,
        x: 'date',
        y: 'value',
        defaultValue: null,
      },
      date: { start: startDate },
      range: monthRange,
      domain: {
        type: 'month',
        gutter: 6,
        label: { text: 'MMM', position: 'top' },
      },
      subDomain: {
        type: 'ghDay',
        radius: 2,
        width: 14,
        height: 14,
        gutter: 2,
      },
      scale: {
        color: {
          range: ['#ffffff', color],
          type: 'linear',
          domain: [0, maxPts],
        },
      },
      theme: 'dark',
    });
  } catch (e) {
    console.error('CalHeatmap error:', e);
  }
}

function showGamePopup(event, game, statsAreaEl) {
  let popup = statsAreaEl.querySelector('.game-popup');
  if (!popup) {
    popup = document.createElement('div');
    popup.className = 'game-popup';
    statsAreaEl.appendChild(popup);
  }

  const opp = [game.opponentteamCity, game.opponentteamName].filter(Boolean).join(' ') || '--';
  const won = +game.win === 1;
  const wl = won ? 'Win' : 'Loss';
  const ha = +game.home === 1 ? 'vs' : '@';
  const score = (game.homeScore && game.awayScore) ? `${game.homeScore}–${game.awayScore}` : '';

  popup.innerHTML = `
    <div class="popup-matchup">
      <span class="popup-wl ${won ? 'popup-win' : 'popup-loss'}">${wl}</span>
      <span class="popup-opp">${ha} ${opp}</span>
      ${score ? `<span class="popup-score">${score}</span>` : ''}
    </div>
    <div class="popup-date">${fmtDate(game.gameDateTimeEst)}</div>
    <div class="popup-stats-grid">
      ${[
        ['MIN', isFinite(+game.numMinutes) ? Math.round(+game.numMinutes) : '--'],
        ['PTS', game.points],
        ['REB', game.reboundsTotal],
        ['AST', game.assists],
        ['STL', game.steals],
        ['BLK', game.blocks],
        ['+/-', fmtPM(+game.plusMinusPoints)],
        ['FG%', (+game.fieldGoalsPercentage * 100).toFixed(1)],
        ['3P%', (+game.threePointersPercentage * 100).toFixed(1)],
        ['FT%', (+game.freeThrowsPercentage * 100).toFixed(1)],
      ].map(([l, v]) => `<div class="popup-stat"><span class="popup-stat-num">${v}</span><span class="popup-stat-lbl">${l}</span></div>`).join('')}
    </div>
  `;

  const areaRect = statsAreaEl.getBoundingClientRect();
  let left = event.clientX - areaRect.left + 12;
  let top  = event.clientY - areaRect.top  + 12;
  if (left + 264 > areaRect.width  - 8) left = event.clientX - areaRect.left - 276;
  if (top  + 200 > areaRect.height - 8) top  = event.clientY - areaRect.top  - 212;

  popup.style.cssText = `display:block; left:${Math.max(8, left)}px; top:${Math.max(8, top)}px; transform:none;`;
}

function getMetricValue(game, metric) {
  const metricMap = {
    points: 'points',
    assists: 'assists',
    rebounds: 'reboundsTotal',
    blocks: 'blocks',
    steals: 'steals'
  };
  return +(game[metricMap[metric]] || 0);
}

function wireGameHistoryMetricSelector(container, svgEl, games, teamColor, onGameHover, onGameLeave) {
  const selectorWrapper = container.querySelector('.game-metric-selector');
  const dropdownEl = container.querySelector('.game-metric-dropdown');
  const displayEl = container.querySelector('#game-metric-display');

  if (!selectorWrapper || !dropdownEl || !displayEl) return;

  const metricLabels = {
    points: 'Points',
    assists: 'Assists',
    rebounds: 'Rebounds',
    blocks: 'Blocks',
    steals: 'Steals'
  };

  // Get saved metric or default to 'points'
  let currentMetric = selectorWrapper.dataset.currentMetric || 'points';

  const renderChart = (metric = currentMetric) => {
    currentMetric = metric;
    selectorWrapper.dataset.currentMetric = metric;
    displayEl.textContent = metricLabels[metric];
    renderGamesChart(svgEl, games, teamColor, onGameHover, onGameLeave, metric);
  };

  // Wait for DOM layout to stabilize
  requestAnimationFrame(() => {
    setTimeout(() => renderChart(), 0);
  });

  // Use event delegation on the selector wrapper
  selectorWrapper.removeEventListener('click', selectorWrapper._boundClickHandler);
  selectorWrapper._boundClickHandler = (e) => {
    const optionEl = e.target.closest('.game-metric-dropdown span');

    if (e.target === displayEl) {
      selectorWrapper.classList.toggle('open');
    } else if (optionEl) {
      const metric = optionEl.dataset.value;
      selectorWrapper.classList.remove('open');
      renderChart(metric);
    }
  };
  selectorWrapper.addEventListener('click', selectorWrapper._boundClickHandler);

  // Close dropdown when clicking outside
  document.removeEventListener('click', window._gameHistoryCloseHandler);
  window._gameHistoryCloseHandler = (e) => {
    if (!selectorWrapper.contains(e.target)) {
      selectorWrapper.classList.remove('open');
    }
  };
  document.addEventListener('click', window._gameHistoryCloseHandler);
}

function renderGamesChart(svgEl, games, teamColor = '#005ce6', onGameHover = null, onGameLeave = null, metric = 'points') {
  const svg = d3.select(svgEl);
  svg.selectAll('*').remove();
  if (!games.length) return;

  const rect = svgEl.getBoundingClientRect();
  const W = rect.width  || 380;
  const H = rect.height || 160;
  const m = { top: 16, right: 12, bottom: 40, left: 50 };
  const iW = W - m.left - m.right;
  const iH = H - m.top  - m.bottom;

  svg.attr('viewBox', `0 0 ${W} ${H}`).attr('preserveAspectRatio', 'xMidYMid meet');
  const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

  const maxVal = d3.max(games, d => getMetricValue(d, metric)) || 1;
  const x = d3.scaleBand().domain(d3.range(games.length)).range([0, iW]).padding(0.1);
  const y = d3.scaleLinear().domain([0, maxVal]).range([iH, 0]);

  g.selectAll('rect')
    .data(games)
    .join('rect')
    .attr('x', (_, i) => x(i))
    .attr('y', d => y(getMetricValue(d, metric)))
    .attr('width', x.bandwidth())
    .attr('height', d => iH - y(getMetricValue(d, metric)))
    .attr('fill', d => +d.win === 1 ? GAME_WIN_COLOR : GAME_LOSS_COLOR)
    .on('mouseover', function(event, d) {
      d3.select(this).attr('fill', teamColor);
      const statsAreaEl = svgEl.closest('.stats-area');
      if (statsAreaEl) showGamePopup(event, d, statsAreaEl);
      if (onGameHover && d.gameId) onGameHover(d.gameId);
    })
    .on('mouseout', function(event, d) {
      d3.select(this).attr('fill', +d.win === 1 ? GAME_WIN_COLOR : GAME_LOSS_COLOR);
      const statsAreaEl = svgEl.closest('.stats-area');
      const popup = statsAreaEl?.querySelector('.game-popup');
      if (popup) popup.style.display = 'none';
      if (onGameLeave) onGameLeave();
    });

  g.append('line')
    .attr('x1', 0).attr('y1', iH).attr('x2', iW).attr('y2', iH)
    .attr('stroke', 'rgba(0,0,0,0.15)').attr('stroke-width', 1);

  // Y-axis ticks and labels
  const yTicks = [0, Math.ceil(maxVal * 0.5), Math.ceil(maxVal)];
  yTicks.forEach(v => {
    g.append('line')
      .attr('x1', -3).attr('y1', y(v))
      .attr('x2', 0).attr('y2', y(v))
      .attr('stroke', 'rgba(0,0,0,0.2)').attr('stroke-width', 1);

    g.append('text')
      .attr('x', -8).attr('y', y(v) + 4)
      .attr('text-anchor', 'end').attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('fill', 'rgba(0,0,0,0.7)')
      .text(v);
  });
}

function findNbaChampion(rows, year) {
  const playoffRows = rows.filter(r => r.season === String(year) && r.gameType === "Playoffs");
  if (!playoffRows.length) return null;
  const seriesMap = new Map();
  playoffRows.forEach(r => {
    const key = [r.teamId, r.opponentTeamId].sort().join("|");
    if (!seriesMap.has(key)) seriesMap.set(key, []);
    seriesMap.get(key).push(r);
  });
  let latestTime = -Infinity;
  let finalsSeries = null;
  for (const games of seriesMap.values()) {
    const maxTime = Math.max(...games.map(g => new Date(g.gameDateTimeEst || 0).getTime()));
    if (maxTime > latestTime) { latestTime = maxTime; finalsSeries = games; }
  }
  if (!finalsSeries) return null;
  const wins = new Map();
  finalsSeries.forEach(g => {
    if (Number(g.win) === 1) wins.set(g.teamId, (wins.get(g.teamId) || 0) + 1);
  });
  let champion = null, maxWins = 0;
  for (const [teamId, w] of wins) {
    if (w > maxWins) { maxWins = w; champion = teamId; }
  }
  return champion;
}

export function updatePlayerStats(container, built, seasonsLoader, metadataLoader, currentYear, playerId, gameType = "Regular Season", awardsLoader = null) {
  const PLAYER_RADAR_DEFAULT_COLOR = "#005ce6";
  const PLAYER_RADAR_DEFAULT_AVG_COLOR = "rgba(80,80,80,0.7)";

  clearDataUnavailableMessage(container);
  const seasonData = seasonsLoader.getData(currentYear, (row) => row["personId"]);
  const hasPlayerDataThisYear = mapHasEntity(seasonData, playerId);
  const hasPlayerIdentity = metadataLoader.getValue(playerId, () => true) !== null;
  if (!hasPlayerDataThisYear) {
    if (built.playerAuxTimer) {
      clearTimeout(built.playerAuxTimer);
      built.playerAuxTimer = null;
    }
    playerStatsReqId += 1;
    renderTopTeamLogos(container, []);

    const message = gameType === "Playoffs"
      ? `No playoff participation for this player in ${currentYear}.`
      : hasPlayerIdentity
        ? `This player has no data for ${currentYear}.`
        : "Player data unavailable.";
    showDataUnavailableMessage(container, message);
    return;
  }

  const name = container.querySelector(".name");
  const playerName = getMetaValue(metadataLoader, playerId, (row) => row["firstName"] + " " + row["lastName"], currentYear);
  name.innerText = playerName || "";

  const headshot = container.querySelector(".player-headshot");
  if (headshot) {
    headshot.src = `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`;
    headshot.hidden = false;
    headshot.onerror = () => { headshot.hidden = true; };
  }

  // Render awards (champion badge added async once team data is known)
  const awardsContainer = container.querySelector(".player-awards-container");
  if (awardsContainer && awardsLoader) {
    const awardKey = `${playerName}|${currentYear + 1}`;
    if (awardsContainer.dataset.awardKey !== awardKey) {
      awardsContainer.dataset.awardKey = awardKey;
      const playerAwards = awardsLoader.getPlayerAwardsByName(playerName, currentYear + 1);
      awardsContainer.innerHTML = "";
      playerAwards.forEach((award) => {
        const awardEl = document.createElement("div");
        awardEl.className = "player-award";
        awardEl.title = award.label;
        const img = document.createElement("img");
        img.src = `data/nba_awards/${award.icon}`;
        img.alt = award.label;
        awardEl.appendChild(img);
        awardsContainer.appendChild(awardEl);
      });
    }
  }

  // radar chart
  let radarFullAttributes = Utils.makeList(built.bubbleMapAttributes, built.radarAttributes);
  let rawData = seasonsLoader.getData(currentYear, ...radarFullAttributes.map((a) => a[1]));
  let data = normalizeRadarValuesByAxis(rawData, radarFullAttributes.length);
  const playerRawData = rawData.get(playerId) || [];
  let playerRadarData = data.get(playerId) || [];
  const allPlayerData = Array.from(data.values());
  const averageRadarData = averageArrays(allPlayerData);
  const averageRawData = averageArrays(Array.from(rawData.values()));
  let dataPoints = [
    buildRadarSeries(radarFullAttributes, playerRadarData, playerRawData),
    buildRadarSeries(radarFullAttributes, averageRadarData, averageRawData),
  ];
  const colorKey = `${playerId}|${currentYear}|${gameType}`;
  if (!built.playerRadarColorsByKey) built.playerRadarColorsByKey = new Map();
  const statsArea = container.querySelector('.stats-area') || container;
  const areaColor = statsArea.style.background || PLAYER_RADAR_DEFAULT_COLOR;
  const fallbackColors = built.colors || [resolveColor(areaColor, PLAYER_RADAR_DEFAULT_COLOR), PLAYER_RADAR_DEFAULT_AVG_COLOR];
  const [playerRadarColor, playerRadarAvgColor] = built.playerRadarColorsByKey.get(colorKey) || fallbackColors;
  const legendPlayer = container.querySelector(".player-radar-card .radar-legend .legend-item.team");
  const legendAverage = container.querySelector(".player-radar-card .radar-legend .legend-item.average");
  if (legendPlayer) legendPlayer.style.color = playerRadarColor;
  if (legendAverage) legendAverage.style.color = playerRadarAvgColor;
  built.colors = [playerRadarColor, playerRadarAvgColor];
  built.radar.update(dataPoints, TRANSITION_TIME, built);

  const auxSignature = colorKey;
  if (built.playerAuxSignature === auxSignature) return;
  const previousAuxYear = built.playerAuxYear;
  const previousAuxPlayer = built.playerAuxPlayer;
  built.playerAuxSignature = auxSignature;
  built.playerAuxYear = String(currentYear);
  built.playerAuxPlayer = String(playerId);
  const yearChanged = previousAuxYear != null && previousAuxYear !== built.playerAuxYear;
  const playerChanged = previousAuxPlayer !== built.playerAuxPlayer;

  if (built.playerAuxTimer) {
    clearTimeout(built.playerAuxTimer);
  }
  if (playerChanged) renderTopTeamLogos(container, []);

  // games, calendar, shot chart
  built.playerAuxTimer = setTimeout(() => {
    requestAnimationFrame(() => {
      if (built.playerAuxSignature !== auxSignature) return;

      const chartEl = document.getElementById("player-chart");
      if (!chartEl) return;

      const loadingSvg = d3.select(chartEl);
      loadingSvg.selectAll("*").remove();
      loadingSvg.attr("viewBox", "0 20 440 424").attr("preserveAspectRatio", "xMidYMid meet");
      loadingSvg.append("image").attr("href", "data/nba-court.svg").attr("width", 601).attr("height", 444);
      loadingSvg.append("text")
        .attr("x", 218).attr("y", 230)
        .attr("text-anchor", "middle")
        .attr("fill", "#ffffff").attr("font-size", 16)
        .text("Loading...");

    const reqId = ++playerStatsReqId;
    let allShots = [];

    const gameContext = { gamesById: new Map(), teamColor: '#005ce6' };

    const onGameHover = (gameId, event) => {
      highlightShotsByGame(chartEl, gameId);
      d3.select('#player-games-chart').selectAll('rect')
        .filter(d => String(d?.gameId) === String(gameId))
        .attr('fill', gameContext.teamColor);
      const game = gameContext.gamesById.get(String(gameId));
      if (game) {
        const dateStr = game.gameDateTimeEst?.slice(0, 10);
        if (dateStr) {
          const ts = new Date(dateStr).getTime();
          const calRect =
            document.querySelector(`#player-calendar rect[data-date="${dateStr}"]`) ||
            document.querySelector(`#player-calendar rect[data-date="${ts}"]`);
          if (calRect) { calRect.style.stroke = gameContext.teamColor; calRect.style.strokeWidth = '2px'; }
        }
        if (event) showGamePopup(event, game, statsArea);
      }
    };

    const onGameLeave = () => {
      highlightShotsByGame(chartEl, null);
      d3.select('#player-games-chart').selectAll('rect')
        .attr('fill', d => d && +d.win === 1 ? GAME_WIN_COLOR : GAME_LOSS_COLOR);
      document.querySelectorAll('#player-calendar [data-date]').forEach(el => {
        el.style.stroke = ''; el.style.strokeWidth = '';
      });
      const popup = statsArea.querySelector('.game-popup');
      if (popup) popup.style.display = 'none';
    };

    const rerenderShotChart = () => {
      if (reqId !== playerStatsReqId) return;
      const filters = getShotFilters(container);
      drawShotChart(chartEl, applyShotFilters(allShots, filters), { onShotHover: onGameHover, onShotLeave: onGameLeave });
      d3.select(chartEl).attr("viewBox", "0 20 440 424").attr("preserveAspectRatio", "xMidYMid meet");
    };

    container.querySelectorAll('.shot-filter-pills').forEach(pills => {
      pills.querySelectorAll('.shot-filter-btn').forEach((btn, i) => btn.classList.toggle('active', i === 0));
    });

    wireShotFilterControls(container, rerenderShotChart);

    loadShots(playerId, currentYear, gameType).then(shots => {
      if (reqId !== playerStatsReqId) return;
      if (shots !== null) {
        allShots = shots;
        rerenderShotChart();
      }
    }).catch((err) => {
      if (reqId !== playerStatsReqId) return;
      d3.select(chartEl).selectAll('*').remove();
      const errorMsg = err?.message?.includes("1996 and 2024")
        ? "Shot data available\nonly between 1996 and 2024"
        : "No shot data";
      d3.select(chartEl)
        .attr("viewBox", "0 20 440 424").attr("preserveAspectRatio", "xMidYMid meet")
        .append("text")
          .attr("x", 218).attr("y", 220)
          .attr("text-anchor", "middle")
          .attr("fill", "#ffffff").attr("font-size", 15)
          .text(errorMsg);
    });

      Promise.all([
      loadPlayerGames(playerId),
      loadCsv('./data/team_seasons.csv'),
      loadCsv('./data/team_metadata.csv'),
      loadCsv('./data/team_games.csv'),
    ]).then(([allGames, teamSeasons, teamMeta, teamGames]) => {
      if (reqId !== playerStatsReqId) return;

      const games = allGames
        .filter(r => +r.season === +currentYear && r.gameType === gameType)
        .sort((a, b) => new Date(a.gameDateTimeEst || 0) - new Date(b.gameDateTimeEst || 0));

      const teamStats = new Map();
      games.filter(r => r.playerteamName).forEach((r, index) => {
        const key = `${r.playerteamCity}|${r.playerteamName}`;
        if (!teamStats.has(key)) {
          teamStats.set(key, { gameCount: 0, firstIndex: index });
        }
        teamStats.get(key).gameCount += 1;
      });

      const teamsPlayed = [...teamStats.entries()]
        .map(([teamKey, stats]) => {
          const [city, name] = teamKey.split('|');
          const teamRow = teamSeasons.find(r => +r.season === +currentYear && r.teamName === name && r.teamCity === city);
          const metaRow = teamRow ? getTeamMetaRowForSeason(teamMeta, teamRow.teamId, currentYear) : null;
          return { gameCount: stats.gameCount, firstIndex: stats.firstIndex, metaRow, teamId: teamRow?.teamId };
        })
        .filter((entry) => entry.metaRow);

      // NBA Champion badge — prepended to awards if player's team won the Finals
      const championTeamId = findNbaChampion(teamGames, currentYear);
      const isChampion = !!championTeamId && teamsPlayed.some(t => String(t.teamId) === String(championTeamId));
      if (isChampion && reqId === playerStatsReqId) {
        const ac = container.querySelector(".player-awards-container");
        if (ac) {
          ac.querySelector('[data-award="champion"]')?.remove();
          const el = document.createElement("div");
          el.className = "player-award";
          el.title = "NBA Champion";
          el.dataset.award = "champion";
          const img = document.createElement("img");
          img.src = "data/nba_awards/nba_champion.svg";
          img.alt = "NBA Champion";
          el.appendChild(img);
          ac.prepend(el);
        }
      }

      gameContext.gamesById = new Map(games.map(g => [String(g.gameId), g]));

      const primaryTeam = [...teamsPlayed]
        .sort((a, b) => b.gameCount - a.gameCount || a.firstIndex - b.firstIndex)[0];
      if (primaryTeam) {
        const metaRow = primaryTeam.metaRow;
        const colorA = resolveColor(metaRow.Color1, resolveColor(metaRow.Color3, '#005ce6'));
        gameContext.teamColor = colorA;
        const colorB = resolveColor(metaRow.Color2, resolveColor(metaRow.Color3, 'rgba(80,80,80,0.7)'));
        const teamLogoUrls = [...teamsPlayed]
          .sort((a, b) => a.firstIndex - b.firstIndex)
          .map(({ metaRow: row }) => buildTeamLogoUrlFromMeta(row, currentYear))
          .filter(Boolean);
        renderTopTeamLogos(container, teamLogoUrls);
        built.playerRadarColorsByKey.set(colorKey, [colorA, colorB]);
        built.colors = [colorA, colorB];
        statsArea.style.background = colorA;
        if (legendPlayer) legendPlayer.style.color = colorA;
        if (legendAverage) legendAverage.style.color = colorB;
        built.radar.update(dataPoints, TRANSITION_TIME, built);
        renderAverages(container.querySelector('.player-averages'), games, colorA);
        wireGameHistoryMetricSelector(container, document.getElementById('player-games-chart'), games, colorA, onGameHover, onGameLeave);
        return;
      }

      renderTopTeamLogos(container, []);
      renderAverages(container.querySelector('.player-averages'), games, '#005ce6');
      wireGameHistoryMetricSelector(container, document.getElementById('player-games-chart'), games, '#005ce6', onGameHover, onGameLeave);
      });
    });
  }, yearChanged ? TRANSITION_TIME : 0);
}
