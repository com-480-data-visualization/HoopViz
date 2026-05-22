export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getRandomThree(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 3);
}

/**
 * Returns a new array with the first element moved to the end.
 * @param {Array} list
 */
const rotate1 = (list) => {
  if (list.length <= 1) return [...list];
  const [first, ...rest] = list;
  return [...rest, first];
}

export function listWithout(fullList, toExclude) {
  return fullList.filter(item => !toExclude.includes(item))
}

/**
 * @param {Array} pool - Elements to draw from if more are needed.
 * @param {Array} without - Elements that must not be in the result.
 * @param {number} desiredLength - The target length of the result list.
 *
 * @returns {Array} the items picked randomly
 */
export function pickItemsWithout(pool, without, desiredLength) {
  const excludedSet = new Set(without);

  const candidates = pool.filter(item => !excludedSet.has(item));

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  return candidates.slice(0, desiredLength);
}

export function makeList(mustInclude, tail) {
  return rotate1(mustInclude.concat(tail));
}
