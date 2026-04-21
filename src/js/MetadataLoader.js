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

  getAttributes() {
    if (this.#data.length === 0) {
      return [];
    }

    return Object.keys(this.#data[0]);
  }
}
