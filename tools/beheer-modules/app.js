(function () {
  const ACTOR = 'beheer_modules_ui';

  const state = {
    originalRows: [],
    rows: [],
    filteredRows: [],
    loading: false,
    saving: false,
    search: ''
  };

  const els = {
    form: document.getElementById('modules-form'),
    search: document.getElementById('modules-search'),
    status: document.getElementById('modules-status'),
    tableWrap: document.getElementById('modules-table-wrap'),
    refreshBtn: document.getElementById('refresh-modules-btn'),
    resetBtn: document.getElementById('reset-modules-btn'),
    saveBtn: document.getElementById('save-modules-btn')
  };

  const TYPE_OPTIONS = ['tool', 'portal', 'form', 'info', 'link', 'admin'];
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

  function toNumber(value, fallback = 9999) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function normalizeRow(row) {
    return {
      id: String(row.id ?? '').trim(),
      name: String(row.name ?? '').trim(),
      type: String(row.type ?? '').trim(),
      department: String(row.department ?? '').trim(),
      url: String(row.url ?? '').trim(),
      icon: String(row.icon ?? '').trim(),
      badge: String(row.badge ?? '').trim(),
      status: String(row.status ?? '').trim(),
      description: String(row.description ?? '').trim(),
      keywords: toPipeString(row.keywords),
      contexts: toPipeString(row.contexts),
      order: toNumber(row.order, 9999),
      enabled: toBoolean(row.enabled),
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

  function getRowSearchText(row) {
    return normalizeString([
      row.id,
      row.name,
      row.type,
      row.department,
      row.url,
      row.badge,
      row.status,
      row.description,
      row.keywords,
      row.contexts,
      row.notes
    ].join(' '));
  }

  function applyFilter() {
    const query = normalizeString(state.search);

    if (!query) {
      state.filteredRows = [...state.rows];
    } else {
      state.filteredRows = state.rows.filter((row) => getRowSearchText(row).includes(query));
    }

    renderTable();
  }

  function buildSelectOptions(options, selectedValue, allowEmpty = true) {
    const normalizedSelected = String(selectedValue ?? '');
    const parts = [];

    if (allowEmpty) {
      parts.push(`<option value="">-</option>`);
    }

    options.forEach((option) => {
      const selected = option === normalizedSelected ? ' selected' : '';
      parts.push(`<option value="${escapeHtml(option)}"${selected}>${escapeHtml(option)}</option>`);
    });

    return parts.join('');
  }

  function renderTable() {
    if (!els.tableWrap) return;

    if (!state.filteredRows.length) {
      els.tableWrap.innerHTML = '<div class="status-box status-info">Geen modules gevonden.</div>';
      return;
    }

    const rowsHtml = state.filteredRows.map((row, filteredIndex) => {
      const absoluteIndex = state.rows.findIndex((item) => item.id === row.id);

      return `
        <tr data-row-index="${absoluteIndex}">
          <td><input type="checkbox" data-field="enabled" ${row.enabled ? 'checked' : ''}></td>
          <td><input type="text" data-field="id" value="${escapeHtml(row.id)}"></td>
          <td><input type="text" data-field="name" value="${escapeHtml(row.name)}"></td>
          <td>
            <select data-field="type">
              ${buildSelectOptions(TYPE_OPTIONS, row.type, false)}
            </select>
          </td>
          <td>
            <select data-field="department">
              ${buildSelectOptions(DEPARTMENT_OPTIONS, row.department, true)}
            </select>
          </td>
          <td><input type="text" data-field="url" value="${escapeHtml(row.url)}"></td>
          <td><input type="text" data-field="icon" value="${escapeHtml(row.icon)}"></td>
          <td><input type="text" data-field="badge" value="${escapeHtml(row.badge)}"></td>
          <td><input type="text" data-field="status" value="${escapeHtml(row.status)}"></td>
          <td><textarea data-field="description" rows="2">${escapeHtml(row.description)}</textarea></td>
          <td><input type="text" data-field="keywords" value="${escapeHtml(row.keywords)}"></td>
          <td><input type="text" data-field="contexts" value="${escapeHtml(row.contexts)}"></td>
          <td><input type="number" data-field="order" value="${escapeHtml(row.order)}"></td>
          <td><textarea data-field="notes" rows="2">${escapeHtml(row.notes)}"></textarea></td>
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
        <button type="button" id="add-module-row-btn">Nieuwe module</button>
        <span>${state.filteredRows.length} modules zichtbaar</span>
      </div>
      <div class="table-responsive">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Aan</th>
              <th>ID</th>
              <th>Naam</th>
              <th>Type</th>
              <th>Afdeling</th>
              <th>URL</th>
              <th>Icoon</th>
              <th>Badge</th>
              <th>Status</th>
              <th>Beschrijving</th>
              <th>Keywords</th>
              <th>Contexts</th>
              <th>Volgorde</th>
              <th>Notities</th>
              <th>Acties</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;

    const addBtn = document.getElementById('add-module-row-btn');
    if (addBtn) {
      addBtn.addEventListener('click', addEmptyRow);
    }
  }

  function addEmptyRow() {
    state.rows.push(normalizeRow({
      id: '',
      name: '',
      type: 'tool',
      department: 'general',
      url: '',
      icon: '🔗',
      badge: '',
      status: 'actief',
      description: '',
      keywords: '',
      contexts: '',
      order: getNextOrder(),
      enabled: true,
      notes: ''
    }));

    applyFilter();
    setStatus('Nieuwe lege moduleregel toegevoegd.', 'info');
  }

  function getNextOrder() {
    if (!state.rows.length) return 10;
    const max = Math.max(...state.rows.map((row) => Number(row.order) || 0));
    return max + 10;
  }

  function deleteRow(index) {
    if (index < 0 || index >= state.rows.length) return;
    state.rows.splice(index, 1);
    applyFilter();
    setStatus('Module verwijderd uit de huidige bewerking.', 'warning');
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
      row.order = (rowIndex + 1) * 10;
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
        let value;

        if (fieldEl.type === 'checkbox') {
          value = fieldEl.checked;
        } else {
          value = fieldEl.value;
        }

        if (field === 'enabled') {
          row[field] = !!value;
        } else if (field === 'order') {
          row[field] = toNumber(value, 9999);
        } else if (field === 'keywords' || field === 'contexts') {
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

      if (!row.id) throw new Error(`Module ${rowLabel}: id ontbreekt.`);
      if (!row.name) throw new Error(`Module ${rowLabel}: naam ontbreekt.`);
      if (!row.type) throw new Error(`Module ${rowLabel}: type ontbreekt.`);
      if (!row.url) throw new Error(`Module ${rowLabel}: url ontbreekt.`);
      if (!row.contexts) throw new Error(`Module ${rowLabel}: contexts ontbreekt.`);

      if (ids.has(row.id)) {
        throw new Error(`Dubbele module-id gevonden: ${row.id}`);
      }
      ids.add(row.id);
    });
  }

  async function loadModules() {
    setLoading(true);
    setStatus('Modules laden...', 'info');

    try {
      const rows = await window.EMSAdminStore.get('modules', { forceRefresh: true });
      state.originalRows = rows.map(normalizeRow);
      state.rows = clone(state.originalRows);
      state.search = els.search ? els.search.value : '';
      applyFilter();
      setStatus(`Modules geladen: ${state.rows.length}`, 'success');
    } catch (error) {
      console.error(error);
      setStatus(`Fout bij laden van modules: ${error.message}`, 'danger');
    } finally {
      setLoading(false);
    }
  }

  function resetModules() {
    state.rows = clone(state.originalRows);
    applyFilter();
    setStatus('Wijzigingen teruggezet naar laatst geladen data.', 'info');
  }

  async function saveModules() {
    syncTableToState();

    const cleanedRows = state.rows.map(normalizeRow);
    validateRows(cleanedRows);

    setSaving(true);
    setStatus('Modules opslaan...', 'info');

    try {
      await window.EMSAdminStore.save('modules', cleanedRows, ACTOR);
      state.originalRows = clone(cleanedRows);
      state.rows = clone(cleanedRows);
      applyFilter();
      setStatus('Modules succesvol opgeslagen.', 'success');
    } catch (error) {
      console.error(error);
      setStatus(`Fout bij opslaan van modules: ${error.message}`, 'danger');
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

    if (els.refreshBtn) {
      els.refreshBtn.addEventListener('click', loadModules);
    }

    if (els.resetBtn) {
      els.resetBtn.addEventListener('click', resetModules);
    }

    if (els.form) {
      els.form.addEventListener('submit', async (event) => {
        event.preventDefault();
        await saveModules();
      });
    }

    if (els.tableWrap) {
      els.tableWrap.addEventListener('click', handleTableClick);
    }
  }

  async function init() {
    bindEvents();
    await loadModules();
  }

  document.addEventListener('DOMContentLoaded', init);
})();