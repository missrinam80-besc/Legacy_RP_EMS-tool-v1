let ADMIN_CONFIG = null;
let themeData = null;

const elements = {
  statsGrid: document.getElementById('statsGrid'),
  statusMessage: document.getElementById('statusMessage'),
  applyBtn: document.getElementById('applyBtn'),
  exportBtn: document.getElementById('exportBtn'),
  importInput: document.getElementById('importInput'),
  resetDefaultsBtn: document.getElementById('resetDefaultsBtn'),
  reloadBtn: document.getElementById('reloadBtn'),
  themeForm: document.getElementById('themeForm'),
  siteTitleInput: document.getElementById('siteTitleInput'),
  siteSubtitleInput: document.getElementById('siteSubtitleInput'),
  logoPathInput: document.getElementById('logoPathInput'),
  bannerPathInput: document.getElementById('bannerPathInput'),
  backgroundInput: document.getElementById('backgroundInput'),
  surfaceInput: document.getElementById('surfaceInput'),
  surfaceSoftInput: document.getElementById('surfaceSoftInput'),
  textInput: document.getElementById('textInput'),
  textSoftInput: document.getElementById('textSoftInput'),
  primaryInput: document.getElementById('primaryInput'),
  primaryDarkInput: document.getElementById('primaryDarkInput'),
  primaryLightInput: document.getElementById('primaryLightInput'),
  borderInput: document.getElementById('borderInput'),
  successInput: document.getElementById('successInput'),
  warningInput: document.getElementById('warningInput'),
  dangerInput: document.getElementById('dangerInput'),
  infoInput: document.getElementById('infoInput'),
  borderRadiusInput: document.getElementById('borderRadiusInput'),
  shadowStyleInput: document.getElementById('shadowStyleInput'),
  compactModeInput: document.getElementById('compactModeInput'),
  previewTitle: document.getElementById('previewTitle'),
  previewSubtitle: document.getElementById('previewSubtitle'),
  previewChips: document.getElementById('previewChips'),
  previewMeta: document.getElementById('previewMeta')
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    ADMIN_CONFIG = await loadConfig();
    themeData = await AdminStore.loadAdminData(ADMIN_CONFIG.storageKey, ADMIN_CONFIG.defaultDataPath);
    bindEvents();
    fillForm(themeData);
    updateStats();
    renderPreview(themeData);
    AdminUI.showToast('Themaconfig geladen.', 'success');
  } catch (error) {
    console.error(error);
    AdminUI.showToast(error.message || 'Er liep iets mis bij het laden van het thema.', 'danger');
  }
}

async function loadConfig() {
  const response = await fetch('config.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Config van beheer-thema kon niet geladen worden.');
  return response.json();
}

function bindEvents() {
  elements.themeForm.addEventListener('input', handleLivePreview);
  elements.applyBtn.addEventListener('click', handleApply);
  elements.exportBtn.addEventListener('click', handleExport);
  elements.importInput.addEventListener('change', handleImport);
  elements.resetDefaultsBtn.addEventListener('click', handleResetDefaults);
  elements.reloadBtn.addEventListener('click', reloadData);
}

function fillForm(data) {
  const colors = data.colors || {};
  elements.siteTitleInput.value = data.siteTitle || '';
  elements.siteSubtitleInput.value = data.siteSubtitle || '';
  elements.logoPathInput.value = data.logoPath || '';
  elements.bannerPathInput.value = data.bannerPath || '';
  elements.backgroundInput.value = colors.background || '#f4f6fa';
  elements.surfaceInput.value = colors.surface || '#ffffff';
  elements.surfaceSoftInput.value = colors.surfaceSoft || '#f8fafc';
  elements.textInput.value = colors.text || '#1f2937';
  elements.textSoftInput.value = colors.textSoft || '#6b7280';
  elements.primaryInput.value = colors.primary || '#8b0a0a';
  elements.primaryDarkInput.value = colors.primaryDark || '#5f0606';
  elements.primaryLightInput.value = colors.primaryLight || '#b91c1c';
  elements.borderInput.value = colors.border || '#d8dee9';
  elements.successInput.value = colors.success || '#15803d';
  elements.warningInput.value = colors.warning || '#b45309';
  elements.dangerInput.value = colors.danger || '#b91c1c';
  elements.infoInput.value = colors.info || '#1d4ed8';
  elements.borderRadiusInput.value = data.borderRadius || '16px';
  elements.shadowStyleInput.value = data.shadowStyle || 'medium';
  elements.compactModeInput.checked = !!data.compactMode;
}

function collectFormData() {
  return {
    version: themeData.version || '1.0.0',
    siteTitle: elements.siteTitleInput.value.trim(),
    siteSubtitle: elements.siteSubtitleInput.value.trim(),
    logoPath: elements.logoPathInput.value.trim(),
    bannerPath: elements.bannerPathInput.value.trim(),
    colors: {
      background: elements.backgroundInput.value,
      surface: elements.surfaceInput.value,
      surfaceSoft: elements.surfaceSoftInput.value,
      text: elements.textInput.value,
      textSoft: elements.textSoftInput.value,
      primary: elements.primaryInput.value,
      primaryDark: elements.primaryDarkInput.value,
      primaryLight: elements.primaryLightInput.value,
      border: elements.borderInput.value,
      success: elements.successInput.value,
      warning: elements.warningInput.value,
      danger: elements.dangerInput.value,
      info: elements.infoInput.value
    },
    borderRadius: elements.borderRadiusInput.value.trim() || '16px',
    shadowStyle: elements.shadowStyleInput.value,
    compactMode: elements.compactModeInput.checked
  };
}

function handleLivePreview() {
  const draft = collectFormData();
  renderPreview(draft);
  window.EMSThemeLoader?.applyThemeConfig?.(draft);
}

function handleApply() {
  const payload = collectFormData();
  if (!payload.siteTitle) {
    AdminUI.showToast('Sitetitel is verplicht.', 'danger');
    return;
  }
  themeData = payload;
  AdminStore.saveAdminData(ADMIN_CONFIG.storageKey, themeData);
  renderPreview(themeData);
  updateStats();
  window.EMSThemeLoader?.applyThemeConfig?.(themeData);
  AdminUI.showToast('Thema opgeslagen en toegepast.', 'success');
}

function renderPreview(data) {
  elements.previewTitle.textContent = data.siteTitle || 'Pillbox EMS Suite';
  elements.previewSubtitle.textContent = data.siteSubtitle || 'Interne EMS tools en portalen';
  elements.previewChips.innerHTML = [
    `Primary ${data.colors?.primary || '#8b0a0a'}`,
    `Radius ${data.borderRadius || '16px'}`,
    `Shadow ${data.shadowStyle || 'medium'}`,
    data.compactMode ? 'Compact mode' : 'Normale spacing'
  ].map((value) => `<span class="preview-chip">${escapeHtml(value)}</span>`).join('');

  elements.previewMeta.innerHTML = [
    ['Achtergrond', data.colors?.background || ''],
    ['Surface', data.colors?.surface || ''],
    ['Tekst', data.colors?.text || ''],
    ['Border', data.colors?.border || ''],
    ['Banner', data.bannerPath || 'n.v.t.'],
    ['Logo', data.logoPath || 'n.v.t.']
  ].map(([label, value]) => `<li><strong>${label}</strong><br>${escapeHtml(value)}</li>`).join('');
}

function updateStats() {
  const cards = [
    ['Primary kleur', themeData?.colors?.primary || '#8b0a0a'],
    ['Shadowstijl', themeData?.shadowStyle || 'medium'],
    ['Compact mode', themeData?.compactMode ? 'Ja' : 'Nee'],
    ['Radius', themeData?.borderRadius || '16px']
  ];
  elements.statsGrid.innerHTML = cards.map(([label, value]) => `<div class="stat-card"><span>${label}</span><strong>${escapeHtml(String(value))}</strong></div>`).join('');
}

function handleExport() {
  AdminStore.exportAdminData(themeData, ADMIN_CONFIG.exportFilename || 'ems-thema-export.json');
  AdminUI.showToast('Themaconfig geëxporteerd.', 'success');
}

async function handleImport(event) {
  const [file] = event.target.files || [];
  if (!file) return;
  try {
    themeData = await AdminStore.importAdminData(file);
    fillForm(themeData);
    renderPreview(themeData);
    updateStats();
    AdminStore.saveAdminData(ADMIN_CONFIG.storageKey, themeData);
    window.EMSThemeLoader?.applyThemeConfig?.(themeData);
    AdminUI.showToast('Themaconfig geïmporteerd.', 'success');
  } catch (error) {
    AdminUI.showToast(error.message || 'Import van themaconfig mislukt.', 'danger');
  } finally {
    event.target.value = '';
  }
}

async function handleResetDefaults() {
  if (!window.confirm('Wil je alle lokale themawijzigingen resetten naar de standaardconfig?')) return;
  themeData = await AdminStore.resetAdminData(ADMIN_CONFIG.storageKey, ADMIN_CONFIG.defaultDataPath);
  fillForm(themeData);
  renderPreview(themeData);
  updateStats();
  window.EMSThemeLoader?.applyThemeConfig?.(themeData);
  AdminUI.showToast('Thema werd gereset naar standaard.', 'success');
}

async function reloadData() {
  themeData = await AdminStore.loadAdminData(ADMIN_CONFIG.storageKey, ADMIN_CONFIG.defaultDataPath);
  fillForm(themeData);
  renderPreview(themeData);
  updateStats();
  window.EMSThemeLoader?.applyThemeConfig?.(themeData);
  AdminUI.showToast('Themaconfig herladen.', 'success');
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
