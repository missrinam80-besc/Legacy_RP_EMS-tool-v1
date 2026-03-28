let ADMIN_CONFIG = null;
let adminData = null;
let filteredItems = [];
let selectedId = null;

const elements = {
  statsGrid: document.getElementById('statsGrid'),
  statusMessage: document.getElementById('statusMessage'),
  itemList: document.getElementById('itemList'),
  emptyState: document.getElementById('emptyState'),
  resultCount: document.getElementById('resultCount'),
  searchInput: document.getElementById('searchInput'),
  typeFilter: document.getElementById('typeFilter'),
  categoryFilter: document.getElementById('categoryFilter'),
  departmentFilter: document.getElementById('departmentFilter'),
  routeFilter: document.getElementById('routeFilter'),
  activeFilter: document.getElementById('activeFilter'),
  newItemBtn: document.getElementById('newItemBtn'),
  exportBtn: document.getElementById('exportBtn'),
  importInput: document.getElementById('importInput'),
  resetDefaultsBtn: document.getElementById('resetDefaultsBtn'),
  reloadBtn: document.getElementById('reloadBtn'),
  itemForm: document.getElementById('itemForm'),
  itemId: document.getElementById('itemId'),
  nameInput: document.getElementById('nameInput'),
  typeInput: document.getElementById('typeInput'),
  categoryInput: document.getElementById('categoryInput'),
  dosageInput: document.getElementById('dosageInput'),
  routeInput: document.getElementById('routeInput'),
  priceInput: document.getElementById('priceInput'),
  indicationInput: document.getElementById('indicationInput'),
  contraInput: document.getElementById('contraInput'),
  departmentCheckboxes: document.getElementById('departmentCheckboxes'),
  warningsInput: document.getElementById('warningsInput'),
  activeInput: document.getElementById('activeInput'),
  notesInput: document.getElementById('notesInput'),
  clearFormBtn: document.getElementById('clearFormBtn'),
  previewTitle: document.getElementById('previewTitle'),
  previewPrice: document.getElementById('previewPrice'),
  previewChips: document.getElementById('previewChips'),
  previewMeta: document.getElementById('previewMeta'),
  previewWarnings: document.getElementById('previewWarnings')
};

init();

async function init() {
  try {
    ADMIN_CONFIG = await AdminStore.fetchJson('config.json');
    adminData = await AdminStore.loadAdminData(ADMIN_CONFIG.storageKey, ADMIN_CONFIG.defaultDataPath);
    normalizeData();
    populateFilters();
    renderDepartmentCheckboxes();
    bindEvents();
    applyFilters();
    resetForm();
    AdminUI.showToast('Medicatiebeheer geladen.', 'success');
  } catch (error) {
    console.error(error);
    AdminUI.showToast(`Fout bij laden: ${error.message}`, 'danger');
  }
}

function normalizeData() {
  adminData.types = uniqueSorted(adminData.types || []);
  adminData.routes = uniqueSorted(adminData.routes || []);
  adminData.departments = uniqueSorted(adminData.departments || []);
  adminData.items = Array.isArray(adminData.items) ? adminData.items.map(normalizeItem) : [];
}

function normalizeItem(item) {
  return {
    id: item.id || AdminUtils.generateId('med'),
    name: item.name || '',
    type: item.type || adminData.types[0] || 'medicatie',
    category: item.category || '',
    dosage: item.dosage || '',
    route: item.route || adminData.routes[0] || 'n.v.t.',
    indication: item.indication || '',
    contraNote: item.contraNote || '',
    price: Number(item.price) || 0,
    departments: uniqueSorted(AdminUtils.normalizeArray(item.departments)),
    active: Boolean(item.active),
    warnings: AdminUtils.normalizeArray(item.warnings),
    notes: item.notes || ''
  };
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'nl'));
}

function bindEvents() {
  [
    elements.searchInput,
    elements.typeFilter,
    elements.categoryFilter,
    elements.departmentFilter,
    elements.routeFilter,
    elements.activeFilter
  ].forEach((element) => element.addEventListener('input', applyFilters));

  elements.newItemBtn.addEventListener('click', resetForm);
  elements.clearFormBtn.addEventListener('click', resetForm);
  elements.exportBtn.addEventListener('click', exportData);
  elements.importInput.addEventListener('change', importData);
  elements.resetDefaultsBtn.addEventListener('click', resetToDefaults);
  elements.reloadBtn.addEventListener('click', reloadData);
  elements.itemForm.addEventListener('submit', handleSubmit);
}

function populateFilters() {
  fillSelect(elements.typeFilter, ['all', ...adminData.types], 'Alle types');
  fillSelect(elements.routeFilter, ['all', ...adminData.routes], 'Alle routes');
  fillSelect(elements.departmentFilter, ['all', ...adminData.departments], 'Alle afdelingen');
  fillSelect(elements.typeInput, adminData.types, null);
  fillSelect(elements.routeInput, adminData.routes, null);
  populateCategoryFilter();
}

function populateCategoryFilter() {
  const categories = uniqueSorted(adminData.items.map((item) => item.category));
  fillSelect(elements.categoryFilter, ['all', ...categories], 'Alle categorieën');
}

function fillSelect(selectElement, values, placeholderLabel = null) {
  if (!selectElement) return;
  selectElement.innerHTML = '';
  values.forEach((value, index) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = index === 0 && placeholderLabel ? placeholderLabel : humanizeValue(value);
    selectElement.appendChild(option);
  });
}

function renderDepartmentCheckboxes() {
  elements.departmentCheckboxes.innerHTML = '';
  adminData.departments.forEach((department) => {
    const id = `department_${department}`;
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" value="${department}" id="${id}" /> ${humanizeValue(department)}`;
    elements.departmentCheckboxes.appendChild(label);
  });
}

function applyFilters() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const selectedType = elements.typeFilter.value;
  const selectedCategory = elements.categoryFilter.value;
  const selectedDepartment = elements.departmentFilter.value;
  const selectedRoute = elements.routeFilter.value;
  const activeState = elements.activeFilter.value;

  filteredItems = [...adminData.items]
    .filter((item) => {
      const searchable = [
        item.name,
        item.type,
        item.category,
        item.dosage,
        item.route,
        item.indication,
        item.contraNote,
        item.notes,
        (item.warnings || []).join(' '),
        (item.departments || []).join(' ')
      ].join(' ').toLowerCase();
      return !query || searchable.includes(query);
    })
    .filter((item) => selectedType === 'all' || item.type === selectedType)
    .filter((item) => selectedCategory === 'all' || item.category === selectedCategory)
    .filter((item) => selectedDepartment === 'all' || item.departments.includes(selectedDepartment))
    .filter((item) => selectedRoute === 'all' || item.route === selectedRoute)
    .filter((item) => {
      if (activeState === 'active') return item.active;
      if (activeState === 'inactive') return !item.active;
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'nl'));

  renderStats();
  renderItemList();
}

function renderStats() {
  const items = adminData.items;
  const activeCount = items.filter((item) => item.active).length;
  const medicationCount = items.filter((item) => item.type === 'medicatie').length;
  const toolsCount = items.filter((item) => item.type === 'hulpmiddel').length;
  const coveredDepartments = new Set(items.flatMap((item) => item.departments || [])).size;
  const totalValue = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  elements.statsGrid.innerHTML = `
    <div class="stat-card"><span>Totaal items</span><strong>${items.length}</strong></div>
    <div class="stat-card"><span>Actief</span><strong>${activeCount}</strong></div>
    <div class="stat-card"><span>Medicatie</span><strong>${medicationCount}</strong></div>
    <div class="stat-card"><span>Hulpmiddelen</span><strong>${toolsCount}</strong></div>
    <div class="stat-card"><span>Afdelingen gedekt</span><strong>${coveredDepartments}</strong></div>
    <div class="stat-card"><span>Som van prijzen</span><strong>${AdminUtils.formatCurrency(totalValue)}</strong></div>
  `;
}

function renderItemList() {
  elements.itemList.innerHTML = '';
  elements.resultCount.textContent = `${filteredItems.length} resultaten`;
  elements.emptyState.hidden = filteredItems.length > 0;

  filteredItems.forEach((item) => {
    const row = document.createElement('li');
    row.className = 'price-card';
    row.innerHTML = `
      <div class="price-card__top">
        <div>
          <h3>${escapeHtml(item.name)}</h3>
          <div class="price-card__meta">
            <span class="meta-chip">${humanizeValue(item.type)}</span>
            <span class="meta-chip">${escapeHtml(item.category)}</span>
            <span class="meta-chip">${humanizeValue(item.route)}</span>
          </div>
        </div>
        <div class="price-amount">${AdminUtils.formatCurrency(item.price || 0)}</div>
      </div>
      <div class="price-card__badges">
        ${item.active ? AdminUI.renderStatusBadge('Actief', 'success') : AdminUI.renderStatusBadge('Inactief', 'danger')}
        ${(item.departments || []).slice(0, 3).map((department) => AdminUI.renderStatusBadge(humanizeValue(department), 'info')).join('')}
        ${(item.warnings || []).length ? AdminUI.renderStatusBadge(`${item.warnings.length} waarschuwingen`, 'warning') : ''}
      </div>
      <div class="price-card__bottom">
        <small class="small-muted">${escapeHtml(item.indication || 'Geen indicatie ingevuld')}</small>
        <div class="button-row">
          <button class="btn btn-secondary" type="button" data-action="edit" data-id="${item.id}">Bewerk</button>
          <button class="btn btn-secondary" type="button" data-action="delete" data-id="${item.id}">Verwijder</button>
        </div>
      </div>
    `;

    row.querySelector('[data-action="edit"]').addEventListener('click', () => selectItem(item.id));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => deleteItem(item.id));
    elements.itemList.appendChild(row);
  });
}

function selectItem(id) {
  const item = adminData.items.find((entry) => entry.id === id);
  if (!item) return;
  selectedId = item.id;

  elements.itemId.value = item.id;
  elements.nameInput.value = item.name;
  elements.typeInput.value = item.type;
  elements.categoryInput.value = item.category;
  elements.dosageInput.value = item.dosage;
  elements.routeInput.value = item.route;
  elements.priceInput.value = item.price;
  elements.indicationInput.value = item.indication;
  elements.contraInput.value = item.contraNote;
  elements.warningsInput.value = (item.warnings || []).join(', ');
  elements.activeInput.checked = !!item.active;
  elements.notesInput.value = item.notes;

  const selectedDepartments = new Set(item.departments || []);
  elements.departmentCheckboxes.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.checked = selectedDepartments.has(checkbox.value);
  });

  renderPreview(item);
}

function resetForm() {
  selectedId = null;
  elements.itemForm.reset();
  elements.itemId.value = '';
  if (adminData?.types?.length) elements.typeInput.value = adminData.types[0];
  if (adminData?.routes?.length) elements.routeInput.value = adminData.routes.includes('n.v.t.') ? 'n.v.t.' : adminData.routes[0];
  elements.priceInput.value = 0;
  elements.activeInput.checked = true;
  elements.departmentCheckboxes.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.checked = false;
  });
  renderPreview(null);
}

function handleSubmit(event) {
  event.preventDefault();

  const payload = normalizeItem({
    id: elements.itemId.value || AdminUtils.generateId('med'),
    name: elements.nameInput.value.trim(),
    type: elements.typeInput.value,
    category: elements.categoryInput.value.trim(),
    dosage: elements.dosageInput.value.trim(),
    route: elements.routeInput.value,
    price: Number(elements.priceInput.value) || 0,
    indication: elements.indicationInput.value.trim(),
    contraNote: elements.contraInput.value.trim(),
    departments: Array.from(elements.departmentCheckboxes.querySelectorAll('input:checked')).map((input) => input.value),
    warnings: AdminUtils.normalizeArray(elements.warningsInput.value),
    active: elements.activeInput.checked,
    notes: elements.notesInput.value.trim()
  });

  if (!payload.name || !payload.category) {
    AdminUI.showToast('Naam en categorie zijn verplicht.', 'danger');
    return;
  }

  const existingIndex = adminData.items.findIndex((item) => item.id === payload.id);
  if (existingIndex >= 0) {
    adminData.items[existingIndex] = payload;
  } else {
    adminData.items.push(payload);
  }

  persistData('Medicatie-item opgeslagen.');
  populateCategoryFilter();
  applyFilters();
  selectItem(payload.id);
}

function deleteItem(id) {
  const item = adminData.items.find((entry) => entry.id === id);
  if (!item) return;

  const confirmed = window.confirm(`Wil je "${item.name}" verwijderen?`);
  if (!confirmed) return;

  adminData.items = adminData.items.filter((entry) => entry.id !== id);
  persistData('Medicatie-item verwijderd.');
  populateCategoryFilter();
  applyFilters();

  if (selectedId === id) {
    resetForm();
  }
}

function persistData(successMessage) {
  adminData.lastUpdated = new Date().toISOString();
  AdminStore.saveAdminData(ADMIN_CONFIG.storageKey, adminData);
  AdminUI.showToast(successMessage, 'success');
}

async function reloadData() {
  try {
    adminData = await AdminStore.loadAdminData(ADMIN_CONFIG.storageKey, ADMIN_CONFIG.defaultDataPath);
    normalizeData();
    populateFilters();
    renderDepartmentCheckboxes();
    applyFilters();
    resetForm();
    AdminUI.showToast('Medicatieconfig opnieuw geladen.', 'success');
  } catch (error) {
    AdminUI.showToast(`Herladen mislukt: ${error.message}`, 'danger');
  }
}

async function resetToDefaults() {
  const confirmed = window.confirm('Wil je de volledige medicatielijst resetten naar de standaardconfiguratie?');
  if (!confirmed) return;

  try {
    adminData = await AdminStore.resetAdminData(ADMIN_CONFIG.storageKey, ADMIN_CONFIG.defaultDataPath);
    normalizeData();
    populateFilters();
    renderDepartmentCheckboxes();
    applyFilters();
    resetForm();
    AdminUI.showToast('Medicatieconfig teruggezet naar standaard.', 'success');
  } catch (error) {
    AdminUI.showToast(`Reset mislukt: ${error.message}`, 'danger');
  }
}

function exportData() {
  adminData.lastUpdated = new Date().toISOString();
  AdminStore.exportAdminData(adminData, ADMIN_CONFIG.exportFilename || 'ems-medicatie-export.json');
  AdminUI.showToast('Medicatieconfig geëxporteerd.', 'success');
}

async function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const importedData = await AdminStore.importAdminData(file);
    adminData = {
      ...adminData,
      ...importedData,
      items: Array.isArray(importedData.items) ? importedData.items.map(normalizeItem) : adminData.items
    };
    normalizeData();
    AdminStore.saveAdminData(ADMIN_CONFIG.storageKey, adminData);
    populateFilters();
    renderDepartmentCheckboxes();
    applyFilters();
    resetForm();
    AdminUI.showToast('Medicatieconfig geïmporteerd.', 'success');
  } catch (error) {
    AdminUI.showToast(`Import mislukt: ${error.message}`, 'danger');
  } finally {
    elements.importInput.value = '';
  }
}

function renderPreview(item) {
  if (!item) {
    elements.previewTitle.textContent = 'Nog geen selectie';
    elements.previewPrice.textContent = AdminUtils.formatCurrency(0);
    elements.previewChips.innerHTML = '';
    elements.previewMeta.innerHTML = '';
    elements.previewWarnings.textContent = 'Selecteer of bewerk een item om hier de preview te zien.';
    return;
  }

  elements.previewTitle.textContent = item.name;
  elements.previewPrice.textContent = AdminUtils.formatCurrency(item.price || 0);
  elements.previewChips.innerHTML = [
    `<span class="preview-chip">${humanizeValue(item.type)}</span>`,
    `<span class="preview-chip">${escapeHtml(item.category)}</span>`,
    `<span class="preview-chip">${humanizeValue(item.route)}</span>`,
    item.active ? `<span class="preview-chip">Actief</span>` : `<span class="preview-chip">Inactief</span>`
  ].join('');

  elements.previewMeta.innerHTML = `
    <li><strong>Afdelingen</strong><br>${(item.departments || []).length ? item.departments.map(humanizeValue).join(', ') : 'Geen afdelingen gekozen'}</li>
    <li><strong>Indicatie</strong><br>${escapeHtml(item.indication || 'Geen indicatie ingevuld')}</li>
    <li><strong>Dosering / gebruik</strong><br>${escapeHtml(item.dosage || 'Niet ingevuld')}</li>
    <li><strong>Contra-opmerking</strong><br>${escapeHtml(item.contraNote || 'Geen waarschuwing ingevuld')}</li>
  `;

  const warnings = (item.warnings || []).length ? item.warnings.join(' • ') : 'Geen extra waarschuwingen.';
  elements.previewWarnings.textContent = `Waarschuwingen: ${warnings}${item.notes ? ` — Nota: ${item.notes}` : ''}`;
}

function humanizeValue(value = '') {
  return String(value).replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
