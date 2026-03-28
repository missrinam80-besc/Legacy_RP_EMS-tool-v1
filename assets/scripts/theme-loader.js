(function(global) {
  const STORAGE_KEY = 'ems_admin_theme';
  function getDefaultThemePath() {
    const current = document.currentScript?.src || '';
    if (current) {
      return current.replace(/assets\/scripts\/theme-loader\.js(?:\?.*)?$/, 'data/admin/default-theme.json');
    }
    return 'data/admin/default-theme.json';
  }
  function applyThemeConfig(config) {
    if (!config || typeof config !== 'object') return;
    const root = document.documentElement;
    const colors = config.colors || {};
    const map = {
      background: '--color-bg', surface: '--color-surface', surfaceSoft: '--color-surface-soft', text: '--color-text',
      textSoft: '--color-text-soft', primary: '--color-primary', primaryDark: '--color-primary-dark',
      primaryLight: '--color-primary-light', border: '--color-border', success: '--color-success',
      warning: '--color-warning', danger: '--color-danger', info: '--color-info'
    };
    Object.entries(map).forEach(([key, cssVar]) => { if (colors[key]) root.style.setProperty(cssVar, colors[key]); });
    if (config.borderRadius) root.style.setProperty('--radius-md', config.borderRadius);
    if (config.shadowStyle === 'soft') {
      root.style.setProperty('--shadow-sm', '0 2px 6px rgba(0, 0, 0, 0.05)');
      root.style.setProperty('--shadow-md', '0 6px 18px rgba(0, 0, 0, 0.08)');
    } else if (config.shadowStyle === 'strong') {
      root.style.setProperty('--shadow-sm', '0 3px 10px rgba(0, 0, 0, 0.09)');
      root.style.setProperty('--shadow-md', '0 12px 28px rgba(0, 0, 0, 0.14)');
    }
    if (config.compactMode) {
      root.style.setProperty('--spacing-sm', '0.55rem');
      root.style.setProperty('--spacing-md', '0.8rem');
      root.style.setProperty('--spacing-lg', '1.15rem');
    }
  }
  function readStoredTheme() { try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
  async function loadDefaultTheme() { const response = await fetch(getDefaultThemePath(), { cache: 'no-store' }); if (!response.ok) return null; return response.json(); }
  async function initTheme() {
    const stored = readStoredTheme();
    if (stored) return applyThemeConfig(stored);
    try { const defaults = await loadDefaultTheme(); applyThemeConfig(defaults); } catch (e) { console.warn('Kon standaardthema niet laden.', e); }
  }
  global.EMSThemeLoader = { initTheme, applyThemeConfig };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initTheme, { once: true });
  else initTheme();
})(window);
