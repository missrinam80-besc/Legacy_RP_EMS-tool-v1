(function () {
  function setCssVar(name, value) {
    if (!value) return;
    document.documentElement.style.setProperty(name, value);
  }

  function applyColors(colors) {
    if (!colors || typeof colors !== 'object') return;

    Object.entries(colors).forEach(([key, value]) => {
      setCssVar(`--theme-${key}`, value);
    });

    if (colors.primary) setCssVar('--color-primary', colors.primary);
    if (colors.background) setCssVar('--color-background', colors.background);
    if (colors.surface) setCssVar('--color-surface', colors.surface);
    if (colors.text) setCssVar('--color-text', colors.text);
    if (colors.accent) setCssVar('--color-accent', colors.accent);
    if (colors.success) setCssVar('--color-success', colors.success);
    if (colors.warning) setCssVar('--color-warning', colors.warning);
    if (colors.danger) setCssVar('--color-danger', colors.danger);

    if (colors.surfaceSoft) setCssVar('--color-surface-soft', colors.surfaceSoft);
    if (colors.textSoft) setCssVar('--color-text-soft', colors.textSoft);
    if (colors.primaryDark) setCssVar('--color-primary-dark', colors.primaryDark);
    if (colors.primaryLight) setCssVar('--color-primary-light', colors.primaryLight);
    if (colors.border) setCssVar('--color-border', colors.border);
    if (colors.info) setCssVar('--color-info', colors.info);
  }

  function applyTheme(theme) {
    if (!theme || typeof theme !== 'object') return;

    const colors = theme.colors || {};
    applyColors(colors);

    if (theme.borderRadius) {
      setCssVar('--theme-radius', theme.borderRadius);
      setCssVar('--border-radius', theme.borderRadius);
    }

    document.body.classList.toggle('theme-compact', !!theme.compactMode);

    document.querySelectorAll('[data-site-title]').forEach((el) => {
      el.textContent = theme.siteTitle || '';
    });

    document.querySelectorAll('[data-site-subtitle]').forEach((el) => {
      el.textContent = theme.siteSubtitle || '';
    });

    document.querySelectorAll('[data-site-banner]').forEach((el) => {
      if (el.tagName === 'IMG' && theme.bannerPath) {
        el.src = theme.bannerPath;
      }
    });

    document.querySelectorAll('[data-site-logo]').forEach((el) => {
      if (el.tagName === 'IMG' && theme.logoPath) {
        el.src = theme.logoPath;
      }
    });

    document.documentElement.dataset.themeLoaded = 'true';
    window.__EMS_THEME__ = theme;
  }

  async function loadTheme(options = {}) {
    const { forceRefresh = false } = options;

    try {
      if (!window.EMSAdminStore) {
        throw new Error('EMSAdminStore ontbreekt.');
      }

      const theme = await window.EMSAdminStore.get('theme', { forceRefresh });
      applyTheme(theme);
      return theme;
    } catch (error) {
      console.warn('[ThemeLoader] Thema kon niet geladen worden.', error);
      return null;
    }
  }

  async function refreshTheme() {
    try {
      if (!window.EMSAdminStore) {
        throw new Error('EMSAdminStore ontbreekt.');
      }

      const theme = await window.EMSAdminStore.refresh('theme');
      applyTheme(theme);
      return theme;
    } catch (error) {
      console.warn('[ThemeLoader] Thema kon niet ververst worden.', error);
      return null;
    }
  }

  window.ThemeLoader = {
    loadTheme,
    refreshTheme,
    applyTheme
  };

  document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
  });
})();