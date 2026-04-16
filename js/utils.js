export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getRandomThree(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; // Swap
  }
  return shuffled.slice(0, 3);
}
