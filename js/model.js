// The water-age model. Everything is computed in the browser; nothing is sent anywhere.
// Time underground is modelled as a gamma (Erlang) distribution: shape 3, mean 20 years.
// It is an illustrative model, not a measurement of any particular spring.

export const N_GLASS = 1200;   // the glass is split into this many drops
export const N_RAIN = 600;     // today's rain is split into this many drops
export const MEAN = 20;        // mean years underground (model)
export const SHAPE = 3;
export const GLASS_ML = 200;

export function rng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const MAX_AGE = 79;

// stratified draw: the i-th of n drops takes a jittered slice of the distribution,
// so the glass follows the model closely but still changes a little from day to day
export function quantile(p) {
  let lo = 0, hi = 400;
  for (let i = 0; i < 50; i++) {
    const m = (lo + hi) / 2;
    if (cdf(m) < p) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}

function stratifiedAges(n, r) {
  const ages = [];
  for (let i = 0; i < n; i++) ages.push(Math.min(MAX_AGE - r() * 0.9, quantile((i + r()) / n)));
  // shuffle so that positions in the glass are unrelated to age
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [ages[i], ages[j]] = [ages[j], ages[i]];
  }
  return ages;
}

// share of the water that has spent less than t years underground
export function cdf(t) {
  if (t <= 0) return 0;
  const x = t * SHAPE / MEAN;
  return 1 - Math.exp(-x) * (1 + x + x * x / 2);
}

export function yearFraction(d) {
  const y = d.getFullYear();
  const a = new Date(y, 0, 1).getTime(), b = new Date(y + 1, 0, 1).getTime();
  return y + (d.getTime() - a) / (b - a);
}

function daySeed(d, salt) {
  return (d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()) * 7919 + salt;
}

function drop(now, age, r) {
  const t = now - age;
  const year = Math.floor(t);
  const month = Math.min(12, Math.floor((t - year) * 12) + 1);
  return { age, t, year, month, snow: month === 12 || month <= 3, jx: r(), jy: r(), ph: r() * Math.PI * 2, slot: 0 };
}

// "today's glass": the same all day, different tomorrow
export function makeGlass(date) {
  const now = yearFraction(date);
  const r = rng(daySeed(date, 1));
  const drops = stratifiedAges(N_GLASS, r).map(a => drop(now, a, r));
  const count = new Map();
  for (const d of drops) count.set(d.year, (count.get(d.year) || 0) + 1);
  // slots inside each year column, filled youngest first (the order they leave the glass)
  const byYear = new Map();
  for (const d of [...drops].sort((a, b) => a.age - b.age)) {
    const k = byYear.get(d.year) || 0;
    d.slot = k;
    byYear.set(d.year, k + 1);
  }
  let modeYear = 0, modeCount = -1;
  for (const [y, c] of count) if (c > modeCount || (c === modeCount && y > modeYear)) { modeYear = y; modeCount = c; }
  let oldest = drops[0];
  for (const d of drops) if (d.age > oldest.age) oldest = d;
  return { now, date, drops, count, modeYear, modeCount, oldest };
}

// today's rain, followed into the future
export function makeRain(date) {
  const now = yearFraction(date);
  const r = rng(daySeed(date, 2));
  const drops = stratifiedAges(N_RAIN, r).map(a => {
    const t = now + a;
    return { age: a, t, year: Math.floor(t), jx: r(), jy: r(), ph: r() * Math.PI * 2, slot: 0 };
  });
  const count = new Map();
  for (const d of [...drops].sort((a, b) => a.age - b.age)) {
    const k = count.get(d.year) || 0;
    d.slot = k;
    count.set(d.year, k + 1);
  }
  let modeYear = 0, modeCount = -1;
  for (const [y, c] of count) if (c > modeCount || (c === modeCount && y < modeYear)) { modeYear = y; modeCount = c; }
  const ages = drops.map(d => d.age).sort((a, b) => a - b);
  const median = now + ages[Math.floor(ages.length / 2)];
  const last = now + ages[ages.length - 1];
  return { now, date, drops, count, modeYear, modeCount, medianYear: Math.floor(median), lastYear: Math.floor(last) };
}

// what the glass holds of one calendar year, and how much of that year's water has come out so far
export function yearInfo(glass, Y) {
  const c = glass.count.get(Y) || 0;
  const share = c / N_GLASS;
  const mid = glass.now - (Y + 0.5);
  const emerged = mid <= 0 ? 0 : cdf(mid);
  return { year: Y, count: c, share, ml: share * GLASS_ML, emerged };
}
