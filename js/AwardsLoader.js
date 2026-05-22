export class AwardsLoader {
  #awardSharesData = [];
  #endOfSeasonTeamsData = [];
  #allStarData = [];
  #awardToIcon = {
    "nba mvp": "mvp.svg",
    "nba dpoy": "dpoy.svg",
    "nba roy": "roy.svg",
    "All-NBA": {
      "1st": "1st_team.svg",
      "2nd": "2nd_team.svg",
      "3rd": "3rd_team.svg",
    },
    "All-Rookie": {
      "1st": "rookie_team.svg",
    },
    "All-Defense": {
      "1st": "dpoy.svg",
    },
    "All-Star": "all_star.svg",
  };

  // Award priority for filtering (0 = highest)
  #awardPriority = {
    "MVP": 0,
    "All-NBA 1st": 1,
    "All-NBA 2nd": 2,
    "All-NBA 3rd": 3,
    "All-Star": 4,
    "DPOY": 5,
    "ROY": 6,
    "All-Defense": 7,
    "All-Rookie": 8,
  };

  constructor() {
  }

  async load() {
    try {
      // Load Player Award Shares (MVP, DPOY, ROY)
      const awardSharesResponse = await fetch("data/nba_awards/Player%20Award%20Shares.csv");
      const awardSharesText = await awardSharesResponse.text();
      this.#parseAwardShares(awardSharesText);

      // Load End of Season Teams (All-NBA, All-Rookie, All-Defense)
      const endOfSeasonResponse = await fetch("data/nba_awards/End%20of%20Season%20Teams.csv");
      const endOfSeasonText = await endOfSeasonResponse.text();
      this.#parseEndOfSeasonTeams(endOfSeasonText);
      const endOfSeasonTeamsCount = this.#endOfSeasonTeamsData.length;

      // Load All-Star Selections
      const allStarResponse = await fetch("data/nba_awards/All-Star%20Selections.csv");
      const allStarText = await allStarResponse.text();
      this.#parseAllStar(allStarText);
    } catch (error) {
      console.error("AwardsLoader: Failed to load awards data:", error);
    }
    return this;
  }

  #parseAwardShares(text) {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",");

    for (let i = 1; i < lines.length; i++) {
      const values = this.#parseLine(lines[i]);
      const row = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() ?? "";
      });
      this.#awardSharesData.push(row);
    }
  }

  #parseEndOfSeasonTeams(text) {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",");

    for (let i = 1; i < lines.length; i++) {
      const values = this.#parseLine(lines[i]);
      const row = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() ?? "";
      });
      this.#endOfSeasonTeamsData.push(row);
    }
  }

  #parseAllStar(text) {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",");

    for (let i = 1; i < lines.length; i++) {
      const values = this.#parseLine(lines[i]);
      const row = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() ?? "";
      });
      this.#allStarData.push(row);
    }
  }

  #parseLine(line) {
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

  /**
   * Get awards for a player by name and year
   * Returns array of award objects with icon and label
   */
  getPlayerAwardsByName(playerName, year, maxAwards = null) {
    const awards = [];
    const yearStr = String(year);
    const nameToMatch = String(playerName).trim();


    // Check Player Award Shares (MVP, DPOY, ROY, MIP, SMOY, CLUTCH_POY)
    const awardShares = this.#awardSharesData.filter(
      (row) =>
        row.player.trim() === nameToMatch &&
        String(row.season) === yearStr &&
        String(row.winner).toLowerCase() === "true"
    );

    awardShares.forEach((award) => {
      const iconFile = this.#awardToIcon[award.award];
      if (iconFile && !awards.some((a) => a.icon === iconFile)) {
        const label = this.#formatAwardLabel(award.award);
        awards.push({
          icon: iconFile,
          label: label,
          priority: this.#awardPriority[label] ?? 999,
        });
      }
    });

    // Check End of Season Teams (All-NBA, All-Rookie, All-Defense)
    const endOfSeasonMatches = this.#endOfSeasonTeamsData.filter(
      (row) =>
        row.player.trim() === nameToMatch &&
        String(row.season) === yearStr
    );

    endOfSeasonMatches.forEach((entry) => {
      const awardType = entry.type.trim();
      const teamLevel = entry.number_tm?.trim();

      if (awardType === "All-NBA" && this.#awardToIcon["All-NBA"][teamLevel]) {
        const iconFile = this.#awardToIcon["All-NBA"][teamLevel];
        const label = `All-NBA ${teamLevel}`;
        if (!awards.some((a) => a.icon === iconFile)) {
          awards.push({
            icon: iconFile,
            label: label,
            priority: this.#awardPriority[label] ?? 999,
          });
        }
      } else if (awardType === "All-Rookie" && this.#awardToIcon["All-Rookie"][teamLevel]) {
        const iconFile = this.#awardToIcon["All-Rookie"][teamLevel];
        const label = "All-Rookie";
        if (!awards.some((a) => a.icon === iconFile)) {
          awards.push({
            icon: iconFile,
            label: label,
            priority: this.#awardPriority[label] ?? 999,
          });
        }
      } else if (awardType === "All-Defense" && teamLevel === "1st") {
        const iconFile = this.#awardToIcon["All-Defense"]["1st"];
        const label = "All-Defense";
        if (!awards.some((a) => a.icon === iconFile)) {
          awards.push({
            icon: iconFile,
            label: label,
            priority: this.#awardPriority[label] ?? 999,
          });
        }
      }
    });

    // Check All-Star selections
    const allStarMatch = this.#allStarData.find(
      (row) =>
        row.player.trim() === nameToMatch &&
        String(row.season) === yearStr &&
        String(row.replaced).toLowerCase() === "false"
    );

    if (allStarMatch) {
      const label = "All-Star";
      if (!awards.some((a) => a.label === label)) {
        awards.push({
          icon: this.#awardToIcon["All-Star"],
          label: label,
          priority: this.#awardPriority[label] ?? 999,
        });
      }
    }

    // Sort by priority
    awards.sort((a, b) => a.priority - b.priority);

    // Filter to max awards if specified
    if (maxAwards && awards.length > maxAwards) {
      awards.splice(maxAwards);
    }

    return awards;
  }

  #formatAwardLabel(awardName) {
    const labels = {
      "nba mvp": "MVP",
      "nba dpoy": "DPOY",
      "nba roy": "ROY",
      "nba mip": "MIP",
      "nba smoy": "6MOY",
      "nba clutch_poy": "Clutch POY",
      "aba mvp": "MVP",
      "aba roy": "ROY",
      "baa roy": "ROY",
    };
    return labels[awardName] || awardName;
  }
}
