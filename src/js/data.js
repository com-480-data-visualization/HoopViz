export function filter_error_values(data) {
  const filteredEntries = [...data.entries()].filter(([_, values]) =>
    !values.includes(null) && !values.includes(undefined) && !values.includes(NaN)
  );
  return new Map(filteredEntries);
}

export const min_max_norm_shaper = [
  (values) => [Math.min(...values), Math.max(...values)],
  (minMax, value) => (value - minMax[0]) / (minMax[1] - minMax[0]) || 0
];

/**
 * Processes a Map of data by aggregating column values, mapping them, and
 * optionally filtering the results based on a separate "evaluation" value.
 * * @param {Map<any, any[]>} data - A Map where each value is an array of data points.
 * @param {Array<[Function, Function]|null>} shapers - An array of shapers matching
 * the length of the data arrays. Each shaper is:
 * - [0] aggregationFunction: (values: any[]) => T (Applied once per column)
 * - [1] mapFunction: (aggregate: T, value: any) => V | [filterValue: any, resultValue: any]
 * @param {Function|null} filter - A function (mappedValues: any[]) => boolean.
 * If a mapFunction returns an array of two values, the first value is passed to
 * this filter, while the second is kept in the final result.
 * * @returns {Map<any, any[]>} A new Map containing the transformed and filtered data.
 * * @example
 * // Rank by column 0, filter top 3, but keep original values in the result:
 * applyData(
 *   data,
 *   [
 *     [
 *       (col) => [...col].sort((a, b) => b - a),     // aggregate: sorted list
 *       (sorted, val) => [sorted.indexOf(val), val]  // map: [rank, originalValue]
 *     ],
 *     null // leave other columns as-is
 *   ],
 *   (row) => row[0] < 3 // filter: refers to the rank (index 0 of the map return)
 * );
 */
export function applyData(data, shapers, filter) {
  if (!data || data.size === 0) return new Map();

  const firstValues = data.values().next().value;
  const numColumns = firstValues.length;

  // calculate the aggregate for each column
  const aggregates = new Array(numColumns);
  for (let i = 0; i < numColumns; i++) {
    if (shapers[i]) {
      const aggregationFunction = shapers[i][0];
      const columnValues = [];
      for (const values of data.values()) {
        columnValues.push(values[i]);
      }
      aggregates[i] = aggregationFunction(columnValues);
    }
  }

  const result = new Map();

  // map the values and apply the filter
  for (const [key, values] of data.entries()) {
    const filterValues = new Array(numColumns); // used by the filter function
    const finalValues = new Array(numColumns);  // stored in the final Map result

    for (let i = 0; i < numColumns; i++) {
      if (shapers[i]) {
        const mapFunction = shapers[i][1];
        const mappedResult = mapFunction(aggregates[i], values[i]);

        // check if the result is a 2-element array: [filterValue, finalValue]
        if (Array.isArray(mappedResult) && mappedResult.length === 2) {
          filterValues[i] = mappedResult[0];
          finalValues[i] = mappedResult[1];
        } else {
          // fallback: use the single returned value for both
          filterValues[i] = mappedResult;
          finalValues[i] = mappedResult;
        }
      } else {
        // if shaper is null, use the original value for both
        filterValues[i] = values[i];
        finalValues[i] = values[i];
      }
    }

    // keep it in the final result if filter is null or evaluates to true
    // filterValues are passed to the filter function
    if (!filter || filter(filterValues)) {
      result.set(key, finalValues);
    }
  }

  return result;
}
