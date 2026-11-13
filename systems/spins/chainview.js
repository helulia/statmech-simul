// Shared "one sample of the chain" visual: colored tiles for N ≤ 400,
// a pixel raster above that. Orange = up, blue = down (strict semantics).

export function cssColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function createChainView(stripEl, rasterEl) {
  let lastChain = null;

  function render(chain) {
    lastChain = chain;
    const N = chain.length;
    if (N <= 400) {
      rasterEl.hidden = true;
      stripEl.hidden = false;
      if (stripEl.childElementCount !== N) {
        stripEl.replaceChildren();
        for (let i = 0; i < N; i++) stripEl.appendChild(document.createElement('div'));
      }
      for (let i = 0; i < N; i++) {
        const t = stripEl.children[i];
        const up = chain[i] === 1;
        t.className = 'tile ' + (up ? 'up' : 'down');
        t.dataset.glyph = up ? '↑' : '↓';
        t.title = `s${i + 1} = ${up ? '+½' : '−½'}`;
      }
    } else {
      stripEl.hidden = true;
      rasterEl.hidden = false;
      const px = N > 4000 ? 2 : 3;
      const cols = 220;
      const rows = Math.ceil(N / cols);
      rasterEl.width = cols * px;
      rasterEl.height = rows * px;
      rasterEl.style.maxWidth = '100%';
      const ctx = rasterEl.getContext('2d');
      const cUp = cssColor('--up'), cDown = cssColor('--down');
      ctx.fillStyle = cssColor('--surface');
      ctx.fillRect(0, 0, rasterEl.width, rasterEl.height);
      for (let i = 0; i < N; i++) {
        ctx.fillStyle = chain[i] ? cUp : cDown;
        ctx.fillRect((i % cols) * px, Math.floor(i / cols) * px, px - (px > 2 ? 1 : 0), px - (px > 2 ? 1 : 0));
      }
    }
  }

  // repaint on theme flips (token colors change)
  new MutationObserver(() => { if (lastChain && !rasterEl.hidden) render(lastChain); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  return { render };
}
