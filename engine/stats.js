// Shared statistics: log-gamma, exact binomial PMF in log-space,
// normal pdf/cdf, sample moments, ECDF / Kolmogorov distance.

// Lanczos approximation (g = 7, n = 9), ~15 significant digits.
const LANCZOS = [
  676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012,
  9.9843695780195716e-6, 1.5056327351493116e-7,
];

export function logGamma(z) {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < 8; i++) x += LANCZOS[i] / (z + i + 1);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

export function logChoose(n, k) {
  return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
}

// Exact binomial pmf over k = 0..N as a Float64Array.
// Anchored at the mode via logGamma, then extended outward with the exact
// ratio recurrence pmf(k+1)/pmf(k) = (N-k)/(k+1) * p/(1-p): this avoids both
// overflow (log-space anchor) and loss of relative accuracy in the tails.
export function binomialPmf(N, p) {
  const pmf = new Float64Array(N + 1);
  if (p <= 0) { pmf[0] = 1; return pmf; }
  if (p >= 1) { pmf[N] = 1; return pmf; }
  const mode = Math.min(N, Math.max(0, Math.floor((N + 1) * p)));
  pmf[mode] = Math.exp(logChoose(N, mode) + mode * Math.log(p) + (N - mode) * Math.log(1 - p));
  const r = p / (1 - p);
  for (let k = mode; k < N; k++) pmf[k + 1] = pmf[k] * ((N - k) / (k + 1)) * r;
  for (let k = mode; k > 0; k--) pmf[k - 1] = pmf[k] * (k / (N - k + 1)) / r;
  // Normalize: the recurrence fixes the shape to ~1 ulp per step, but the
  // anchor exp(logGamma(...)) carries the ulp of logGamma(N+1) ~ 3e-11 at
  // N = 1e4, so the raw sum can miss 1 by ~1e-11. Dividing by the computed
  // sum restores sum = 1 to full precision without touching the shape.
  let s = 0;
  for (let k = 0; k <= N; k++) s += pmf[k];
  for (let k = 0; k <= N; k++) pmf[k] /= s;
  return pmf;
}

export function normalPdf(x, mu = 0, sigma = 1) {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

// erfc via the Numerical Recipes rational Chebyshev fit, |error| < 1.2e-7
// everywhere — far below sampling noise for our Kolmogorov readout.
function erfc(x) {
  const z = Math.abs(x);
  const t = 1 / (1 + z / 2);
  const ans = t * Math.exp(
    -z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
    t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 +
    t * (-0.82215223 + t * 0.17087277))))))))
  );
  return x >= 0 ? ans : 2 - ans;
}

export function normalCdf(x, mu = 0, sigma = 1) {
  return 0.5 * erfc(-(x - mu) / (sigma * Math.SQRT2));
}

export function mean(xs) {
  let s = 0;
  for (let i = 0; i < xs.length; i++) s += xs[i];
  return s / xs.length;
}

// Unbiased sample variance (n - 1), two-pass for numerical stability.
export function variance(xs, m = mean(xs)) {
  if (xs.length < 2) return 0;
  let s = 0;
  for (let i = 0; i < xs.length; i++) { const d = xs[i] - m; s += d * d; }
  return s / (xs.length - 1);
}

// Sample skewness g1 = m3 / m2^(3/2); 0 if degenerate.
export function skewness(xs) {
  const m = mean(xs);
  let m2 = 0, m3 = 0;
  for (let i = 0; i < xs.length; i++) {
    const d = xs[i] - m;
    m2 += d * d; m3 += d * d * d;
  }
  m2 /= xs.length; m3 /= xs.length;
  if (m2 <= 0) return 0;
  return m3 / Math.pow(m2, 1.5);
}

// Shannon entropy of a discrete distribution, default base 2 (bits), as in
// the course numerical exercise (scipy.stats.entropy with base=2).
// Zero-probability entries contribute 0. Not normalized: pass probabilities.
export function shannonEntropy(ps, base = 2) {
  let h = 0;
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i];
    if (p > 0) h -= p * Math.log(p);
  }
  return h / Math.log(base);
}

// Kolmogorov distance between the ECDF of xs and the standard normal CDF.
// xs is standardized by the caller. O(n log n).
export function kolmogorovDistance(xs) {
  const z = Float64Array.from(xs).sort();
  const n = z.length;
  let d = 0;
  for (let i = 0; i < n; i++) {
    const F = normalCdf(z[i]);
    d = Math.max(d, Math.abs((i + 1) / n - F), Math.abs(i / n - F));
  }
  return d;
}
