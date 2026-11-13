// Tiny markdown renderer + KaTeX helper shared by the simulation pages.
// Supports: # / ## headings, paragraphs, **bold**, *em*, `code`, [text](url).
// Underscores are NOT emphasis (they would break TeX subscripts); $...$ is
// left untouched for KaTeX auto-render.

export function mdToHtml(md) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s) => s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  return md.split(/\r?\n\s*\r?\n/).map((b) => {
    b = b.trim();
    if (!b) return '';
    if (b.startsWith('## ')) return `<h3>${inline(esc(b.slice(3)))}</h3>`;
    if (b.startsWith('# ')) return `<h2>${inline(esc(b.slice(2)))}</h2>`;
    return `<p>${inline(esc(b.replace(/\r?\n/g, ' ')))}</p>`;
  }).join('\n');
}

export function typeset(root = document.body) {
  const run = () => window.renderMathInElement?.(root, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false },
    ],
    throwOnError: false,
  });
  if (window.renderMathInElement) run();
  else window.addEventListener('katex-ready', run, { once: true });
}

export function loadMarkdown(el, url) {
  return fetch(url)
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then((md) => { el.innerHTML = mdToHtml(md); typeset(el); })
    .catch(() => {
      el.innerHTML = `<p class="muted small">Could not load ${url} (serve the site over HTTP, e.g. <code>python serve.py</code>).</p>`;
    });
}
