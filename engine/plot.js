// Minimal SVG plot primitives, styled entirely from the CSS tokens.
// Hand-written (no D3/Plotly): the design system needs full control of every
// stroke, and the only primitives required are axes, bars, lines, dots and
// direct labels. Logical viewBox 640 x H, scaled responsively by CSS.
//
// Axis titles are HTML elements around the SVG so KaTeX can render them.

const NS = 'http://www.w3.org/2000/svg';
const W = 640;

function el(name, attrs = {}) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

export function niceTicks(a, b, n = 6) {
  if (!(b > a)) return [a];
  const span = b - a;
  const step0 = span / Math.max(1, n);
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  let step = mag;
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (step0 <= m * mag) { step = m * mag; break; }
  }
  const ticks = [];
  const start = Math.ceil(a / step - 1e-9) * step;
  for (let t = start; t <= b + 1e-9; t += step) ticks.push(Math.abs(t) < 1e-12 ? 0 : t);
  return ticks;
}

export function fmtTick(v) {
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 10000 || a < 0.001) return v.toExponential(0).replace('e+', 'e');
  return String(Math.round(v * 1e6) / 1e6);
}

let clipCounter = 0;

export function createPlot(container, opts = {}) {
  const height = opts.height ?? 300;
  const m = { t: 12, r: 14, b: 30, l: 48, ...(opts.margin || {}) };

  container.classList.add('plot');

  const yTitle = document.createElement('div');
  yTitle.className = 'plot-ylabel small muted';
  const svg = el('svg', { viewBox: `0 0 ${W} ${height}` });
  const xTitle = document.createElement('div');
  xTitle.className = 'plot-xlabel small muted';
  xTitle.style.textAlign = 'center';
  container.append(yTitle, svg, xTitle);

  const clipId = `plotclip-${++clipCounter}`;
  const defs = el('defs');
  const clip = el('clipPath', { id: clipId });
  clip.appendChild(el('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: height - m.t - m.b }));
  defs.appendChild(clip);
  svg.appendChild(defs);

  const gGrid = el('g');
  const gData = el('g', { 'clip-path': `url(#${clipId})` });
  const gAxes = el('g', { class: 'axis' });
  const gLabels = el('g');
  svg.append(gGrid, gData, gAxes, gLabels);

  let dom = { x0: 0, x1: 1, y0: 0, y1: 1 };
  const layers = new Map(); // id -> <g>

  const sx = (x) => m.l + ((x - dom.x0) / (dom.x1 - dom.x0)) * (W - m.l - m.r);
  const sy = (y) => height - m.b - ((y - dom.y0) / (dom.y1 - dom.y0)) * (height - m.t - m.b);

  function layer(id) {
    if (!layers.has(id)) {
      const g = el('g');
      gData.appendChild(g);
      layers.set(id, g);
    }
    return layers.get(id);
  }

  function setLabels(x, y) {
    if (x !== undefined) xTitle.innerHTML = x;
    if (y !== undefined) yTitle.innerHTML = y;
    if (window.renderMathInElement) {
      for (const t of [xTitle, yTitle]) {
        window.renderMathInElement(t, {
          delimiters: [{ left: '$', right: '$', display: false }],
          throwOnError: false,
        });
      }
    }
  }

  function axes({ xTicks, yTicks, grid = false } = {}) {
    gAxes.replaceChildren();
    gGrid.replaceChildren();
    const xs = xTicks ?? niceTicks(dom.x0, dom.x1, 7);
    const ys = yTicks ?? niceTicks(dom.y0, dom.y1, 5);
    // spines: bottom + left only
    gAxes.appendChild(el('line', { x1: m.l, y1: height - m.b, x2: W - m.r, y2: height - m.b }));
    gAxes.appendChild(el('line', { x1: m.l, y1: m.t, x2: m.l, y2: height - m.b }));
    for (const t of xs) {
      if (t < dom.x0 - 1e-9 || t > dom.x1 + 1e-9) continue;
      const X = sx(t);
      gAxes.appendChild(el('line', { x1: X, y1: height - m.b, x2: X, y2: height - m.b + 4 }));
      const txt = el('text', { x: X, y: height - m.b + 15, 'text-anchor': 'middle' });
      txt.textContent = fmtTick(t);
      gAxes.appendChild(txt);
      if (grid) gGrid.appendChild(el('line', { class: 'gridline', x1: X, y1: m.t, x2: X, y2: height - m.b }));
    }
    for (const t of ys) {
      if (t < dom.y0 - 1e-9 || t > dom.y1 + 1e-9) continue;
      const Y = sy(t);
      gAxes.appendChild(el('line', { x1: m.l - 4, y1: Y, x2: m.l, y2: Y }));
      const txt = el('text', { x: m.l - 7, y: Y + 3, 'text-anchor': 'end' });
      txt.textContent = fmtTick(t);
      gAxes.appendChild(txt);
      if (grid) gGrid.appendChild(el('line', { class: 'gridline', x1: m.l, y1: Y, x2: W - m.r, y2: Y }));
    }
  }

  // Bars from y = 0, centered on xs[i], width in data units.
  // Reuses existing rects when the count matches so CSS can ease the change.
  function bars(id, xs, heights, { width = 1, color = 'var(--hist)' } = {}) {
    const g = layer(id);
    const y0 = sy(Math.max(0, dom.y0));
    const wPx = Math.max(0.75, Math.abs(sx(width) - sx(0)) * 0.92);
    if (g.childElementCount !== xs.length) {
      g.replaceChildren();
      for (let i = 0; i < xs.length; i++) g.appendChild(el('rect', { class: 'bar' }));
    }
    for (let i = 0; i < xs.length; i++) {
      const r = g.children[i];
      const X = sx(xs[i]) - wPx / 2;
      const Y = sy(heights[i]);
      r.style.fill = color;
      for (const [k, v] of [['x', X], ['y', Math.min(Y, y0)], ['width', wPx], ['height', Math.abs(y0 - Y)]]) {
        r.setAttribute(k, v);
        r.style.setProperty(k, `${v}px`); // CSS geometry -> transitions
      }
    }
  }

  function line(id, xs, ys, { color = 'var(--fg)', width = 1.5, dash = null, opacity = 1 } = {}) {
    const g = layer(id);
    g.replaceChildren();
    let d = '';
    for (let i = 0; i < xs.length; i++) {
      d += (i === 0 ? 'M' : 'L') + sx(xs[i]).toFixed(2) + ',' + sy(ys[i]).toFixed(2);
    }
    const p = el('path', { d, fill: 'none', stroke: color, 'stroke-width': width, opacity });
    if (dash) p.setAttribute('stroke-dasharray', dash);
    g.appendChild(p);
  }

  // Hollow dots: exact-pmf overlay per the design system.
  function dots(id, xs, ys, { color = 'var(--fg)', r = 2.4, hollow = true } = {}) {
    const g = layer(id);
    g.replaceChildren();
    for (let i = 0; i < xs.length; i++) {
      g.appendChild(el('circle', {
        cx: sx(xs[i]), cy: sy(ys[i]), r,
        fill: hollow ? 'none' : color,
        stroke: color, 'stroke-width': 1,
      }));
    }
  }

  // Direct label at data coords (for Plot B curve labels).
  function label(id, text, x, y, { color = 'var(--fg)', anchor = 'start' } = {}) {
    let t = gLabels.querySelector(`[data-id="${id}"]`);
    if (!t) {
      t = el('text', { class: 'curve-label', 'data-id': id });
      gLabels.appendChild(t);
    }
    t.setAttribute('x', sx(x));
    t.setAttribute('y', sy(y));
    t.setAttribute('text-anchor', anchor);
    t.setAttribute('fill', color);
    t.textContent = text;
  }

  function remove(id) {
    layers.get(id)?.replaceChildren();
    gLabels.querySelector(`[data-id="${id}"]`)?.remove();
  }

  return {
    svg,
    setDomain(x0, x1, y0, y1) { dom = { x0, x1, y0, y1 }; },
    get domain() { return { ...dom }; },
    axes, bars, line, dots, label, remove, setLabels,
  };
}
