// Ensembles page: canonical (fixed βh) and microcanonical (fixed E) views of
// the spin chain with E = -h·M, s_i = ±1/2, k_B = 1 (user-confirmed convention).
// Sources: Chandler §3.3–3.4, Ex. 3.5 / 3.18–3.19; Lecture notes 3.

import { mulberry32, parseSeed, randomSeed } from '../../engine/rng.js';
import { sampleChain, chainMagnetization, sampleMs } from '../../engine/sample.js';
import { mean, variance, normalPdf } from '../../engine/stats.js';
import { latticeHistogram } from '../../engine/histogram.js';
import { createPlot, niceTicks } from '../../engine/plot.js';
import { initTheme } from '../../assets/js/theme.js';
import { typeset, loadMarkdown } from '../../assets/js/md.js';
import { createChainView } from './chainview.js';
import {
  SPIN, exactPrM, pUpCanonical, canonicalMoments, lnW, microBetaH, entropyPerSpin,
} from './model.js';

const $ = (id) => document.getElementById(id);
const fmtInt = (n) => n.toLocaleString('en-US');
function fmt(x, sig = 4) {
  if (!isFinite(x)) return x > 0 ? '∞' : '−∞';
  if (x === 0) return '0';
  const s = x.toPrecision(sig);
  return Math.abs(x) >= 1e5 || Math.abs(x) < 1e-4 ? Number(s).toExponential(2) : String(Number(s));
}

// ---------------- canonical section ----------------
const chainView = createChainView($('spin-strip'), $('spin-raster'));
const plotDist = createPlot($('plotDist'), { height: 280 });
const plotCurves = createPlot($('plotCurves'), { height: 280 });
plotDist.setLabels('$M$', '$\\Pr(M)$');
plotCurves.setLabels('$\\beta h$', 'normalized');

const nFromSlider = (v) => Math.max(1, Math.min(10000, Math.round(10 ** (v / 25))));
const sFromSlider = (v) => Math.max(100, Math.min(100000, Math.round(10 ** (2 + v / 20))));

function gaussCurve(x0, x1, mu, sigma, scale, n = 200) {
  const xs = new Float64Array(n), ys = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    xs[i] = x0 + ((x1 - x0) * i) / (n - 1);
    ys[i] = normalPdf(xs[i], mu, sigma) * scale;
  }
  return { xs, ys };
}

function renderDist(hist, mom, N, p) {
  const { centers, probs, spacing } = hist;
  const pad = 0.75 * spacing;
  let x0, x1;
  if (mom.sigma > 0) {
    x0 = Math.min(centers[0], mom.mean - 4 * mom.sigma) - pad;
    x1 = Math.max(centers[centers.length - 1], mom.mean + 4 * mom.sigma) + pad;
  } else { x0 = mom.mean - 2; x1 = mom.mean + 2; }
  const exact = exactPrM(N, p);
  const exX = [], exY = [];
  let binMax = 0;
  for (let k = 0; k < exact.M.length; k++) {
    if (exact.M[k] >= x0 && exact.M[k] <= x1) {
      exX.push(exact.M[k]); exY.push(exact.pr[k]);
      if (exact.pr[k] > binMax) binMax = exact.pr[k];
    }
  }
  const gaussMax = mom.sigma > 0 ? normalPdf(mom.mean, mom.mean, mom.sigma) * spacing : 0;
  const yMax = Math.max(...probs, binMax, gaussMax) * 1.15 || 1;
  plotDist.setDomain(x0, x1, 0, yMax);
  plotDist.axes({});
  plotDist.bars('hist', centers, probs, { width: spacing });
  if (exX.length <= 140) {
    plotDist.remove('binom-line');
    plotDist.dots('binom', exX, exY, { hollow: true });
  } else {
    plotDist.remove('binom');
    plotDist.line('binom-line', exX, exY, { dash: '5 4', width: 1.25 });
  }
  if (mom.sigma > 0) {
    const g = gaussCurve(x0, x1, mom.mean, mom.sigma, spacing);
    plotDist.line('gauss', g.xs, g.ys, { width: 1.5 });
  } else plotDist.remove('gauss');
}

function renderCurves(bh, N, sampleMean, sampleVar) {
  const n = 241;
  const xs = new Float64Array(n), yM = new Float64Array(n), yV = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const x = -6 + (12 * i) / (n - 1);
    xs[i] = x;
    yM[i] = Math.tanh(x / 2);                       // <M>/(N/2)
    const c = Math.cosh(x / 2);
    yV[i] = 1 / (c * c);                            // <δM²>/(N/4)
  }
  plotCurves.setDomain(-6, 6, -1.1, 1.25);
  plotCurves.axes({ yTicks: [-1, -0.5, 0, 0.5, 1] });
  plotCurves.line('tanh', xs, yM, { width: 1.5 });
  plotCurves.line('sech', xs, yV, { width: 1.25, dash: '5 4', color: 'color-mix(in srgb, var(--fg) 55%, var(--bg))' });
  plotCurves.label('lab-m', '⟨M⟩/(N/2)', 3.1, Math.tanh(1.55) + 0.14);
  plotCurves.label('lab-v', '⟨δM²⟩/(N/4)', 1.4, 1 / Math.cosh(0.7) ** 2 + 0.14,
    { color: 'color-mix(in srgb, var(--fg) 55%, var(--bg))' });
  // markers: filled = theory at current βh, hollow = this page's samples
  plotCurves.dots('mark-theory', [bh, bh], [Math.tanh(bh / 2), 1 / Math.cosh(bh / 2) ** 2], { hollow: false, r: 2.6 });
  plotCurves.dots('mark-sample', [bh, bh], [sampleMean / (N / 2), sampleVar / (N / 4)], { hollow: true, r: 4 });
}

let rafPending = false;
function updateCanonical() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    const bh = +$('ctl-bh').value;
    const N = nFromSlider(+$('ctl-n').value);
    const S = sFromSlider(+$('ctl-s').value);
    const seed = parseSeed($('ctl-seed').value);
    $('out-bh').textContent = bh.toFixed(2);
    $('out-n').textContent = fmtInt(N);
    $('out-s').textContent = fmtInt(S);

    const p = pUpCanonical(bh);
    const mom = canonicalMoments(N, bh);
    const rng = mulberry32(seed);
    const chain = sampleChain(rng, N, p);
    const { nUp, nDown, M } = chainMagnetization(chain, SPIN);
    chainView.render(chain);
    $('ro-nup').textContent = fmtInt(nUp);
    $('ro-ndown').textContent = fmtInt(nDown);
    $('ro-m').textContent = N % 2 ? M.toFixed(1) : String(M);
    $('ro-pup').textContent = p.toFixed(4);

    const samples = sampleMs(rng, N, p, S, SPIN);
    const hist = latticeHistogram(samples, N, SPIN);
    const m = mean(samples), v = variance(samples);
    renderDist(hist, mom, N, p);
    renderCurves(bh, N, m, v);

    $('rd-mean').textContent = fmt(m);
    $('rd-mean-t').textContent = `${fmt(mom.mean)}  ((N/2)·tanh(βh/2))`;
    $('rd-var').textContent = fmt(v);
    $('rd-var-t').textContent = `${fmt(mom.variance)}  ((N/4)·sech²(βh/2))`;
    $('rd-chi-t').textContent = fmt(mom.variance);
    $('rd-rel').textContent = mom.mean !== 0 ? fmt(Math.sqrt(v) / Math.abs(m)) : '— (⟨M⟩ = 0)';
    $('rd-rel-t').textContent = mom.mean !== 0
      ? `${fmt(mom.sigma / Math.abs(mom.mean))}  (∝ 1/√N)`
      : 'undefined at βh = 0 — use σ_M/N (CLT page)';
  });
}

for (const id of ['ctl-bh', 'ctl-n', 'ctl-s']) $(id).addEventListener('input', updateCanonical);
$('ctl-seed').addEventListener('change', updateCanonical);
$('btn-resample').addEventListener('click', () => { $('ctl-seed').value = String(randomSeed()); updateCanonical(); });

// ---------------- microcanonical section ----------------
const plotS = createPlot($('plotS'), { height: 280 });
const plotBeta = createPlot($('plotBeta'), { height: 280 });
plotS.setLabels('$E/(Nh)$', '$S/(Nk_B)$');
plotBeta.setLabels('$E/(Nh)$', '$\\beta h$');

function updateMicro() {
  const N = nFromSlider(+$('ctl-mn').value);
  let nDown = Math.round((N * +$('ctl-k').value) / 1000);
  nDown = Math.max(0, Math.min(N, nDown));
  $('out-mn').textContent = fmtInt(N);
  $('out-k').textContent = fmtInt(nDown);

  // Stirling curves vs E/(Nh) = x - 1/2
  const n = 401;
  const xs = new Float64Array(n), yS = new Float64Array(n), yB = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5) / n; // in (0,1)
    xs[i] = x - 0.5;
    yS[i] = entropyPerSpin(x);
    yB[i] = Math.max(-6, Math.min(6, Math.log((1 - x) / x)));
  }

  plotS.setDomain(-0.5, 0.5, 0, Math.LN2 * 1.18);
  plotS.axes({ xTicks: [-0.5, -0.25, 0, 0.25, 0.5], yTicks: [0, 0.2, 0.4, 0.6] });
  plotS.line('stirling', xs, yS, { width: 1.5 });
  // exact lnC(N,k)/N dots for moderate N
  if (N <= 64) {
    const ex = [], ey = [];
    for (let k = 0; k <= N; k++) { ex.push(k / N - 0.5); ey.push(lnW(N, k) / N); }
    plotS.dots('exact', ex, ey, { hollow: true, r: 2.2 });
  } else plotS.remove('exact');
  plotS.label('lab-tpos', 'T > 0', -0.42, Math.LN2 * 1.1, { color: 'var(--muted)' });
  plotS.label('lab-tneg', 'T < 0', 0.3, Math.LN2 * 1.1, { color: 'var(--muted)' });
  const xE = nDown / N - 0.5;
  plotS.dots('mark', [xE], [N <= 64 ? lnW(N, nDown) / N : entropyPerSpin(nDown / N)], { hollow: false, r: 3.2 });

  plotBeta.setDomain(-0.5, 0.5, -6, 6);
  plotBeta.axes({ xTicks: [-0.5, -0.25, 0, 0.25, 0.5], yTicks: [-6, -3, 0, 3, 6] });
  plotBeta.line('zero', [-0.5, 0.5], [0, 0], { width: 1, color: 'var(--grid)' });
  plotBeta.line('beta', xs, yB, { width: 1.5 });
  const bhNow = microBetaH(N, nDown);
  plotBeta.dots('mark', [xE], [Math.max(-6, Math.min(6, isFinite(bhNow) ? bhNow : Math.sign(bhNow) * 6))], { hollow: false, r: 3.2 });

  // readouts
  const nUp = N - nDown;
  $('md-k').textContent = `N↓ = ${fmtInt(nDown)},  N↑ = ${fmtInt(nUp)}  (E/(Nh) = ${fmt(xE, 3)})`;
  const lw = lnW(N, nDown);
  $('md-w').textContent = lw < 230 ? fmt(Math.exp(lw), 6) : `e^${fmt(lw, 5)}`;
  $('md-s').textContent = fmt(lw / N, 5);
  $('md-beta').textContent = fmt(bhNow, 5);
  $('md-temp').textContent =
    !isFinite(bhNow) ? (bhNow > 0 ? 'T → 0⁺ (ground state, W = 1)' : 'T → 0⁻ (top state, W = 1)')
    : bhNow > 0 ? 'T > 0 (W still rising with E)'
    : bhNow < 0 ? 'T < 0 — negative temperature (W falls with E)'
    : 'βh = 0, T → ∞ (maximum W)';
}

$('ctl-mn').addEventListener('input', updateMicro);
$('ctl-k').addEventListener('input', updateMicro);

// ---------------- boot ----------------
initTheme($('theme-toggle'));
updateCanonical();
updateMicro();
loadMarkdown($('explain'), './ensembles.md');
typeset(document.body);
