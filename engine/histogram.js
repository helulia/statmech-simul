// Lattice-aware histogram for sums of discrete spins.
// With s_i = +-1/2, M lives on {-N/2, -N/2 + 1, ..., N/2}: spacing 1,
// half-integers when N is odd. Generic in the spin magnitude:
// M = spin * (2k - N) for k = N_up in 0..N, spacing 2 * spin.
// Bins are CENTERED on allowed values with width = spacing, so an exact pmf
// and a Gaussian density * spacing are directly comparable to bar heights.

export function lattice(N, spin = 0.5) {
  const spacing = 2 * spin;
  return {
    spacing,
    min: -spin * N,
    max: spin * N,
    value: (k) => spin * (2 * k - N), // k = N_up
    index: (M) => Math.round((M + spin * N) / spacing), // nearest k
  };
}

// Count samples of M on the lattice. Returns only the occupied contiguous
// range (clipped to [0, N]) to keep plots light at large N.
// -> { centers, probs, counts, spacing, kMin }
export function latticeHistogram(samples, N, spin = 0.5) {
  const lat = lattice(N, spin);
  const counts = new Uint32Array(N + 1);
  let kMin = N, kMax = 0;
  for (let i = 0; i < samples.length; i++) {
    let k = lat.index(samples[i]);
    if (k < 0) k = 0; else if (k > N) k = N;
    counts[k]++;
    if (k < kMin) kMin = k;
    if (k > kMax) kMax = k;
  }
  const n = kMax - kMin + 1;
  const centers = new Float64Array(n);
  const probs = new Float64Array(n);
  const slice = new Uint32Array(n);
  for (let j = 0; j < n; j++) {
    const k = kMin + j;
    centers[j] = lat.value(k);
    slice[j] = counts[k];
    probs[j] = counts[k] / samples.length;
  }
  return { centers, probs, counts: slice, spacing: lat.spacing, kMin };
}
