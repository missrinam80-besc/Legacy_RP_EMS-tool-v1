let ADMIN_CONFIG = null;
let adminData = null;
let filteredItems = [];
let selectedId = null;

const elements = {
  statsGrid: document.getElementById('statsGrid'),
  statusMessage: document.getElementById('statusMessage'),
  priceList: document.getElementById('priceList'),
  emptyState: document.getElementById('emptyState'),
  resultCount: document.getElementById('resultCount'),
  searchInput: document.getElementById('searchInput'),
  departmentFilter: document.getElementById('departmentFilter'),
  categoryFilter: document.getElementById('categoryFilter'),
  documentTypeFilter: document.getElementById('documentTypeFilter'),
  visibilityFilter: document.getElementById('visibilityFilter'),
  activeFilter: document.getElementById('activeFilter'),
  newItemBtn: document.getElementById('newItemBtn'),
  exportBtn: document.getElementById('exportBtn'),
  importInput: document.getElementById('importInput'),
  resetDefaultsBtn: document.getElementById('resetDefaultsBtn'),
  reloadBtn: document.getElementById('reloadBtn'),
  priceForm: document.getElementById('priceForm'),
  itemId: document.getElementById('itemId'),
  labelInput: document.getElementById('labelInput'),
  codeInput: document.getElementById('codeInput'),
  departmentInput: document.getElementById('departmentInput'),
  categoryInput: document.getElementById('categoryInput'),
  priceInput: document.getElementById('priceInput'),
  vatInput: document.getElementById('vatInput'),
  currencyInput: document.getElementById('currencyInput'),
  sortOrderInput: document.getElementById('sortOrderInput'),
  documentTypeCheckboxes: document.getElementById('documentTypeCheckboxes'),
  activeInput: document.getElementById('activeInput'),
  visibleCalculatorInput: document.getElementById('visibleCalculatorInput'),
  visibleReportsInput: document.getElementById('visibleReportsInput'),
  notesInput: document.getElementById('notesInput'),
  clearFormBtn: document.getElementById('clearFormBtn'),
  previewTitle: document.getElementById('previewTitle'),
  previewAmount: document.getElementById('previewAmount'),
  previewChips: document.getElementById('previewChips'),
  previewMeta: document.getElementById('previewMeta'),
  previewNotes: document.getElementById('previewNotes')
};

document.addEventListener('DOMContentLoaded', initPage);

async function initPage() {
  try {
    const configResponse = await fetch('config.json', { cache: 'no-store' });
    if (!configResponse.ok) {
      throw new Error(`Config kon niet geladen worden (${configResponse.status}).`);
    }

    ADMIN_CONFIG = await configResponse.json();
    adminData = await AdminStore.loadAdminData(ADMIN_CONFIG.storageKey, ADMIN_CONFIG.defaultDataPath);

    ensureDataShape();
    renderSelectOptions();
    bindEvents();
    applyFilters();
    resetForm();
    AdminUI.showToast('Prijsbeheer geladen. Je werkt nu op de centrale prijsconfig.', 'success');
  } catch (error) {
    console.error(error);
    AdminUI.showToast(`Fout bij laden: ${error.message}`, 'danger');
  }
}

function ensureDataShape() {
  adminData.departments = Array.isArray(adminData.departments) ? adminData.departments : [];
  adminData.categories = Array.isArray(adminData.categories) ? adminData.categories : [];
  adminData.documentTypes = Array.isArray(adminData.documentTypes) ? adminData.documentTypes : [];
  adminData.items = Array.isArray(adminData.items) ? adminData.items : [];
}

function bindEvents() {
  [
    elements.searchInput,
    elements.departmentFilter,
    elements.categoryFilter,
    elements.documentTypeFilter,
    elements.visibilityFilter,
    elements.activeFilter
  ].forEach((element) => element.addEventListener('input', applyFilters));

  elements.newItemBtn.addEventListener('click', () => {
    selectedId = null;
    resetForm();
    AdminUI.showToast('Nieuw prijsitem klaar om in te vullen.', 'info');
  });

  elements.clearFormBtn.addEventListener('click', () => {
    selectedId = null;
    resetForm();
    AdminUI.showToast('Formulier leeggemaakt.', 'info');
  });

  elements.exportBtn.addEventListener('click', () => {
    AdminStore.exportAdminData(adminData, ADMIN_CONFIG.exportFilename || 'ems-prijzen-export.json');
    AdminUI.showToast('Prijsconfig geëxporteerd als JSON.', 'success');
  });

  elements.importInput.addEventListener('change', async (event) => {
    const [file] = event.target.files || [];
    if (!file) return;

    try {
      const imported = await AdminStore.importAdminData(file);
      if (!Array.isArray(imported?.items)) {
        throw new Error('Het JSON-bestand bevat geen geldige items-lijst.');
      }

      adminData = AdminStore.mergeWithDefaults(adminData, imported);
      ensureDataShape();
      persistData();
      renderSelectOptions();
      applyFilters();
      resetForm();
      AdminUI.showToast('Prijsconfig geïmporteerd.', 'success');
    } catch (error) {
      console.error(error);
      AdminUI.showToast(error.message, 'danger');
    } finally {
      event.target.value = '';
    }
  });

  elements.resetDefaultsBtn.addEventListener('click', async () => {
    if (!window.confirm('Wil je de prijsconfig resetten naar de standaardwaarden?')) return;

    try {
      adminData = await AdminStore.resetAdminData(ADMIN_CONFIG.storageKey, ADMIN_CONFIG.defaultDataPath);
      ensureDataShape();
      renderSelectOptions();
      applyFilters();
      resetForm();
      AdminUI.showToast('De standaard prijsconfig is opnieuw geladen.', 'success');
    } catch (error) {
      console.error(error);
      AdminUI.showToast(`Reset mislukt: ${error.message}`, 'danger');
    }
  });

  elements.reloadBtn.addEventListener('click', async () => {
    try {
      adminData = await AdminStore.loadAdminData(ADMIN_CONFIG.storageKey, ADMIN_CONFIG.defaultDataPath);
      ensureDataShape();
      renderSelectOptions();
      applyFilters();
      resetForm();
      AdminUI.showToast('Prijsconfig opnieuw geladen.', 'success');
    } catch (error) {
      console.error(error);
      AdminUI.showToast(`Herladen mislukt: ${error.message}`, 'danger');
    }
  });

  elements.priceForm.addEventListener('submit', handleFormSubmit);
}

function renderSelectOptions() {
  fillSelect(elements.departmentFilter, ['all', ...adminData.departments], 'Alle afdelingen');
  fillSelect(elements.categoryFilter, ['all', ...adminData.categories], 'Alle categorieën');
  fillSelect(elements.documentTypeFilter, ['all', ...adminData.documentTypes], 'Alle documenttypes');
  fillSelect(elements.departmentInput, adminData.departments);
  fillSelect(elements.categoryInput, adminData.categories);
  renderDocumentTypeCheckboxes();
}

function fillSelect(selectElement, values, placeholderLabel = null) {
  selectElement.innerHTML = '';
  values.forEach((value, index) => {
    const option = document.createElement('option');
    option.value = value;
    if (index === 0 && placeholderLabel) {
      option.textContent = placeholderLabel;
    } else {
      option.textContent = humanizeValue(value);
    }
    selectElement.appendChild(option);
  });
}

function renderDocumentTypeCheckboxes() {
  elements.documentTypeCheckboxes.innerHTML = '';
  adminData.documentTypes.forEach((documentType) => {
    const id = `doctype_${documentType}`;
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" value="${documentType}" id="${id}" /> ${humanizeValue(documentType)}`;
    elements.documentTypeCheckboxes.appendChild(label);
  });
}

function applyFilters() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const department = elements.departmentFilter.value;
  const category = elements.categoryFilter.value;
  const documentType = elements.documentTypeFilter.value;
  const visibility = elements.visibilityFilter.value;
  const activeState = elements.activeFilter.value;

  filteredItems = [...adminData.items]
    .filter((item) => {
      const searchable = [item.label, item.code, item.notes, item.department, item.category].join(' ').toLowerCase();
      return !query || searchable.includes(query);
    })
    .filter((item) => department === 'all' || item.department === department)
    .filter((item) => category === 'all' || item.category === category)
    .filter((item) => documentType === 'all' || (item.documentTypes || []).includes(documentType))
    .filter((item) => {
      if (activeState === 'active') return item.active;
      if (activeState === 'inactive') return !item.active;
      return true;
    })
    .filter((item) => {
      if (visibility === 'reports') return !!item.visibleInReports;
      if (visibility === 'calculator') return !!item.visibleInCalculator;
      if (visibility === 'hidden') return !item.visibleInReports && !item.visibleInCalculator;
      return true;
    })
    .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0) || a.label.localeCompare(b.label, 'nl'));

  renderStats();
  renderPriceList();
}

function renderStats() {
  const items = adminData.items;
  const activeCount = items.filter((item) => item.active).length;
  const visibleInCalculator = items.filter((item) => item.visibleInCalculator).length;
  const visibleInReports = items.filter((item) => item.visibleInReports).length;
  const totalValue = items.reduce((sum, item) => sum + (Number(item.defaultPrice) || 0), 0);

  elements.statsGrid.innerHTML = `
    <div class="stat-card"><span>Totaal prijsregels</span><strong>${items.length}</strong></div>
    <div class="stat-card"><span>Actief</span><strong>${activeCount}</strong></div>
    <div class="stat-card"><span>Zichtbaar in calculator</span><strong>${visibleInCalculator}</strong></div>
    <div class="stat-card"><span>Zichtbaar in rapporten</span><strong>${visibleInReports}</strong></div>
    <div class="stat-card"><span>Som van tarieven</span><strong>${AdminUtils.formatCurrency(totalValue)}</strong></div>
  `;
}

function renderPriceList() {
  elements.priceList.innerHTML = '';
  elements.resultCount.textContent = `${filteredItems.length} resultaten`;
  elements.emptyState.hidden = filteredItems.length > 0;

  filteredItems.forEach((item) => {
    const row = document.createElement('li');
    row.className = 'price-card';
    row.innerHTML = `
      <div class="price-card__top">
        <div>
          <h3>${escapeHtml(item.label)}</h3>
          <div class="price-card__meta">
            <span class="meta-chip">${escapeHtml(item.code)}</span>
            <span class="meta-chip">${humanizeValue(item.department)}</span>
            <span class="meta-chip">${humanizeValue(item.category)}</span>
          </div>
        </div>
        <div class="price-amount">${AdminUtils.formatCurrency(item.defaultPrice, item.currency || 'EUR')}</div>
      </div>
      <div class="price-card__badges">
        ${item.active ? AdminUI.renderStatusBadge('Actief', 'success') : AdminUI.renderStatusBadge('Inactief', 'danger')}
        ${item.visibleInCalculator ? AdminUI.renderStatusBadge('Calculator', 'info') : ''}
        ${item.visibleInReports ? AdminUI.renderStatusBadge('Rapporten', 'warning') : ''}
      </div>
      <div class="price-card__bottom">
        <small class="small-muted">${escapeHtml(item.notes || 'Geen extra nota')}</small>
        <div class="button-row">
          <button class="btn btn-secondary" type="button" data-action="edit" data-id="${item.id}">Bewerk</button>
          <button class="btn btn-secondary" type="button" data-action="delete" data-id="${item.id}">Verwijder</button>
        </div>
      </div>
    `;

    row.querySelector('[data-action="edit"]').addEventListener('click', () => selectItem(item.id));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => deleteItem(item.id));
    elements.priceList.appendChild(row);
  });
}

function selectItem(itemId) {
  const item = adminData.items.find((entry) => entry.id === itemId);
  if (!item) return;

  selectedId = item.id;
  elements.itemId.value = item.id;
  elements.labelInput.value = item.label || '';
  elements.codeInput.value = item.code || '';
  elements.departmentInput.value = item.department || adminData.departments[0] || '';
  elements.categoryInput.value = item.category || adminData.categories[0] || '';
  elements.priceInput.value = Number(item.defaultPrice) || 0;
  elements.vatInput.value = item.vatMode || 'none';
  elements.currencyInput.value = item.currency || 'EUR';
  elements.sortOrderInput.value = Number(item.sortOrder) || 100;
  elements.activeInput.checked = !!item.active;
  elements.visibleCalculatorInput.checked = !!item.visibleInCalculator;
  elements.visibleReportsInput.checked = !!item.visibleInReports;
  elements.notesInput.value = item.notes || '';

  const selectedDocumentTypes = new Set(item.documentTypes || []);
  elements.documentTypeCheckboxes.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.checked = selectedDocumentTypes.has(checkbox.value);
  });

  renderPreview(item);
  AdminUI.showToast(`Prijsregel "${item.label}" geladen in de editor.`, 'info');
}

function resetForm() {
  selectedId = null;
  elements.priceForm.reset();
  elements.itemId.value = '';
  elements.currencyInput.value = 'EUR';
  elements.sortOrderInput.value = 100;
  elements.activeInput.checked = true;
  elements.visibleCalculatorInput.checked = true;
  elements.visibleReportsInput.checked = true;
  if (adminData?.departments?.length) elements.departmentInput.value = adminData.departments[0];
  if (adminData?.categories?.length) elements.categoryInput.value = adminData.categories[0];
  elements.documentTypeCheckboxes.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.checked = false;
  });
  renderPreview(null);
}

function handleFormSubmit(event) {
  event.preventDefault();

  const label = elements.labelInput.value.trim();
  const code = elements.codeInput.value.trim();
  if (!label || !code) {
    AdminUI.showToast('Label en code zijn verplicht.', 'warning');
    return;
  }

  const checkedDocumentTypes = Array.from(elements.documentTypeCheckboxes.querySelectorAll('input[type="checkbox"]:checked')).map((checkbox) => checkbox.value);
  const entry = {
    id: selectedId || AdminUtils.generateId('price'),
    code,
    label,
    department: elements.departmentInput.value,
    category: elements.categoryInput.value,
    documentTypes: checkedDocumentTypes,
    defaultPrice: Number(elements.priceInput.value) || 0,
    currency: elements.currencyInput.value.trim().toUpperCase() || 'EUR',
    vatMode: elements.vatInput.value,
    active: elements.activeInput.checked,
    visibleInCalculator: elements.visibleCalculatorInput.checked,
    visibleInReports: elements.visibleReportsInput.checked,
    sortOrder: Number(elements.sortOrderInput.value) || 100,
    notes: elements.notesInput.value.trim()
  };

  if (selectedId) {
    adminData.items = adminData.items.map((item) => (item.id === selectedId ? entry : item));
    AdminUI.showToast('Prijsregel bijgewerkt.', 'success');
  } else {
    adminData.items.push(entry);
    AdminUI.showToast('Nieuwe prijsregel toegevoegd.', 'success');
  }

  syncOptionLists(entry);
  persistData();
  applyFilters();
  selectItem(entry.id);
}

function syncOptionLists(entry) {
  if (!adminData.departments.includes(entry.department)) {
    adminData.departments.push(entry.department);
  }
  if (!adminData.categories.includes(entry.category)) {
    adminData.categories.push(entry.category);
  }
  entry.documentTypes.forEach((documentType) => {
    if (!adminData.documentTypes.includes(documentType)) {
      adminData.documentTypes.push(documentType);
    }
  });
  renderSelectOptions();
}

function deleteItem(itemId) {
  const item = adminData.items.find((entry) => entry.id === itemId);
  if (!item) return;
  if (!window.confirm(`Prijsregel "${item.label}" verwijderen?`)) return;

  adminData.items = adminData.items.filter((entry) => entry.id !== itemId);
  persistData();
  applyFilters();
  if (selectedId === itemId) resetForm();
  AdminUI.showToast('Prijsregel verwijderd.', 'success');
}

function persistData() {
  adminData.lastUpdated = new Date().toISOString().slice(0, 10);
  AdminStore.saveAdminData(ADMIN_CONFIG.storageKey, adminData);
}

function renderPreview(item) {
  if (!item) {
    elements.previewTitle.textContent = 'Nog geen selectie';
    elements.previewAmount.textContent = AdminUtils.formatCurrency(0);
    elements.previewChips.innerHTML = '';
    elements.previewMeta.innerHTML = '';
    elements.previewNotes.textContent = 'Selecteer of bewerk een prijsregel om hier de preview te zien.';
    return;
  }

  elements.previewTitle.textContent = item.label;
  elements.previewAmount.textContent = AdminUtils.formatCurrency(item.defaultPrice, item.currency || 'EUR');
  elements.previewChips.innerHTML = [
    `<span class="preview-chip">${escapeHtml(item.code)}</span>`,
    `<span class="preview-chip">${humanizeValue(item.department)}</span>`,
    `<span class="preview-chip">${humanizeValue(item.category)}</span>`,
    `<span class="preview-chip">${item.active ? 'Actief' : 'Inactief'}</span>`
  ].join('');

  elements.previewMeta.innerHTML = `
    <li><strong>Calculator:</strong> ${item.visibleInCalculator ? 'ja' : 'nee'}</li>
    <li><strong>Rapporten:</strong> ${item.visibleInReports ? 'ja' : 'nee'}</li>
    <li><strong>BTW-modus:</strong> ${humanizeValue(item.vatMode)}</li>
    <li><strong>Documenttypes:</strong> ${(item.documentTypes || []).map(humanizeValue).join(', ') || 'geen'}</li>
  `;
  elements.previewNotes.textContent = item.notes || 'Geen extra notitie voor deze prijsregel.';
}

function humanizeValue(value) {
  return String(value || '')
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
