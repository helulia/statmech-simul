// Spin-chain specifics only. Conventions from the course (lecture1.pdf §4):
// s_i = ±1/2, M = Σ s_i, h = 0 ⇒ p = 1/2 by default.
// General p (for the optional biased toggle): <M> = N(p - 1/2), Var(M) = Np(1-p).

import { momentsM } from '../../engine/sample.js';
import { binomialPmf, logChoose } from '../../engine/stats.js';

export const SPIN = 0.5;

export function moments(N, p) {
  return momentsM(N, p, SPIN); // {mean, variance, sigma}
}

// Exact Pr(M) on the lattice M = k - N/2, k = N_up = 0..N (spacing 1).
export function exactPrM(N, p) {
  const pmf = binomialPmf(N, p);
  const M = new Float64Array(N + 1);
  for (let k = 0; k <= N; k++) M[k] = SPIN * (2 * k - N);
  return { M, pr: pmf, spacing: 2 * SPIN };
}

// Theoretical skewness of M (binomial): (1-2p)/sqrt(Np(1-p)).
export function skewTheory(N, p) {
  const v = N * p * (1 - p);
  return v > 0 ? (1 - 2 * p) / Math.sqrt(v) : 0;
}

// ---------------------------------------------------------------------------
// Canonical ensemble: spins in a field, course convention (user-confirmed):
// s_i = ±1/2, E = -h·M = -h Σ s_i, k_B = 1, so the only knob is βh.
// Single-spin Boltzmann weights e^{±βh/2} give (Chandler §3.3, Ex 3.18–3.19):
//   p↑   = 1 / (1 + e^{-βh})
//   <M>  = (N/2) tanh(βh/2)
//   <δM²> = N p(1-p) = (N/4) sech²(βh/2) = ∂<M>/∂(βh)   (fluct. = susceptibility)
// ---------------------------------------------------------------------------
export function pUpCanonical(bh) {
  return 1 / (1 + Math.exp(-bh));
}

export function canonicalMoments(N, bh) {
  const mean = (N / 2) * Math.tanh(bh / 2);
  const c = Math.cosh(bh / 2);
  const variance = N / (4 * c * c);
  return { mean, variance, sigma: Math.sqrt(variance) };
}

// ---------------------------------------------------------------------------
// Microcanonical ensemble (Lecture notes 3; Chandler §3.4, Ex 3.5):
// ground state all-up (h > 0); flipping a spin down costs h, so with
// nDown = N↓ the energy above the ground state is E - E₀ = h·N↓, and
// E = -h·M = h(N↓ - N/2). Degeneracy W = C(N, N↓), S = k_B ln W, and
//   βh = ∂lnW/∂(E/h) → ln(N↑/N↓)   (the boxed <β> = (1/ε)ln(N/N_e - 1)).
// βh < 0 (negative temperature) once N↓ > N/2 — W decreases with E.
// ---------------------------------------------------------------------------
export function lnW(N, nDown) {
  return logChoose(N, nDown);
}

export function microBetaH(N, nDown) {
  if (nDown <= 0) return Infinity;
  if (nDown >= N) return -Infinity;
  return Math.log((N - nDown) / nDown);
}

// Stirling (per-spin) limits with x = N↓/N: S/N = -[x ln x + (1-x)ln(1-x)],
// E/(Nh) = x - 1/2 (Lecture notes 3, boxed mixing entropy).
export function entropyPerSpin(x) {
  if (x <= 0 || x >= 1) return 0;
  return -(x * Math.log(x) + (1 - x) * Math.log(1 - x));
}
