(() => {
  'use strict';
  const root = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  const label = toggle?.querySelector('.theme-label');
  let initial = 'dark';
  try { initial = localStorage.getItem('roboforge.docs.theme') === 'light' ? 'light' : 'dark'; } catch { /* storage disabled */ }
  function setTheme(theme) {
    root.dataset.theme = theme;
    toggle?.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    if (label) label.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#172126' : '#dce4e8');
    try { localStorage.setItem('roboforge.docs.theme', theme); } catch { /* optional */ }
  }
  setTheme(initial);
  toggle?.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));

  const shot = document.getElementById('studioShot');
  document.querySelectorAll('[data-preview]').forEach(tab => {
    tab.addEventListener('click', () => {
      const appearance = tab.getAttribute('data-preview');
      if (appearance !== 'dark' && appearance !== 'light' || !shot) return;
      shot.setAttribute('src', `screenshots/overview-${appearance}.png`);
      shot.setAttribute('alt', `${appearance === 'dark' ? 'Dark graphite and cyan' : 'Light silver and cyan'} design preview of RoboForge's engineering overview`);
      document.querySelectorAll('[data-preview]').forEach(btn => {
        const active = btn === tab;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', String(active));
      });
    });
  });
  document.getElementById('copyCommand')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const content = document.getElementById('installCommands')?.textContent?.trim();
    if (!content) return;
    try { await navigator.clipboard.writeText(content); button.textContent = 'Copied'; }
    catch { button.textContent = 'Select & copy'; }
  });
})();
