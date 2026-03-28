let ADMIN_CONFIG = null;
let adminData = null;
let filteredItems = [];
let selectedId = null;

const elements = {
  statsGrid: document.getElementById('statsGrid'),
  statusMessage: document.getElementById('statusMessage'),
  moduleList: document.getElementById('moduleList'),
  emptyState: document.getElementById('emptyState'),
  resultCount: document.getElementById('resultCount'),
  searchInput: document.getElementById('searchInput'),
  typeFilter: document.getElementById('typeFilter'),
  departmentFilter: document.getElementById('departmentFilter'),
  statusFilter: document.getElementById('statusFilter'),
  visibilityFilter: document.getElementById('visibilityFilter'),
  enabledFilter: document.getElementById('enabledFilter'),
  newItemBtn: document.getElementById('newItemBtn'),
  exportBtn: document.getElementById('exportBtn'),
  importInput: document.getElementById('importInput'),
  resetDefaultsBtn: document.getElementById('resetDefaultsBtn'),
  reloadBtn: document.getElementById('reloadBtn'),
  moduleForm: document.getElementById('moduleForm'),
  itemId: document.getElementById('itemId'),
  nameInput: document.getElementById('nameInput'),
  typeInput: document.getElementById('typeInput'),
  departmentInput: document.getElementById('departmentInput'),
  statusInput: document.getElementById('statusInput'),
  urlInput: document.getElementById('urlInput'),
  orderInput: document.getElementById('orderInput'),
  rolesInput: document.getElementById('rolesInput'),
  enabledInput: document.getElementById('enabledInput'),
  visibleHomeInput: document.getElementById('visibleHomeInput'),
  visibleCommandInput: document.getElementById('visibleCommandInput'),
  visiblePortalInput: document.getElementById('visiblePortalInput'),
  notesInput: document.getElementById('notesInput'),
  clearFormBtn: document.getElementById('clearFormBtn'),
  previewTitle: document.getElementById('previewTitle'),
  previewAmount: document.getElementById('previewAmount'),
  previewChips: document.getElementById('previewChips'),
  previewMeta: document.getElementById('previewMeta'),
  previewNotes: document.getElementById('previewNotes')
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    ADMIN_CONFIG = await loadConfig();
    adminData = await AdminStore.loadAdminData(ADMIN_CONFIG.storageKey, ADMIN_CONFIG.defaultDataPath);
    adminData.items = Array.isArray(adminData.items) ? adminData.items.map(normalizeItem) : [];
    populateSelects();
    bindEvents();
    resetForm();
    updateStats();
    applyFilters();
    AdminUI.showToast('Moduleconfig geladen.', 'success');
  } catch (error) {
    console.error(error);
    AdminUI.showToast(error.message || 'Er liep iets mis bij het laden van de moduleconfig.', 'danger');
  }
}

async function loadConfig() {
  const response = await fetch('config.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Config van beheer-modules kon niet geladen worden.');
  return response.json();
}

function normalizeItem(item = {}) {
  return {
    id: item.id || AdminUtils.generateId('module'),
    name: item.name || 'Nieuwe module',
    type: item.type || adminData?.types?.[0] || 'tool',
    department: item.department || adminData?.departments?.[0] || 'algemeen',
    url: item.url || '',
    enabled: item.enabled !== false,
    visibleOnHome: !!item.visibleOnHome,
    visibleOnCommand: !!item.visibleOnCommand,
    visibleInPortal: !!item.visibleInPortal,
    status: item.status || adminData?.statuses?.[0] || 'live',
    roles: Array.isArray(item.roles) ? item.roles : AdminUtils.normalizeArray(item.roles),
    order: Number(item.order) || 100,
    notes: item.notes || ''
  };
}

function populateSelects() {
  populateSelect(elements.typeFilter, ['all', ...(adminData.types || [])], 'Alle types');
  populateSelect(elements.departmentFilter, ['all', ...(adminData.departments || [])], 'Alle afdelingen');
  populateSelect(elements.statusFilter, ['all', ...(adminData.statuses || [])], 'Alle statussen');
  populateSelect(elements.typeInput, adminData.types || [], 'Kies type');
  populateSelect(elements.departmentInput, adminData.departments || [], 'Kies afdeling');
  populateSelect(elements.statusInput, adminData.statuses || [], 'Kies status');
}

function populateSelect(target, values, defaultLabel) {
  target.innerHTML = '';
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value === 'all' ? defaultLabel : formatLabel(value);
    target.appendChild(option);
  });
}

function bindEvents() {
  [
    elements.searchInput,
    elements.typeFilter,
    elements.departmentFilter,
    elements.statusFilter,
    elements.visibilityFilter,
    elements.enabledFilter
  ].forEach((element) => element.addEventListener('input', applyFilters));

  elements.newItemBtn.addEventListener('click', resetForm);
  elements.clearFormBtn.addEventListener('click', resetForm);
  elements.reloadBtn.addEventListener('click', reloadData);
  elements.exportBtn.addEventListener('click', handleExport);
  elements.resetDefaultsBtn.addEventListener('click', handleResetDefaults);
  elements.importInput.addEventListener('change', handleImport);
  elements.moduleForm.addEventListener('submit', handleSubmit);
}

function applyFilters() {
  const query = elements.searchInput.value.trim().toLowerCase();
  filteredItems = [...adminData.items].filter((item) => {
    const matchesQuery = !query || [item.name, item.url, item.notes, item.department, item.type]
      .join(' ')
      .toLowerCase()
      .includes(query);
    const matchesType = elements.typeFilter.value === 'all' || item.type === elements.typeFilter.value;
    const matchesDepartment = elements.departmentFilter.value === 'all' || item.department === elements.departmentFilter.value;
    const matchesStatus = elements.statusFilter.value === 'all' || item.status === elements.statusFilter.value;
    const visibilityMode = elements.visibilityFilter.value;
    const matchesVisibility = visibilityMode === 'all'
      || (visibilityMode === 'home' && item.visibleOnHome)
      || (visibilityMode === 'command' && item.visibleOnCommand)
      || (visibilityMode === 'portal' && item.visibleInPortal)
      || (visibilityMode === 'hidden' && !item.visibleOnHome && !item.visibleOnCommand && !item.visibleInPortal);
    const enabledMode = elements.enabledFilter.value;
    const matchesEnabled = enabledMode === 'all'
      || (enabledMode === 'enabled' && item.enabled)
      || (enabledMode === 'disabled' && !item.enabled);
    return matchesQuery && matchesType && matchesDepartment && matchesStatus && matchesVisibility && matchesEnabled;
  }).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'nl'));

  renderList();
  updateStats();
}

function renderList() {
  elements.moduleList.innerHTML = '';
  elements.resultCount.textContent = `${filteredItems.length} resultaten`;
  elements.emptyState.hidden = filteredItems.length > 0;

  filteredItems.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'price-card';
    li.innerHTML = `
      <div class="price-card__top">
        <div>
          <h3>${escapeHtml(item.name)}</h3>
          <div class="price-card__meta">
            <span class="meta-chip">${escapeHtml(formatLabel(item.type))}</span>
            <span class="meta-chip">${escapeHtml(formatLabel(item.department))}</span>
            <span class="meta-chip">${escapeHtml(item.url)}</span>
          </div>
          <div class="price-card__badges">
            <span class="preview-chip">Status: ${escapeHtml(formatLabel(item.status))}</span>
            <span class="preview-chip">${item.enabled ? 'Actief' : 'Uitgeschakeld'}</span>
            ${item.visibleOnHome ? '<span class="preview-chip">Home</span>' : ''}
            ${item.visibleOnCommand ? '<span class="preview-chip">Command</span>' : ''}
            ${item.visibleInPortal ? '<span class="preview-chip">Portaal</span>' : ''}
          </div>
        </div>
        <div class="button-row">
          <button class="btn btn-secondary" type="button" data-action="edit" data-id="${item.id}">Bewerken</button>
          <button class="btn btn-danger" type="button" data-action="delete" data-id="${item.id}">Verwijderen</button>
        </div>
      </div>
      ${item.notes ? `<p class="small-muted">${escapeHtml(item.notes)}</p>` : ''}
    `;
    elements.moduleList.appendChild(li);
  });

  elements.moduleList.querySelectorAll('[data-action="edit"]').forEach((button) => {
    button.addEventListener('click', () => selectItem(button.dataset.id));
  });
  elements.moduleList.querySelectorAll('[data-action="delete"]').forEach((button) => {
    button.addEventListener('click', () => deleteItem(button.dataset.id));
  });
}

function updateStats() {
  const items = adminData?.items || [];
  const cards = [
    ['Totaal modules', items.length],
    ['Actief', items.filter((item) => item.enabled).length],
    ['Op command', items.filter((item) => item.visibleOnCommand).length],
    ['In opbouw', items.filter((item) => item.status === 'in-opbouw').length]
  ];
  elements.statsGrid.innerHTML = cards
    .map(([label, value]) => `<div class="stat-card"><span>${label}</span><strong>${value}</strong></div>`)
    .join('');
}

function selectItem(id) {
  const item = adminData.items.find((entry) => entry.id === id);
  if (!item) return;
  selectedId = item.id;
  elements.itemId.value = item.id;
  elements.nameInput.value = item.name;
  elements.typeInput.value = item.type;
  elements.departmentInput.value = item.department;
  elements.statusInput.value = item.status;
  elements.urlInput.value = item.url;
  elements.orderInput.value = item.order;
  elements.rolesInput.value = (item.roles || []).join(', ');
  elements.enabledInput.checked = !!item.enabled;
  elements.visibleHomeInput.checked = !!item.visibleOnHome;
  elements.visibleCommandInput.checked = !!item.visibleOnCommand;
  elements.visiblePortalInput.checked = !!item.visibleInPortal;
  elements.notesInput.value = item.notes || '';
  renderPreview(item);
}

function resetForm() {
  selectedId = null;
  elements.moduleForm.reset();
  elements.itemId.value = '';
  if (adminData?.types?.length) elements.typeInput.value = adminData.types[0];
  if (adminData?.departments?.length) elements.departmentInput.value = adminData.departments[0];
  if (adminData?.statuses?.length) elements.statusInput.value = adminData.statuses[0];
  elements.orderInput.value = 100;
  elements.enabledInput.checked = true;
  elements.visibleHomeInput.checked = true;
  elements.visibleCommandInput.checked = true;
  elements.visiblePortalInput.checked = false;
  renderPreview(null);
}

function renderPreview(item) {
  if (!item) {
    elements.previewTitle.textContent = 'Nog geen selectie';
    elements.previewAmount.textContent = 'Selecteer of bewerk een module om hier de preview te zien.';
    elements.previewChips.innerHTML = '';
    elements.previewMeta.innerHTML = '';
    elements.previewNotes.textContent = 'Geen notities beschikbaar.';
    return;
  }

  elements.previewTitle.textContent = item.name;
  elements.previewAmount.textContent = item.url;
  elements.previewChips.innerHTML = [
    item.type,
    item.department,
    item.status,
    item.enabled ? 'actief' : 'uitgeschakeld'
  ].map((value) => `<span class="preview-chip">${escapeHtml(formatLabel(value))}</span>`).join('');

  elements.previewMeta.innerHTML = [
    ['Home', item.visibleOnHome ? 'Ja' : 'Nee'],
    ['Command', item.visibleOnCommand ? 'Ja' : 'Nee'],
    ['Portaal', item.visibleInPortal ? 'Ja' : 'Nee'],
    ['Rollen', (item.roles || []).join(', ') || 'n.v.t.'],
    ['Sorteervolgorde', String(item.order)]
  ].map(([label, value]) => `<li><strong>${label}</strong><br>${escapeHtml(value)}</li>`).join('');

  elements.previewNotes.textContent = item.notes || 'Geen notities beschikbaar.';
}

function handleSubmit(event) {
  event.preventDefault();
  const payload = normalizeItem({
    id: elements.itemId.value || AdminUtils.generateId('module'),
    name: elements.nameInput.value.trim(),
    type: elements.typeInput.value,
    department: elements.departmentInput.value,
    status: elements.statusInput.value,
    url: elements.urlInput.value.trim(),
    order: Number(elements.orderInput.value) || 100,
    roles: AdminUtils.normalizeArray(elements.rolesInput.value),
    enabled: elements.enabledInput.checked,
    visibleOnHome: elements.visibleHomeInput.checked,
    visibleOnCommand: elements.visibleCommandInput.checked,
    visibleInPortal: elements.visiblePortalInput.checked,
    notes: elements.notesInput.value.trim()
  });

  if (!payload.name || !payload.url) {
    AdminUI.showToast('Naam en URL zijn verplicht.', 'danger');
    return;
  }

  const existingIndex = adminData.items.findIndex((item) => item.id === payload.id);
  if (existingIndex >= 0) adminData.items[existingIndex] = payload;
  else adminData.items.push(payload);

  persistData('Module opgeslagen.');
  applyFilters();
  selectItem(payload.id);
}

function deleteItem(id) {
  const item = adminData.items.find((entry) => entry.id === id);
  if (!item) return;
  if (!window.confirm(`Weet je zeker dat je "${item.name}" wil verwijderen?`)) return;
  adminData.items = adminData.items.filter((entry) => entry.id !== id);
  if (selectedId === id) resetForm();
  persistData('Module verwijderd.');
  applyFilters();
}

async function reloadData() {
  adminData = await AdminStore.loadAdminData(ADMIN_CONFIG.storageKey, ADMIN_CONFIG.defaultDataPath);
  adminData.items = Array.isArray(adminData.items) ? adminData.items.map(normalizeItem) : [];
  populateSelects();
  resetForm();
  applyFilters();
  AdminUI.showToast('Moduleconfig herladen.', 'success');
}

function persistData(message) {
  adminData.lastUpdated = new Date().toISOString();
  AdminStore.saveAdminData(ADMIN_CONFIG.storageKey, adminData);
  updateStats();
  AdminUI.showToast(message, 'success');
}

function handleExport() {
  AdminStore.exportAdminData(adminData, ADMIN_CONFIG.exportFilename || 'ems-modules-export.json');
  AdminUI.showToast('Moduleconfig geëxporteerd.', 'success');
}

async function handleImport(event) {
  const [file] = event.target.files || [];
  if (!file) return;
  try {
    const imported = await AdminStore.importAdminData(file);
    imported.items = Array.isArray(imported.items) ? imported.items.map(normalizeItem) : [];
    adminData = {
      version: imported.version || adminData.version,
      statuses: Array.isArray(imported.statuses) && imported.statuses.length ? imported.statuses : adminData.statuses,
      types: Array.isArray(imported.types) && imported.types.length ? imported.types : adminData.types,
      departments: Array.isArray(imported.departments) && imported.departments.length ? imported.departments : adminData.departments,
      items: imported.items
    };
    AdminStore.saveAdminData(ADMIN_CONFIG.storageKey, adminData);
    populateSelects();
    resetForm();
    applyFilters();
    AdminUI.showToast('Moduleconfig geïmporteerd.', 'success');
  } catch (error) {
    AdminUI.showToast(error.message || 'Import van moduleconfig mislukt.', 'danger');
  } finally {
    event.target.value = '';
  }
}

async function handleResetDefaults() {
  if (!window.confirm('Wil je alle lokale modulewijzigingen resetten naar de standaardconfig?')) return;
  adminData = await AdminStore.resetAdminData(ADMIN_CONFIG.storageKey, ADMIN_CONFIG.defaultDataPath);
  adminData.items = Array.isArray(adminData.items) ? adminData.items.map(normalizeItem) : [];
  populateSelects();
  resetForm();
  applyFilters();
  AdminUI.showToast('Moduleconfig werd gereset naar standaard.', 'success');
}

function formatLabel(value) {
  return String(value).replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
