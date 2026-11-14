// Entropy page: equilibration of an ensemble of spin chains, following
// numerical_ex_1_ans.ipynb Section 2. Dynamics, pdf and entropy live in
// dynamics.js; this file is UI wiring only.

import { mulberry32, parseSeed } from '../../engine/rng.js';
import { binomialPmf } from '../../engine/stats.js';
import { createPlot } from '../../engine/plot.js';
import { initTheme } from '../../assets/js/theme.js';
import { typeset, loadMarkdown } from '../../assets/js/md.js';
import { cssColor } from './chainview.js';
import {
  createEnsemble, stepEnsemble, ensemblePdf, ensembleEntropy,
  steadyStateEntropy, meanMagnetization,
} from './dynamics.js';

const $ = (id) => document.getElementById(id);
const fmtInt = (n) => n.toLocaleString('en-US');
const MAX_STEPS = 4000;

// ---------------- state ----------------
const state = {
  N: 10,  // spins per chain
  L: 100, // chains in the ensemble
  init: 'up',
  speed: 4,
  seed: 20261111,
};
let ens = null, rng = null;
let history = { t: [], S: [], M: [] };
let playing = false;

// ---------------- plots ----------------
const plotPdf = createPlot($('plotPdf'), { height: 280 });
const plotEntropy = createPlot($('plotEntropy'), { height: 190, margin: { b: 26 } });
const plotMag = createPlot($('plotMag'), { height: 150, margin: { b: 26 } });
plotPdf.setLabels('$M$', '$\\Pr(M)$');
plotEntropy.setLabels('', '$S$ [bits]');
plotMag.setLabels('$t$ [steps]', '$\\bar M$');

// ---------------- ensemble raster ----------------
const raster = $('ens-raster');
function renderRaster() {
  const { l, nChains } = { l: ens.length, nChains: ens.nChains };
  const px = Math.min(16, Math.max(5, Math.floor(560 / l)));
  const rows = Math.min(nChains, Math.floor(360 / px));
  raster.width = l * px;
  raster.height = rows * px;
  raster.style.maxWidth = '100%';
  raster.style.imageRendering = 'auto';
  const ctx = raster.getContext('2d');
  const cUp = cssColor('--up'), cDown = cssColor('--down');
  ctx.fillStyle = cssColor('--surface');
  ctx.fillRect(0, 0, raster.width, raster.height);
  for (let c = 0; c < rows; c++) {
    for (let j = 0; j < l; j++) {
      ctx.fillStyle = ens.spins[c * l + j] ? cUp : cDown;
      ctx.fillRect(j * px, c * px, px - 1, px - 1);
    }
  }
  $('ens-note').textContent = rows < nChains
    ? `— each row is one chain (showing ${rows} of ${fmtInt(nChains)})`
    : '— each row is one chain';
}
new MutationObserver(() => { if (ens) renderRaster(); })
  .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// ---------------- rendering ----------------
function renderPdf() {
  const l = ens.length;
  const pdf = ensemblePdf(ens);
  const steady = binomialPmf(l, 0.5);
  const sx = [], sy = [];
  for (let k = 0; k <= l; k++) { sx.push(0.5 * (2 * k - l)); sy.push(steady[k]); }
  const yMax = Math.max(...pdf.probs, ...sy) * 1.15;
  plotPdf.setDomain(-l / 2 - 0.75, l / 2 + 0.75, 0, yMax);
  plotPdf.axes({});
  plotPdf.bars('hist', pdf.centers, pdf.probs, { width: pdf.spacing });
  plotPdf.dots('steady', sx, sy, { hollow: true });
}

function renderSeries() {
  const l = ens.length;
  const Hss = steadyStateEntropy(l);
  const tMax = Math.max(100, history.t.length);
  const yTop = Math.max(Hss * 1.25, Math.max(0, ...history.S) * 1.1, 1);

  plotEntropy.setDomain(0, tMax, 0, yTop);
  plotEntropy.axes({ yTicks: [0, 1, 2, 3].filter((v) => v <= yTop) });
  plotEntropy.line('steady', [0, tMax], [Hss, Hss], { dash: '5 4', width: 1, color: 'var(--muted)' });
  if (history.t.length > 1) plotEntropy.line('S', history.t, history.S, { width: 1.5 });
  plotEntropy.label('lab-ss', 'steady state', tMax * 0.985, Hss + yTop * 0.045, { color: 'var(--muted)', anchor: 'end' });

  plotMag.setDomain(0, tMax, -l / 2, l / 2);
  plotMag.axes({ yTicks: [-l / 2, 0, l / 2] });
  plotMag.line('zero', [0, tMax], [0, 0], { width: 1, color: 'var(--grid)' });
  if (history.t.length > 1) plotMag.line('M', history.t, history.M, { width: 1.5 });
}

function renderReadouts() {
  $('ro-t').textContent = fmtInt(ens.t);
  $('ro-s').textContent = ensembleEntropy(ens).toFixed(4);
  $('ro-sss').textContent = steadyStateEntropy(ens.length).toFixed(4);
  $('ro-mbar').textContent = meanMagnetization(ens).toFixed(3);
}

function renderAll() {
  renderRaster();
  renderPdf();
  renderSeries();
  renderReadouts();
}

// ---------------- simulation control ----------------
function record() {
  history.t.push(ens.t);
  history.S.push(ensembleEntropy(ens));
  history.M.push(meanMagnetization(ens));
}

function reset() {
  stopPlay();
  rng = mulberry32(state.seed);
  ens = createEnsemble(state.L, state.N, state.init, rng);
  history = { t: [], S: [], M: [] };
  record();
  renderAll();
}

function doSteps(n) {
  for (let i = 0; i < n && ens.t < MAX_STEPS; i++) {
    stepEnsemble(ens, rng);
    record();
  }
  renderAll();
  if (ens.t >= MAX_STEPS) stopPlay();
}

function stopPlay() {
  playing = false;
  $('btn-play').textContent = '▶ play';
}
function frame() {
  if (!playing) return;
  doSteps(state.speed);
  if (playing) requestAnimationFrame(frame);
}
$('btn-play').addEventListener('click', () => {
  if (playing) { stopPlay(); return; }
  if (ens.t >= MAX_STEPS) reset();
  playing = true;
  $('btn-play').textContent = '⏸ pause';
  requestAnimationFrame(frame);
});
$('btn-step').addEventListener('click', () => { stopPlay(); doSteps(1); });
$('btn-reset').addEventListener('click', reset);

// ---------------- controls ----------------
const LFromSlider = (v) => Math.max(10, Math.min(2000, Math.round(10 ** (1 + v / 20))));

function readControls() {
  state.N = +$('ctl-n').value;
  state.L = LFromSlider(+$('ctl-L').value);
  state.speed = +$('ctl-speed').value;
  state.seed = parseSeed($('ctl-seed').value);
  $('out-n').textContent = state.N;
  $('out-L').textContent = fmtInt(state.L);
  $('out-speed').textContent = state.speed;
}

$('ctl-n').addEventListener('input', () => { readControls(); reset(); });
$('ctl-L').addEventListener('input', () => { readControls(); reset(); });
$('ctl-speed').addEventListener('input', () => { readControls(); });
$('ctl-seed').addEventListener('change', () => { readControls(); reset(); });

for (const [btn, init] of [['init-up', 'up'], ['init-down', 'down'], ['init-random', 'random']]) {
  $(btn).addEventListener('click', () => {
    state.init = init;
    for (const b of ['init-up', 'init-down', 'init-random']) {
      $(b).setAttribute('aria-pressed', String(b === btn));
    }
    reset();
  });
}

// ---------------- boot ----------------
initTheme($('theme-toggle'));
readControls();
reset();
loadMarkdown($('explain'), './entropy.md');
typeset(document.body);
