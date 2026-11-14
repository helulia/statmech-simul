// Spins / CLT page wiring: controls -> engine -> plots.
// Conventions: l = length of one chain (spins), N = number of chains sampled.
// All data derive deterministically from (seed, l, p, N); "Resample"
// draws a fresh random seed (shown in the seed box, so any view is reproducible).

import { mulberry32, parseSeed, randomSeed } from '../../engine/rng.js';
import { sampleChain, chainMagnetization, sampleMs } from '../../engine/sample.js';
import { mean, variance, skewness, kolmogorovDistance, normalPdf } from '../../engine/stats.js';
import { latticeHistogram } from '../../engine/histogram.js';
import { createPlot, niceTicks } from '../../engine/plot.js';
import { initTheme } from '../../assets/js/theme.js';
import { moments, exactPrM, skewTheory, SPIN } from './model.js';
import { createChainView } from './chainview.js';
import { typeset, loadMarkdown } from '../../assets/js/md.js';

const $ = (id) => document.getElementById(id);

// ---------- state ----------
const state = {
  l: 100,      // chain length
  nSamp: 10000, // chains sampled (N)
  seed: 20261111,
  biased: false,
  p: 0.5,
  showBinom: true,
  showGauss: true,
};
const pEff = () => (state.biased ? state.p : 0.5);

// ---------- formatting ----------
const fmtInt = (n) => n.toLocaleString('en-US');
function fmt(x, sig = 4) {
  if (!isFinite(x)) return '–';
  if (x === 0) return '0';
  const s = x.toPrecision(sig);
  return Math.abs(x) >= 1e5 || Math.abs(x) < 1e-4 ? Number(s).toExponential(2) : String(Number(s));
}

// ---------- controls ----------
const ctlL = $('ctl-l'), ctlNs = $('ctl-ns'), ctlSeed = $('ctl-seed'), ctlP = $('ctl-p');
const lFromSlider = (v) => Math.max(1, Math.min(10000, Math.round(10 ** (v / 25))));
const nSampFromSlider = (v) => Math.max(100, Math.min(100000, Math.round(10 ** (2 + v / 20))));
const sliderFromL = (l) => Math.round(25 * Math.log10(l));

function readControls() {
  state.l = lFromSlider(+ctlL.value);
  state.nSamp = nSampFromSlider(+ctlNs.value);
  state.seed = parseSeed(ctlSeed.value);
  state.p = +ctlP.value;
  $('out-l').textContent = fmtInt(state.l);
  $('out-ns').textContent = fmtInt(state.nSamp);
  $('out-p').textContent = state.p.toFixed(3);
}

function setL(l) { ctlL.value = sliderFromL(l); }
function setBiased(on, p = 0.5) {
  state.biased = on;
  $('btn-biased').setAttribute('aria-pressed', String(on));
  $('ctl-p-wrap').hidden = !on;
  $('biased-note').hidden = !on;
  if (p !== undefined) ctlP.value = p;
}

// ---------- hero: spin strip ----------
const chainView = createChainView($('spin-strip'), $('spin-raster'));
const renderChain = (chain) => chainView.render(chain);

// ---------- plots ----------
const plotA = createPlot($('plotA'), { height: 300 });
const plotB = createPlot($('plotB'), { height: 280 });
const plotC = createPlot($('plotC'), { height: 280 });
const plotAnim = createPlot($('plotAnim'), { height: 260 });

plotA.setLabels('$M$', '$\\Pr(M)$');
plotB.setLabels('$M/\\ell$', '$\\Pr(M/\\ell)$ (density)');
plotC.setLabels('$Z = (M-\\langle M\\rangle)/\\sigma_M$', 'density');
plotAnim.setLabels('$M$', '$\\Pr(M)$');

function gaussCurve(x0, x1, mu, sigma, scale, n = 200) {
  const xs = new Float64Array(n), ys = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    xs[i] = x0 + ((x1 - x0) * i) / (n - 1);
    ys[i] = normalPdf(xs[i], mu, sigma) * scale;
  }
  return { xs, ys };
}

function renderPlotA(hist, mom, l, p) {
  const { centers, probs, spacing } = hist;
  const pad = 0.75 * spacing;
  let x0, x1;
  if (mom.sigma > 0) {
    x0 = Math.min(centers[0], mom.mean - 4 * mom.sigma) - pad;
    x1 = Math.max(centers[centers.length - 1], mom.mean + 4 * mom.sigma) + pad;
  } else {
    x0 = mom.mean - 2; x1 = mom.mean + 2;
  }
  const exact = exactPrM(l, p);
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
  plotA.setDomain(x0, x1, 0, yMax);
  plotA.axes({});
  plotA.bars('hist', centers, probs, { width: spacing });

  if (state.showBinom) {
    if (exX.length <= 140) {
      plotA.remove('binom-line');
      plotA.dots('binom', exX, exY, { hollow: true });
    } else {
      plotA.remove('binom');
      plotA.line('binom-line', exX, exY, { dash: '5 4', width: 1.25 });
    }
  } else { plotA.remove('binom'); plotA.remove('binom-line'); }

  if (state.showGauss && mom.sigma > 0) {
    const g = gaussCurve(x0, x1, mom.mean, mom.sigma, spacing);
    plotA.line('gauss', g.xs, g.ys, { width: 1.5 });
  } else plotA.remove('gauss');
}

function renderPlotB(p) {
  const Ls = [100, 1000, 10000];
  const mixes = [40, 65, 100]; // grey lightness per l (fg mixed into bg)
  const mu = p - 0.5; // mean of M/l
  const halfW = Math.max(0.25, 4.5 * Math.sqrt(p * (1 - p) / Ls[0]));
  const x0 = mu - halfW, x1 = mu + halfW;
  let yMax = 0;
  const curves = Ls.map((l) => {
    const { M, pr } = exactPrM(l, p);
    const xs = [], ys = [];
    for (let k = 0; k < M.length; k++) {
      const x = M[k] / l;
      if (x >= x0 && x <= x1) { xs.push(x); ys.push(pr[k] * l); } // density: spacing 1/l
    }
    yMax = Math.max(yMax, ...ys);
    return { l, xs, ys };
  });
  plotB.setDomain(x0, x1, 0, yMax * 1.12);
  plotB.axes({ xTicks: niceTicks(x0, x1, 5) });
  curves.forEach(({ l, xs, ys }, i) => {
    const color = `color-mix(in srgb, var(--fg) ${mixes[i]}%, var(--bg))`;
    plotB.line(`curve-${l}`, xs, ys, { color, width: 1.5 });
    const sig = Math.sqrt(p * (1 - p) / l);
    const peak = Math.max(...ys);
    plotB.label(`lab-${l}`, `ℓ = ${fmtInt(l)}`, mu + 1.6 * sig, peak * 0.82, { color });
  });
}

function renderPlotC(samples, mom) {
  const msg = $('plotC-msg');
  if (mom.sigma === 0) {
    plotC.remove('hist'); plotC.remove('gauss');
    plotC.setDomain(-4, 4, 0, 0.5); plotC.axes({});
    msg.hidden = false;
    msg.textContent = 'σ_M = 0 (p = 0 or 1): every sample is identical — there is nothing to standardize, and no Gaussian.';
    return null;
  }
  msg.hidden = true;
  const z = new Float64Array(samples.length);
  for (let i = 0; i < samples.length; i++) z[i] = (samples[i] - mom.mean) / mom.sigma;
  const histM = latticeHistogram(samples, state.l, SPIN);
  const dz = histM.spacing / mom.sigma;
  const zc = Array.from(histM.centers, (c) => (c - mom.mean) / mom.sigma);
  const dens = Array.from(histM.probs, (pr) => pr / dz);
  const yMax = Math.max(...dens, 0.4) * 1.15;
  plotC.setDomain(-4, 4, 0, Math.min(yMax, 3));
  plotC.axes({});
  plotC.bars('hist', zc, dens, { width: dz });
  const g = gaussCurve(-4, 4, 0, 1, 1);
  plotC.line('gauss', g.xs, g.ys, { width: 1.5 });
  return z;
}

// ---------- animation ----------
const ANIM_MAX = 200, ANIM_SAMPLES = 2000;
let animFrames = new Map();
let animKey = '';
let playing = false, playTimer = null;

function animFrame(n) {
  const key = `${state.seed}|${pEff()}`;
  if (key !== animKey) { animFrames = new Map(); animKey = key; }
  if (!animFrames.has(n)) {
    const rng = mulberry32((state.seed ^ Math.imul(n, 2654435761)) >>> 0);
    const ms = sampleMs(rng, n, pEff(), ANIM_SAMPLES, SPIN);
    animFrames.set(n, latticeHistogram(ms, n, SPIN));
  }
  return animFrames.get(n);
}

function renderAnim(n) {
  const p = pEff();
  const m1 = moments(1, p), m200 = moments(ANIM_MAX, p);
  const x0 = Math.min(m1.mean, m200.mean) - Math.max(3.5 * m200.sigma, 1);
  const x1 = Math.max(m1.mean, m200.mean) + Math.max(3.5 * m200.sigma, 1);
  const hist = animFrame(n);
  const mom = moments(n, p);
  const gaussPeak = mom.sigma > 0 ? normalPdf(0, 0, mom.sigma) * hist.spacing : 0;
  const yMax = Math.max(Math.max(...hist.probs), gaussPeak) * 1.15;
  plotAnim.setDomain(x0, x1, 0, yMax);
  plotAnim.axes({});
  plotAnim.bars('hist', hist.centers, hist.probs, { width: hist.spacing });
  if (mom.sigma > 0) {
    const g = gaussCurve(x0, x1, mom.mean, mom.sigma, hist.spacing);
    plotAnim.line('gauss', g.xs, g.ys, { width: 1.5 });
  } else plotAnim.remove('gauss');
  $('anim-n').textContent = `ℓ = ${n}`;
  $('anim-scrub').value = n;
}

function stopPlay() {
  playing = false;
  clearTimeout(playTimer);
  $('anim-play').textContent = '▶ play';
}
function stepPlay() {
  if (!playing) return;
  let n = +$('anim-scrub').value;
  n = n >= ANIM_MAX ? 1 : n + 1;
  renderAnim(n);
  playTimer = setTimeout(stepPlay, 55);
}
$('anim-play').addEventListener('click', () => {
  if (playing) { stopPlay(); return; }
  playing = true;
  $('anim-play').textContent = '⏸ pause';
  stepPlay();
});
$('anim-scrub').addEventListener('input', (e) => { stopPlay(); renderAnim(+e.target.value); });

// ---------- readouts ----------
function renderReadouts(samples, z, mom, l, p) {
  $('rd-mean').textContent = fmt(mean(samples));
  $('rd-mean-t').textContent = fmt(mom.mean);
  $('rd-var').textContent = fmt(variance(samples));
  $('rd-var-t').textContent = `${fmt(mom.variance)}  (ℓp(1−p))`;
  $('rd-skew').textContent = fmt(skewness(samples));
  $('rd-skew-t').textContent = fmt(skewTheory(l, p));
  $('rd-ks').textContent = z ? fmt(kolmogorovDistance(z)) : '–';
  $('rd-relw').textContent = fmt(mom.sigma / l);
  $('rd-relw-t').textContent = p === 0.5 ? `1/(2√ℓ) = ${fmt(0.5 / Math.sqrt(l))}` : fmt(mom.sigma / l);
}

// ---------- main update ----------
let rafPending = false;
function update({ plotBToo = true } = {}) {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    readControls();
    const l = state.l, p = pEff();
    const mom = moments(l, p);
    const rng = mulberry32(state.seed);

    const chain = sampleChain(rng, l, p);
    const { nUp, nDown, M } = chainMagnetization(chain, SPIN);
    renderChain(chain);
    $('ro-nup').textContent = fmtInt(nUp);
    $('ro-ndown').textContent = fmtInt(nDown);
    $('ro-m').textContent = (l % 2 ? M.toFixed(1) : String(M));

    const samples = sampleMs(rng, l, p, state.nSamp, SPIN);
    const hist = latticeHistogram(samples, l, SPIN);
    renderPlotA(hist, mom, l, p);
    const z = renderPlotC(samples, mom);
    renderReadouts(samples, z, mom, l, p);
    if (plotBToo) renderPlotB(p);
    renderAnim(+$('anim-scrub').value);
  });
}

// ---------- events ----------
ctlL.addEventListener('input', () => update({ plotBToo: false }));
ctlNs.addEventListener('input', () => update({ plotBToo: false }));
ctlP.addEventListener('input', () => update());
ctlSeed.addEventListener('change', () => update());
$('btn-reseed').addEventListener('click', () => { ctlSeed.value = String(randomSeed()); update(); });
$('btn-resample').addEventListener('click', () => { ctlSeed.value = String(randomSeed()); update(); });
$('btn-biased').addEventListener('click', () => { setBiased(!state.biased); update(); });

for (const [btn, key] of [['tog-binom', 'showBinom'], ['tog-gauss', 'showGauss']]) {
  $(btn).addEventListener('click', (e) => {
    state[key] = !state[key];
    e.currentTarget.setAttribute('aria-pressed', String(state[key]));
    update({ plotBToo: false });
  });
}

$('preset-a').addEventListener('click', () => { setBiased(false); setL(1); update(); });
$('preset-b').addEventListener('click', () => {
  setBiased(false);
  setL(lFromSlider(+ctlL.value) === 10 ? 1000 : 10);
  update();
});
$('preset-c').addEventListener('click', () => { setBiased(true, 0.002); setL(1000); update(); });

// ---------- explanation (clt.md) ----------
loadMarkdown($('explain'), './clt.md');

// ---------- boot ----------
initTheme($('theme-toggle'));
setBiased(false);
update();
typeset(document.body);
