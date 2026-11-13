// Time evolution of an ensemble of spin chains, exactly as in the course
// numerical exercise (numerical_ex_1_ans.ipynb, Section 2):
// each time step, EVERY chain picks one random site and flips it with
// probability 1/2. This Markov chain is symmetric, so its stationary
// distribution is uniform over all 2^l microstates — the "steady state"
// in which Pr(M) is the exact binomial.

import { latticeHistogram } from '../../engine/histogram.js';
import { shannonEntropy, binomialPmf } from '../../engine/stats.js';

export const SPIN = 0.5;

// init: 'up' | 'down' | 'random'
export function createEnsemble(nChains, length, init, rng) {
  const spins = new Uint8Array(nChains * length); // 1 = up, 0 = down
  if (init === 'up') spins.fill(1);
  else if (init === 'random') {
    for (let i = 0; i < spins.length; i++) spins[i] = rng() < 0.5 ? 1 : 0;
  } // 'down' = zeros already
  const mags = new Float64Array(nChains);
  for (let c = 0; c < nChains; c++) {
    let nUp = 0;
    for (let j = 0; j < length; j++) nUp += spins[c * length + j];
    mags[c] = SPIN * (2 * nUp - length);
  }
  return { spins, mags, nChains, length, t: 0 };
}

// One time step for the whole ensemble; mutates ens. ΔM = ±2·spin = ±1.
export function stepEnsemble(ens, rng) {
  const { spins, mags, nChains, length } = ens;
  for (let c = 0; c < nChains; c++) {
    const j = Math.floor(rng() * length);
    if (rng() < 0.5) {
      const idx = c * length + j;
      const wasUp = spins[idx] === 1;
      spins[idx] = wasUp ? 0 : 1;
      mags[c] += wasUp ? -2 * SPIN : 2 * SPIN;
    }
  }
  ens.t += 1;
}

// Magnetization pdf of the ensemble on the M lattice (course Task 2.6).
export function ensemblePdf(ens) {
  return latticeHistogram(ens.mags, ens.length, SPIN);
}

// Shannon entropy (bits) of the ensemble's M distribution (course Task 2.7).
export function ensembleEntropy(ens) {
  return shannonEntropy(ensemblePdf(ens).probs, 2);
}

// Steady-state entropy: all 2^l microstates equally likely ⇒ Pr(M) is the
// exact binomial at p = 1/2 (course Task 1.3 / "entropy on ground state").
export function steadyStateEntropy(length) {
  return shannonEntropy(binomialPmf(length, 0.5), 2);
}

export function meanMagnetization(ens) {
  let s = 0;
  for (let c = 0; c < ens.nChains; c++) s += ens.mags[c];
  return s / ens.nChains;
}
