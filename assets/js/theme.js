// Theme: dark by default, light via prefers-color-scheme, manual override
// persisted in localStorage ('theme' = 'dark' | 'light').

const KEY = 'statmech-theme';

export function initTheme(toggleBtn) {
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (saved === 'dark' || saved === 'light') {
    document.documentElement.dataset.theme = saved;
  }
  const current = () =>
    document.documentElement.dataset.theme ||
    (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

  const paint = () => { toggleBtn.textContent = current() === 'dark' ? 'light' : 'dark'; };
  paint();
  toggleBtn.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(KEY, next); } catch (e) {}
    paint();
  });
}
