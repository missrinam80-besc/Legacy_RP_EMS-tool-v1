(function () {
  const ACTOR = 'beheer_medicatie_ui';

  const state = {
    originalRows: [],
    rows: [],
    filteredRows: [],
    loading: false,
    saving: false,
    search: '',
    filters: {
      type: '',
      category: '',
      department: '',
      active: 'all'
    }
  };

  const els = {
    form: document.getElementById('medication-form'),
    search: document.getElementById('medication-search'),
    typeFilter: document.getElementById('medication-type-filter'),
    categoryFilter: document.getElementById('medication-category-filter'),
    departmentFilter: document.getElementById('medication-department-filter'),
    activeFilter: document.getElementById('medication-active-filter'),
    status: document.getElementById('medication-status'),
    tableWrap: document.getElementById('medication-table-wrap'),
    refreshBtn: document.getElementById('refresh-medication-btn'),
    resetBtn: document.getElementById('reset-medication-btn'),
    saveBtn: document.getElementById('save-medication-btn')
  };

  const TYPE_OPTIONS = ['medication', 'fluid', 'bandage', 'tool', 'equipment'];
  const CATEGORY_OPTIONS = ['pain', 'cardio', 'sedation', 'blood', 'saline', 'woundcare', 'airway', 'monitoring', 'transport', 'surgery'];
  const DEPARTMENT_OPTIONS = ['general', 'command', 'spoed', 'ambulance', 'chirurgie', 'psychologie', 'ortho', 'forensisch', 'labo'];

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
      name: String(row.name ?? '').trim(),
      type: String(row.type ?? '').trim(),
      category: String(row.category ?? '').trim(),
      dosage: String(row.dosage ?? '').trim(),
      route: String(row.route ?? '').trim(),
      indication: String(row.indication ?? '').trim(),
      contraNote: String(row.contraNote ?? '').trim(),
      price: toNumber(row.price, 0),
      departments: toPipeString(row.departments),
      active: toBoolean(row.active),
      warnings: toPipeString(row.warnings),
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

  function getRowSearchText(row) {
    return normalizeString([
      row.id,
      row.name,
      row.type,
      row.category,
      row.dosage,
      row.route,
      row.indication,
      row.contraNote,
      row.departments,
      row.warnings,
      row.notes
    ].join(' '));
  }

  function rowMatchesFilters(row) {
    if (state.filters.type && row.type !== state.filters.type) return false;
    if (state.filters.category && row.category !== state.filters.category) return false;

    if (state.filters.department) {
      const deps = row.departments.split('|').map((item) => item.trim()).filter(Boolean);
      if (!deps.includes(state.filters.department)) return false;
    }

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
    if (els.typeFilter) {
      els.typeFilter.innerHTML = '<option value="">Alle types</option>' +
        TYPE_OPTIONS.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('');
    }

    if (els.categoryFilter) {
      els.categoryFilter.innerHTML = '<option value="">Alle categorieën</option>' +
        CATEGORY_OPTIONS.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('');
    }

    if (els.departmentFilter) {
      els.departmentFilter.innerHTML = '<option value="">Alle afdelingen</option>' +
        DEPARTMENT_OPTIONS.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('');
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
      els.tableWrap.innerHTML = '<div class="status-box status-info">Geen medicatieregels gevonden.</div>';
      return;
    }

    const rowsHtml = state.filteredRows.map((row) => {
      const absoluteIndex = state.rows.findIndex((item) => item.id === row.id);

      return `
        <tr data-row-index="${absoluteIndex}">
          <td><input type="checkbox" data-field="active" ${row.active ? 'checked' : ''}></td>
          <td><input type="text" data-field="id" value="${escapeHtml(row.id)}"></td>
          <td><input type="text" data-field="name" value="${escapeHtml(row.name)}"></td>
          <td><select data-field="type">${buildSelectOptions(TYPE_OPTIONS, row.type, false)}</select></td>
          <td><select data-field="category">${buildSelectOptions(CATEGORY_OPTIONS, row.category, false)}</select></td>
          <td><input type="text" data-field="dosage" value="${escapeHtml(row.dosage)}"></td>
          <td><input type="text" data-field="route" value="${escapeHtml(row.route)}"></td>
          <td><textarea data-field="indication" rows="2">${escapeHtml(row.indication)}</textarea></td>
          <td><textarea data-field="contraNote" rows="2">${escapeHtml(row.contraNote)}</textarea></td>
          <td><input type="number" step="0.01" data-field="price" value="${escapeHtml(row.price)}"></td>
          <td><input type="text" data-field="departments" value="${escapeHtml(row.departments)}"></td>
          <td><input type="text" data-field="warnings" value="${escapeHtml(row.warnings)}"></td>
          <td><textarea data-field="notes" rows="2">${escapeHtml(row.notes)}</textarea></td>
          <td>
            <div class="table-actions">
              <button type="button" class="btn-small btn-danger" data-action="delete-row">Verwijder</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    els.tableWrap.innerHTML = `
      <div class="table-toolbar">
        <button type="button" id="add-medication-row-btn">Nieuwe medicatieregel</button>
        <span>${state.filteredRows.length} regels zichtbaar</span>
      </div>
      <div class="table-responsive">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Actief</th>
              <th>ID</th>
              <th>Naam</th>
              <th>Type</th>
              <th>Categorie</th>
              <th>Dosering</th>
              <th>Route</th>
              <th>Indicatie</th>
              <th>Contra / waarschuwing</th>
              <th>Prijs</th>
              <th>Afdelingen</th>
              <th>Warnings</th>
              <th>Notities</th>
              <th>Acties</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;

    const addBtn = document.getElementById('add-medication-row-btn');
    if (addBtn) {
      addBtn.addEventListener('click', addEmptyRow);
    }
  }

  function addEmptyRow() {
    state.rows.push(normalizeRow({
      id: '',
      name: '',
      type: 'medication',
      category: 'pain',
      dosage: '',
      route: '',
      indication: '',
      contraNote: '',
      price: 0,
      departments: 'spoed|ambulance',
      active: true,
      warnings: '',
      notes: ''
    }));

    applyFilter();
    setStatus('Nieuwe lege medicatieregel toegevoegd.', 'info');
  }

  function deleteRow(index) {
    if (index < 0 || index >= state.rows.length) return;
    state.rows.splice(index, 1);
    applyFilter();
    setStatus('Medicatieregel verwijderd uit de huidige bewerking.', 'warning');
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

        if (field === 'active') {
          row[field] = !!value;
        } else if (field === 'price') {
          row[field] = toNumber(value, 0);
        } else if (field === 'departments' || field === 'warnings') {
          row[field] = toPipeString(value);
        } else {
          row[field] = String(value ?? '').trim();
        }
      });
    });
  }

  function validateRows(rows) {
    const ids = new Set();

    rows.forEach((row, index) => {
      const rowLabel = `rij ${index + 1}`;

      if (!row.id) throw new Error(`Medicatieregel ${rowLabel}: id ontbreekt.`);
      if (!row.name) throw new Error(`Medicatieregel ${rowLabel}: naam ontbreekt.`);
      if (!row.type) throw new Error(`Medicatieregel ${rowLabel}: type ontbreekt.`);
      if (!row.category) throw new Error(`Medicatieregel ${rowLabel}: categorie ontbreekt.`);

      if (ids.has(row.id)) {
        throw new Error(`Dubbele medicatie-id gevonden: ${row.id}`);
      }
      ids.add(row.id);
    });
  }

  async function loadMedication() {
    setLoading(true);
    setStatus('Medicatie laden...', 'info');

    try {
      const loadedRows = await window.EMSAdminStore.get('medication', { forceRefresh: true });
      const rows = Array.isArray(loadedRows) ? loadedRows : [];
      state.originalRows = rows.map(normalizeRow);
      state.rows = clone(state.originalRows);
      applyFilter();
      setStatus(`Medicatie geladen: ${state.rows.length}`, 'success');
    } catch (error) {
      console.error(error);
      setStatus(`Fout bij laden van medicatie: ${error.message}`, 'danger');
    } finally {
      setLoading(false);
    }
  }

  function resetMedication() {
    state.rows = clone(state.originalRows);
    applyFilter();
    setStatus('Wijzigingen teruggezet naar laatst geladen data.', 'info');
  }

  async function saveMedication() {
    syncTableToState();

    const cleanedRows = state.rows.map(normalizeRow);
    validateRows(cleanedRows);

    setSaving(true);
    setStatus('Medicatie opslaan...', 'info');

    try {
      await window.EMSAdminStore.save('medication', cleanedRows, ACTOR);
      state.originalRows = clone(cleanedRows);
      state.rows = clone(cleanedRows);
      applyFilter();
      setStatus('Medicatie succesvol opgeslagen.', 'success');
    } catch (error) {
      console.error(error);
      setStatus(`Fout bij opslaan van medicatie: ${error.message}`, 'danger');
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

    if (els.typeFilter) {
      els.typeFilter.addEventListener('change', () => {
        syncTableToState();
        state.filters.type = els.typeFilter.value;
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

    if (els.departmentFilter) {
      els.departmentFilter.addEventListener('change', () => {
        syncTableToState();
        state.filters.department = els.departmentFilter.value;
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
      els.refreshBtn.addEventListener('click', loadMedication);
    }

    if (els.resetBtn) {
      els.resetBtn.addEventListener('click', resetMedication);
    }

    if (els.form) {
      els.form.addEventListener('submit', async (event) => {
        event.preventDefault();
        await saveMedication();
      });
    }

    if (els.tableWrap) {
      els.tableWrap.addEventListener('click', handleTableClick);
    }
  }

  async function init() {
    renderFilterOptions();
    bindEvents();
    await loadMedication();
  }

  document.addEventListener('DOMContentLoaded', init);
})();