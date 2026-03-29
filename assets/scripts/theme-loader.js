(function () {
  function applyTheme(theme) {
    if (!theme || typeof theme !== 'object') return;

    const root = document.documentElement;
    const colors = theme.colors || {};

    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value);
    });

    if (theme.borderRadius) {
      root.style.setProperty('--theme-radius', theme.borderRadius);
    }

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

    document.body.classList.toggle('theme-compact', !!theme.compactMode);
  }

  async function loadTheme() {
    try {
      if (!window.EMSAdminStore) {
        throw new Error('EMSAdminStore ontbreekt.');
      }

      const theme = await window.EMSAdminStore.get('theme');
      applyTheme(theme);
      window.__EMS_THEME__ = theme;
      return theme;
    } catch (error) {
      console.warn('Thema kon niet geladen worden via store.', error);
      return null;
    }
  }

  window.ThemeLoader = {
    loadTheme,
    applyTheme
  };

  document.addEventListener('DOMContentLoaded', loadTheme);
})();