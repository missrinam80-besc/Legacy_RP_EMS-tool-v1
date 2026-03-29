(function () {
  const ACTOR = 'beheer_thema_ui';

  const state = {
    originalTheme: null,
    theme: null,
    loading: false,
    saving: false
  };

  const els = {
    form: document.getElementById('theme-form'),
    status: document.getElementById('theme-status'),

    siteTitle: document.getElementById('siteTitleInput'),
    siteSubtitle: document.getElementById('siteSubtitleInput'),
    bannerPath: document.getElementById('bannerPathInput'),
    logoPath: document.getElementById('logoPathInput'),
    borderRadius: document.getElementById('borderRadiusInput'),
    compactMode: document.getElementById('compactModeInput'),

    colorPrimary: document.getElementById('colorPrimaryInput'),
    colorBackground: document.getElementById('colorBackgroundInput'),
    colorSurface: document.getElementById('colorSurfaceInput'),
    colorText: document.getElementById('colorTextInput'),
    colorAccent: document.getElementById('colorAccentInput'),
    colorSuccess: document.getElementById('colorSuccessInput'),
    colorWarning: document.getElementById('colorWarningInput'),
    colorDanger: document.getElementById('colorDangerInput'),

    refreshBtn: document.getElementById('refresh-theme-btn'),
    resetBtn: document.getElementById('reset-theme-btn'),
    saveBtn: document.getElementById('save-theme-btn')
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function setStatus(message, tone = 'info') {
    if (!els.status) return;
    els.status.className = `status-box status-${tone}`;
    els.status.textContent = message;
  }

  function setLoading(isLoading) {
    state.loading = isLoading;
    if (els.saveBtn) els.saveBtn.disabled = isLoading || state.saving;
    if (els.refreshBtn) els.refreshBtn.disabled = isLoading || state.saving;
    if (els.resetBtn) els.resetBtn.disabled = isLoading || state.saving;
  }

  function setSaving(isSaving) {
    state.saving = isSaving;
    if (els.saveBtn) els.saveBtn.disabled = isSaving || state.loading;
    if (els.refreshBtn) els.refreshBtn.disabled = isSaving || state.loading;
    if (els.resetBtn) els.resetBtn.disabled = isSaving || state.loading;
  }

  function ensureColor(value, fallback = '#000000') {
    const str = String(value || '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(str) ? str : fallback;
  }

  function normalizeTheme(theme) {
    const colors = theme?.colors || {};

    return {
      siteTitle: String(theme?.siteTitle || '').trim(),
      siteSubtitle: String(theme?.siteSubtitle || '').trim(),
      bannerPath: String(theme?.bannerPath || '').trim(),
      logoPath: String(theme?.logoPath || '').trim(),
      borderRadius: String(theme?.borderRadius || '16px').trim(),
      compactMode: !!theme?.compactMode,
      colors: {
        primary: ensureColor(colors.primary, '#8b0a0a'),
        background: ensureColor(colors.background, '#f4f6fa'),
        surface: ensureColor(colors.surface, '#ffffff'),
        text: ensureColor(colors.text, '#1a1a1a'),
        accent: ensureColor(colors.accent, '#c59d2a'),
        success: ensureColor(colors.success, '#1f8b4c'),
        warning: ensureColor(colors.warning, '#d48b00'),
        danger: ensureColor(colors.danger, '#b42318')
      }
    };
  }

  function fillForm(theme) {
    if (!theme) return;

    els.siteTitle && (els.siteTitle.value = theme.siteTitle || '');
    els.siteSubtitle && (els.siteSubtitle.value = theme.siteSubtitle || '');
    els.bannerPath && (els.bannerPath.value = theme.bannerPath || '');
    els.logoPath && (els.logoPath.value = theme.logoPath || '');
    els.borderRadius && (els.borderRadius.value = theme.borderRadius || '16px');
    els.compactMode && (els.compactMode.checked = !!theme.compactMode);

    if (els.colorPrimary) els.colorPrimary.value = theme.colors.primary;
    if (els.colorBackground) els.colorBackground.value = theme.colors.background;
    if (els.colorSurface) els.colorSurface.value = theme.colors.surface;
    if (els.colorText) els.colorText.value = theme.colors.text;
    if (els.colorAccent) els.colorAccent.value = theme.colors.accent;
    if (els.colorSuccess) els.colorSuccess.value = theme.colors.success;
    if (els.colorWarning) els.colorWarning.value = theme.colors.warning;
    if (els.colorDanger) els.colorDanger.value = theme.colors.danger;
  }

  function readForm() {
    return normalizeTheme({
      siteTitle: els.siteTitle?.value,
      siteSubtitle: els.siteSubtitle?.value,
      bannerPath: els.bannerPath?.value,
      logoPath: els.logoPath?.value,
      borderRadius: els.borderRadius?.value,
      compactMode: !!els.compactMode?.checked,
      colors: {
        primary: els.colorPrimary?.value,
        background: els.colorBackground?.value,
        surface: els.colorSurface?.value,
        text: els.colorText?.value,
        accent: els.colorAccent?.value,
        success: els.colorSuccess?.value,
        warning: els.colorWarning?.value,
        danger: els.colorDanger?.value
      }
    });
  }

  function applyPreview(theme) {
    if (window.ThemeLoader?.applyTheme) {
      window.ThemeLoader.applyTheme(theme);
    }
  }

  async function loadTheme() {
    setLoading(true);
    setStatus('Thema laden...', 'info');

    try {
      const theme = await window.EMSAdminStore.get('theme', { forceRefresh: true });
      const normalized = normalizeTheme(theme);

      state.originalTheme = clone(normalized);
      state.theme = clone(normalized);

      fillForm(normalized);
      applyPreview(normalized);

      setStatus('Thema succesvol geladen.', 'success');
    } catch (error) {
      console.error(error);
      setStatus(`Fout bij laden van thema: ${error.message}`, 'danger');
    } finally {
      setLoading(false);
    }
  }

  function resetTheme() {
    if (!state.originalTheme) return;
    state.theme = clone(state.originalTheme);
    fillForm(state.theme);
    applyPreview(state.theme);
    setStatus('Wijzigingen teruggezet naar laatst geladen thema.', 'info');
  }

  async function saveTheme() {
    const theme = readForm();
    applyPreview(theme);

    setSaving(true);
    setStatus('Thema opslaan...', 'info');

    try {
      await window.EMSAdminStore.save('theme', theme, ACTOR);

      state.originalTheme = clone(theme);
      state.theme = clone(theme);

      setStatus('Thema succesvol opgeslagen.', 'success');
    } catch (error) {
      console.error(error);
      setStatus(`Fout bij opslaan van thema: ${error.message}`, 'danger');
    } finally {
      setSaving(false);
    }
  }

  function bindLivePreview() {
    if (!els.form) return;

    els.form.addEventListener('input', () => {
      const theme = readForm();
      state.theme = clone(theme);
      applyPreview(theme);
    });

    els.form.addEventListener('change', () => {
      const theme = readForm();
      state.theme = clone(theme);
      applyPreview(theme);
    });
  }

  function bindEvents() {
    if (els.refreshBtn) {
      els.refreshBtn.addEventListener('click', loadTheme);
    }

    if (els.resetBtn) {
      els.resetBtn.addEventListener('click', resetTheme);
    }

    if (els.form) {
      els.form.addEventListener('submit', async (event) => {
        event.preventDefault();
        await saveTheme();
      });
    }

    bindLivePreview();
  }

  async function init() {
    bindEvents();
    await loadTheme();
  }

  document.addEventListener('DOMContentLoaded', init);
})();