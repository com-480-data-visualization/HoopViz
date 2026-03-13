// currently fake data

export const teams = [
  { id: "ATL", name: "Atlanta Hawks", color: "#C1272D" },
  { id: "BOS", name: "Boston Celtics", color: "#007A33" },
  { id: "BKN", name: "Brooklyn Nets", color: "#000000" },
  { id: "CHA", name: "Charlotte Hornets", color: "#1D1160" },
  { id: "CHI", name: "Chicago Bulls", color: "#CE1141" },
  { id: "CLE", name: "Cleveland Cavaliers", color: "#860038" },
  { id: "DAL", name: "Dallas Mavericks", color: "#00538C" },
  { id: "DEN", name: "Denver Nuggets", color: "#0E2240" },
  { id: "DET", name: "Detroit Pistons", color: "#C8102E" },
  { id: "GSW", name: "Golden State Warriors", color: "#1D428A" },
  { id: "HOU", name: "Houston Rockets", color: "#CE1141" },
  { id: "IND", name: "Indiana Pacers", color: "#002D62" },
  { id: "LAC", name: "LA Clippers", color: "#C8102E" },
  { id: "LAL", name: "Los Angeles Lakers", color: "#552583" },
  { id: "MEM", name: "Memphis Grizzlies", color: "#5D76A9" },
  { id: "MIA", name: "Miami Heat", color: "#98002E" },
  { id: "MIL", name: "Milwaukee Bucks", color: "#00471B" },
  { id: "MIN", name: "Minnesota Timberwolves", color: "#0C2340" },
  { id: "NOP", name: "New Orleans Pelicans", color: "#0C2340" },
  { id: "NYK", name: "New York Knicks", color: "#006BB6" },
  { id: "OKC", name: "Oklahoma City Thunder", color: "#007AC1" },
  { id: "ORL", name: "Orlando Magic", color: "#0077C0" },
  { id: "PHI", name: "Philadelphia 76ers", color: "#006BB6" },
  { id: "PHX", name: "Phoenix Suns", color: "#1D1160" },
  { id: "POR", name: "Portland Trail Blazers", color: "#E03A3E" },
  { id: "SAC", name: "Sacramento Kings", color: "#5A2D81" },
  { id: "SAS", name: "San Antonio Spurs", color: "#C4CED4" },
  { id: "TOR", name: "Toronto Raptors", color: "#CE1141" },
  { id: "UTA", name: "Utah Jazz", color: "#002B5C" },
  { id: "WAS", name: "Washington Wizards", color: "#002B5C" },
];

const minYear = 1990;
const maxYear = 2025;

export const teamsPositions = {};
for (let year = minYear; year <= maxYear; year++) {
  teamsPositions[year] = {};
  teams.forEach((team) => {
    teamsPositions[year][team.id] = {
      size: Math.random() * 0.7 + 0.2,
      targetX: Math.random(),
      targetY: Math.random(),
    };
  });
}
