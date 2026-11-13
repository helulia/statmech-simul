// i.i.d. sampling of spin chains and their sums.
// Spin magnitude is a parameter (default 1/2) so later pages can use s = ±1.

import { binomialPmf } from './stats.js';

// One explicit chain: Uint8Array, 1 = up, 0 = down. Used for the hero strip.
export function sampleChain(rng, N, p) {
  const s = new Uint8Array(N);
  for (let i = 0; i < N; i++) s[i] = rng() < p ? 1 : 0;
  return s;
}

// M = sum of s_i = spin * (N_up - N_down) = 2 * spin * N_up - spin * N
export function chainMagnetization(chain, spin = 0.5) {
  let nUp = 0;
  for (let i = 0; i < chain.length; i++) nUp += chain[i];
  return { nUp, nDown: chain.length - nUp, M: 2 * spin * nUp - spin * chain.length };
}

// Sampler for M over many samples. Drawing N spins per sample is O(N) and
// too slow at N = 1e4 x 1e5 samples, so we sample N_up from the exact
// binomial CDF by inverse transform (binary search), which is the identical
// distribution at O(log N) per sample. The CDF reuses the exact log-space pmf.
export function makeMSampler(N, p, spin = 0.5) {
  const pmf = binomialPmf(N, p);
  const cdf = new Float64Array(N + 1);
  let acc = 0;
  for (let k = 0; k <= N; k++) { acc += pmf[k]; cdf[k] = acc; }
  cdf[N] = 1; // guard against rounding
  return function (rng) {
    const u = rng();
    let lo = 0, hi = N;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < u) lo = mid + 1; else hi = mid;
    }
    return 2 * spin * lo - spin * N; // M for N_up = lo
  };
}

export function sampleMs(rng, N, p, count, spin = 0.5) {
  const draw = makeMSampler(N, p, spin);
  const out = new Float64Array(count);
  for (let i = 0; i < count; i++) out[i] = draw(rng);
  return out;
}

// Exact moments of M for N spins of magnitude `spin`, up-probability p.
// At spin = 1/2: <M> = N(p - 1/2), Var(M) = N p(1-p)  (lecture1.pdf pp.5-6).
export function momentsM(N, p, spin = 0.5) {
  const meanM = 2 * spin * N * p - spin * N;
  const varM = 4 * spin * spin * N * p * (1 - p);
  return { mean: meanM, variance: varM, sigma: Math.sqrt(varM) };
}
