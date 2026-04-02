(function () {
  const ACTOR = 'beheer_prijzen_ui';

  const state = {
    originalRows: [],
    rows: [],
    filteredRows: [],
    loading: false,
    saving: false,
    search: '',
    filters: {
      department: '',
      category: '',
      active: 'all'
    }
  };

  const els = {
    form: document.getElementById('prices-form'),
    search: document.getElementById('prices-search'),
    departmentFilter: document.getElementById('price-department-filter'),
    categoryFilter: document.getElementById('price-category-filter'),
    activeFilter: document.getElementById('price-active-filter'),
    status: document.getElementById('prices-status'),
    tableWrap: document.getElementById('prices-table-wrap'),
    refreshBtn: document.getElementById('refresh-prices-btn'),
    resetBtn: document.getElementById('reset-prices-btn'),
    saveBtn: document.getElementById('save-prices-btn')
  };

  const DEPARTMENT_OPTIONS = ['general', 'command', 'spoed', 'ambulance', 'chirurgie', 'psychologie', 'ortho', 'forensisch', 'labo'];
  const CATEGORY_OPTIONS = ['consult', 'treatment', 'medication', 'surgery', 'admission', 'document', 'transport', 'equipment', 'other'];
  const CURRENCY_OPTIONS = ['EUR'];
  const VAT_OPTIONS = ['excl', 'incl', 'vrijgesteld'];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizeString(value) {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function toPipeString(value) {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean).join('|');
    }

    return String(value ?? '')
      .split('|')
      .map((item) => item.trim())
      .filter(Boolean)
      .join('|');
  }

  function toBoolean(value) {
    if (value === true || value === false) return value;
    return String(value).toLowerCase() === 'true';
  }

  function toNumber(value, fallback = 0) {
    const num = Number(String(value).replace(',', '.'));
    return Number.isFinite(num) ? num : fallback;
  }

  function normalizeRow(row) {
    return {
      id: String(row.id ?? '').trim(),
      code: String(row.code ?? '').trim().toUpperCase(),
      label: String(row.label ?? '').trim(),
      department: String(row.department ?? '').trim(),
      category: String(row.category ?? '').trim(),
      documentTypes: toPipeString(row.documentTypes),
      defaultPrice: toNumber(row.defaultPrice, 0),
      currency: String(row.currency ?? 'EUR').trim().toUpperCase(),
      vatMode: String(row.vatMode ?? 'excl').trim(),
      active: toBoolean(row.active),
      visibleInCalculator: toBoolean(row.visibleInCalculator),
      visibleInReports: toBoolean(row.visibleInReports),
      sortOrder: toNumber(row.sortOrder, 9999),
      notes: String(row.notes ?? '').trim()
    };
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

  function buildSelectOptions(options, selectedValue, allowEmpty = true) {
    const selected = String(selectedValue ?? '');
    const parts = [];

    if (allowEmpty) {
      parts.push('<option value="">-</option>');
    }

    options.forEach((option) => {
      parts.push(
        `<option value="${escapeHtml(option)}"${option === selected ? ' selected' : ''}>${escapeHtml(option)}</option>`
      );
    });

    return parts.join('');
  }

  function getNextSortOrder() {
    if (!state.rows.length) return 10;
    const max = Math.max(...state.rows.map((row) => Number(row.sortOrder) || 0));
    return max + 10;
  }

  function getRowSearchText(row) {
    return normalizeString([
      row.id,
      row.code,
      row.label,
      row.department,
      row.category,
      row.documentTypes,
      row.currency,
      row.vatMode,
      row.notes
    ].join(' '));
  }

  function rowMatchesFilters(row) {
    if (state.filters.department && row.department !== state.filters.department) return false;
    if (state.filters.category && row.category !== state.filters.category) return false;

    if (state.filters.active === 'active' && !row.active) return false;
    if (state.filters.active === 'inactive' && row.active) return false;

    if (state.search && !getRowSearchText(row).includes(normalizeString(state.search))) return false;

    return true;
  }

  function applyFilter() {
    state.filteredRows = state.rows.filter(rowMatchesFilters);
    renderTable();
  }

  function renderFilterOptions() {
    if (els.departmentFilter) {
      els.departmentFilter.innerHTML = '<option value="">Alle afdelingen</option>' +
        DEPARTMENT_OPTIONS.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('');
    }

    if (els.categoryFilter) {
      els.categoryFilter.innerHTML = '<option value="">Alle categorieën</option>' +
        CATEGORY_OPTIONS.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('');
    }

    if (els.activeFilter) {
      els.activeFilter.innerHTML = `
        <option value="all">Alles</option>
        <option value="active">Enkel actief</option>
        <option value="inactive">Enkel inactief</option>
      `;
    }
  }

  function renderTable() {
    if (!els.tableWrap) return;

    if (!state.filteredRows.length) {
      els.tableWrap.innerHTML = '<div class="status-box status-info">Geen prijsregels gevonden.</div>';
      return;
    }

    const rowsHtml = state.filteredRows.map((row) => {
      const absoluteIndex = state.rows.findIndex((item) => item.id === row.id);

      return `
        <tr data-row-index="${absoluteIndex}">
          <td><input type="checkbox" data-field="active" ${row.active ? 'checked' : ''}></td>
          <td><input type="text" data-field="id" value="${escapeHtml(row.id)}"></td>
          <td><input type="text" data-field="code" value="${escapeHtml(row.code)}"></td>
          <td><input type="text" data-field="label" value="${escapeHtml(row.label)}"></td>
          <td><select data-field="department">${buildSelectOptions(DEPARTMENT_OPTIONS, row.department, true)}</select></td>
          <td><select data-field="category">${buildSelectOptions(CATEGORY_OPTIONS, row.category, false)}</select></td>
          <td><input type="text" data-field="documentTypes" value="${escapeHtml(row.documentTypes)}"></td>
          <td><input type="number" step="0.01" data-field="defaultPrice" value="${escapeHtml(row.defaultPrice)}"></td>
          <td><select data-field="currency">${buildSelectOptions(CURRENCY_OPTIONS, row.currency, false)}</select></td>
          <td><select data-field="vatMode">${buildSelectOptions(VAT_OPTIONS, row.vatMode, false)}</select></td>
          <td><input type="checkbox" data-field="visibleInCalculator" ${row.visibleInCalculator ? 'checked' : ''}></td>
          <td><input type="checkbox" data-field="visibleInReports" ${row.visibleInReports ? 'checked' : ''}></td>
          <td><input type="number" data-field="sortOrder" value="${escapeHtml(row.sortOrder)}"></td>
          <td><textarea data-field="notes" rows="2">${escapeHtml(row.notes)}</textarea></td>
          <td>
            <div class="table-actions">
              <button type="button" class="btn-small" data-action="move-up">↑</button>
              <button type="button" class="btn-small" data-action="move-down">↓</button>
              <button type="button" class="btn-small btn-danger" data-action="delete-row">Verwijder</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    els.tableWrap.innerHTML = `
      <div class="table-toolbar">
        <button type="button" id="add-price-row-btn">Nieuwe prijsregel</button>
        <span>${state.filteredRows.length} prijsregels zichtbaar</span>
      </div>
      <div class="table-responsive">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Actief</th>
              <th>ID</th>
              <th>Code</th>
              <th>Label</th>
              <th>Afdeling</th>
              <th>Categorie</th>
              <th>Documenttypes</th>
              <th>Prijs</th>
              <th>Munt</th>
              <th>BTW</th>
              <th>Calc</th>
              <th>Rapport</th>
              <th>Volgorde</th>
              <th>Notities</th>
              <th>Acties</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;

    const addBtn = document.getElementById('add-price-row-btn');
    if (addBtn) {
      addBtn.addEventListener('click', addEmptyRow);
    }
  }

  function addEmptyRow() {
    state.rows.push(normalizeRow({
      id: '',
      code: '',
      label: '',
      department: 'general',
      category: 'treatment',
      documentTypes: 'kostencalculator',
      defaultPrice: 0,
      currency: 'EUR',
      vatMode: 'excl',
      active: true,
      visibleInCalculator: true,
      visibleInReports: true,
      sortOrder: getNextSortOrder(),
      notes: ''
    }));

    applyFilter();
    setStatus('Nieuwe lege prijsregel toegevoegd.', 'info');
  }

  function deleteRow(index) {
    if (index < 0 || index >= state.rows.length) return;
    state.rows.splice(index, 1);
    applyFilter();
    setStatus('Prijsregel verwijderd uit de huidige bewerking.', 'warning');
  }

  function moveRow(index, direction) {
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || index >= state.rows.length || targetIndex >= state.rows.length) {
      return;
    }

    const temp = state.rows[index];
    state.rows[index] = state.rows[targetIndex];
    state.rows[targetIndex] = temp;

    state.rows.forEach((row, rowIndex) => {
      row.sortOrder = (rowIndex + 1) * 10;
    });

    applyFilter();
  }

  function syncTableToState() {
    const rows = Array.from(els.tableWrap.querySelectorAll('tbody tr'));

    rows.forEach((tr) => {
      const index = Number(tr.dataset.rowIndex);
      const row = state.rows[index];
      if (!row) return;

      tr.querySelectorAll('[data-field]').forEach((fieldEl) => {
        const field = fieldEl.dataset.field;
        let value = fieldEl.type === 'checkbox' ? fieldEl.checked : fieldEl.value;

        if (['active', 'visibleInCalculator', 'visibleInReports'].includes(field)) {
          row[field] = !!value;
        } else if (['defaultPrice', 'sortOrder'].includes(field)) {
          row[field] = toNumber(value, field === 'defaultPrice' ? 0 : 9999);
        } else if (field === 'documentTypes') {
          row[field] = toPipeString(value);
        } else {
          row[field] = String(value ?? '').trim();
        }
      });
    });
  }

  function validateRows(rows) {
    const ids = new Set();
    const codes = new Set();

    rows.forEach((row, index) => {
      const rowLabel = `rij ${index + 1}`;

      if (!row.id) throw new Error(`Prijsregel ${rowLabel}: id ontbreekt.`);
      if (!row.code) throw new Error(`Prijsregel ${rowLabel}: code ontbreekt.`);
      if (!row.label) throw new Error(`Prijsregel ${rowLabel}: label ontbreekt.`);
      if (!row.category) throw new Error(`Prijsregel ${rowLabel}: category ontbreekt.`);

      if (ids.has(row.id)) throw new Error(`Dubbele prijs-id gevonden: ${row.id}`);
      if (codes.has(row.code)) throw new Error(`Dubbele prijscode gevonden: ${row.code}`);

      ids.add(row.id);
      codes.add(row.code);
    });
  }

  async function loadPrices() {
    setLoading(true);
    setStatus('Prijsregels laden...', 'info');

    try {
      const loadedRows = await window.EMSAdminStore.get('prices', { forceRefresh: true });
      const rows = Array.isArray(loadedRows) ? loadedRows : [];
      state.originalRows = rows.map(normalizeRow);
      state.rows = clone(state.originalRows);
      applyFilter();
      setStatus(`Prijsregels geladen: ${state.rows.length}`, 'success');
    } catch (error) {
      console.error(error);
      setStatus(`Fout bij laden van prijsregels: ${error.message}`, 'danger');
    } finally {
      setLoading(false);
    }
  }

  function resetPrices() {
    state.rows = clone(state.originalRows);
    applyFilter();
    setStatus('Wijzigingen teruggezet naar laatst geladen data.', 'info');
  }

  async function savePrices() {
    syncTableToState();

    const cleanedRows = state.rows.map(normalizeRow);
    validateRows(cleanedRows);

    setSaving(true);
    setStatus('Prijsregels opslaan...', 'info');

    try {
      await window.EMSAdminStore.save('prices', cleanedRows, ACTOR);
      state.originalRows = clone(cleanedRows);
      state.rows = clone(cleanedRows);
      applyFilter();
      setStatus('Prijsregels succesvol opgeslagen.', 'success');
    } catch (error) {
      console.error(error);
      setStatus(`Fout bij opslaan van prijsregels: ${error.message}`, 'danger');
    } finally {
      setSaving(false);
    }
  }

  function handleTableClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const tr = button.closest('tr');
    if (!tr) return;

    syncTableToState();

    const index = Number(tr.dataset.rowIndex);
    const action = button.dataset.action;

    if (action === 'delete-row') {
      deleteRow(index);
    } else if (action === 'move-up') {
      moveRow(index, -1);
    } else if (action === 'move-down') {
      moveRow(index, 1);
    }
  }

  function bindEvents() {
    if (els.search) {
      els.search.addEventListener('input', () => {
        syncTableToState();
        state.search = els.search.value;
        applyFilter();
      });
    }

    if (els.departmentFilter) {
      els.departmentFilter.addEventListener('change', () => {
        syncTableToState();
        state.filters.department = els.departmentFilter.value;
        applyFilter();
      });
    }

    if (els.categoryFilter) {
      els.categoryFilter.addEventListener('change', () => {
        syncTableToState();
        state.filters.category = els.categoryFilter.value;
        applyFilter();
      });
    }

    if (els.activeFilter) {
      els.activeFilter.addEventListener('change', () => {
        syncTableToState();
        state.filters.active = els.activeFilter.value;
        applyFilter();
      });
    }

    if (els.refreshBtn) {
      els.refreshBtn.addEventListener('click', loadPrices);
    }

    if (els.resetBtn) {
      els.resetBtn.addEventListener('click', resetPrices);
    }

    if (els.form) {
      els.form.addEventListener('submit', async (event) => {
        event.preventDefault();
        await savePrices();
      });
    }

    if (els.tableWrap) {
      els.tableWrap.addEventListener('click', handleTableClick);
    }
  }

  async function init() {
    renderFilterOptions();
    bindEvents();
    await loadPrices();
  }

  document.addEventListener('DOMContentLoaded', init);
})();