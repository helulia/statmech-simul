// Seeded PRNG: mulberry32. One 32-bit word of state, period ~2^32,
// good enough statistically for teaching simulations and fully reproducible
// from the seed shown in the UI.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Hash an arbitrary string to a 32-bit seed (xmur3 finalizer), so users can
// type words as seeds.
export function seedFromString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

export function parseSeed(text) {
  const t = String(text).trim();
  if (/^\d+$/.test(t)) return Number(t) >>> 0;
  return seedFromString(t);
}

export function randomSeed() {
  return (Math.random() * 4294967296) >>> 0;
}
