export class MetadataLoader {
  #data = [];
  #csvUrl;

  constructor(csvUrl, keyName) {
    this.keyName = keyName;
    this.#csvUrl = csvUrl;
  }

  async load() {
    const response = await fetch(this.#csvUrl);
    const text = await response.text();
    this.#parseCSV(text);

    return this;
  }

  #parseCSV(text) {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",");

    for (let i = 1; i < lines.length; i++) {
      const values = this.#parseLine(lines[i]);
      const row = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() ?? "";
      });
      this.#data.push(row);
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

  getValue(key, attribute) {
    for (const row of this.#data) {
      if (this.keyName(row) === key) {
        return attribute(row);
      }
    }

    return null;
  }

  getRowForSeason(key, year) {
    let firstMatch = null;
    let hasSeasonInfo = false;

    for (const row of this.#data) {
      if (this.keyName(row) !== key) continue;

      if (!firstMatch) {
        firstMatch = row;
      }

      if (year == null) {
        return row;
      }

      const start = parseInt(row.seasonFounded, 10);
      const end = parseInt(row.seasonActiveTill, 10);

      if (!Number.isNaN(start) && !Number.isNaN(end)) {
        hasSeasonInfo = true;
        if (year >= start && year <= end) {
          return row;
        }
      }
    }

    // if the entity has season-bounded rows but none matched, the team didn't exist that year
    // return null rather than a wrong identity. entities without season info fall back to firstMatch.
    if (year != null && hasSeasonInfo) {
      return null;
    }

    return firstMatch;
  }

  getValueForSeason(key, attribute, year) {
    const row = this.getRowForSeason(key, year);
    if (!row) return null;
    return attribute(row);
  }

  getAttributes() {
    if (this.#data.length === 0) {
      return [];
    }

    return Object.keys(this.#data[0]);
  }
}
