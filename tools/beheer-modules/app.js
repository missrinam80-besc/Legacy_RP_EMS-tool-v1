(function () {
  'use strict';

  const STORAGE_KEY = 'ems_admin_modules';
  const ACTOR = 'beheer-modules';

  const state = {
    originalRows: [],
    rows: [],
    filteredRows: [],
    search: '',
    hideDisabled: false,
    loading: false,
    saving: false
  };

  const els = {
    status: document.getElementById('statusBox'),
    search: document.getElementById('searchInput'),
    hideDisabled: document.getElementById('hideDisabledToggle'),
    refresh: document.getElementById('refreshBtn'),
    reset: document.getElementById('resetBtn'),
    add: document.getElementById('addRowBtn'),
    save: document.getElementById('saveBtn'),
    tbody: document.getElementById('modulesTableBody'),
    count: document.getElementById('moduleCount')
  };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function normalizeLoadedRows(rows) { return Array.isArray(rows) ? rows : []; }
  function toBool(value) {
    if (value === true || value === false) return value;
    return ['true', '1', 'ja', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
  }
  function splitPipes(value) {
    return String(value || '').split('|').map((item) => item.trim()).filter(Boolean).join(' | ');
  }
  function setStatus(message, variant = 'info') {
    if (!els.status) return;
    els.status.textContent = message;
    els.status.className = `status-box status-${variant}`;
  }
  function setLoading(isLoading) {
    state.loading = isLoading;
    if (els.refresh) els.refresh.disabled = isLoading;
    if (els.save) els.save.disabled = isLoading || state.saving;
  }
  function setSaving(isSaving) {
    state.saving = isSaving;
    if (els.save) els.save.disabled = isSaving || state.loading;
  }
  function normalizeRow(row = {}) {
    return {
      id: String(row.id || '').trim(),
      name: String(row.name || '').trim(),
      type: String(row.type || '').trim(),
      department: String(row.department || '').trim(),
      url: String(row.url || '').trim(),
      icon: String(row.icon || '').trim(),
      badge: String(row.badge || '').trim(),
      status: String(row.status || '').trim(),
      description: String(row.description || '').trim(),
      keywords: splitPipes(row.keywords),
      contexts: splitPipes(row.contexts),
      order: Number(row.order) || 0,
      enabled: toBool(row.enabled),
      notes: String(row.notes || '').trim()
    };
  }
  function buildRowTemplate(order) { return normalizeRow({ enabled: true, order: order || 0, status: 'draft' }); }
  function escapeAttr(value) { return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }
  function escapeHtml(value) { return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function syncTableToState() {
    if (!els.tbody) return;
    const rows = [...els.tbody.querySelectorAll('tr[data-index]')];
    rows.forEach((tr) => {
      const index = Number(tr.dataset.index);
      if (Number.isNaN(index) || !state.filteredRows[index]) return;
      state.filteredRows[index] = normalizeRow({
        id: tr.querySelector('[data-field="id"]')?.value,
        name: tr.querySelector('[data-field="name"]')?.value,
        type: tr.querySelector('[data-field="type"]')?.value,
        department: tr.querySelector('[data-field="department"]')?.value,
        url: tr.querySelector('[data-field="url"]')?.value,
        icon: tr.querySelector('[data-field="icon"]')?.value,
        badge: tr.querySelector('[data-field="badge"]')?.value,
        status: tr.querySelector('[data-field="status"]')?.value,
        description: tr.querySelector('[data-field="description"]')?.value,
        keywords: tr.querySelector('[data-field="keywords"]')?.value,
        contexts: tr.querySelector('[data-field="contexts"]')?.value,
        order: tr.querySelector('[data-field="order"]')?.value,
        enabled: tr.querySelector('[data-field="enabled"]')?.checked,
        notes: tr.querySelector('[data-field="notes"]')?.value
      });
    });
    const lookup = new Map(state.filteredRows.map((row) => [row.id || `${row.name}-${row.order}`, row]));
    state.rows = state.rows.map((row) => lookup.get(row.id || `${row.name}-${row.order}`) || row);
  }
  function applyFilter() {
    syncTableToState();
    const search = (els.search?.value || '').trim().toLowerCase();
    state.hideDisabled = !!els.hideDisabled?.checked;
    state.filteredRows = state.rows.filter((row) => {
      if (state.hideDisabled && !row.enabled) return false;
      if (!search) return true;
      return [row.id, row.name, row.type, row.department, row.description, row.contexts, row.url]
        .some((value) => String(value || '').toLowerCase().includes(search));
    }).sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    renderTable();
  }
  function renderTable() {
    if (!els.tbody) return;
    if (els.count) els.count.textContent = String(state.filteredRows.length);
    if (!state.filteredRows.length) {
      els.tbody.innerHTML = '<tr><td colspan="14" class="table-empty">Geen modules gevonden.</td></tr>';
      return;
    }
    els.tbody.innerHTML = state.filteredRows.map((row, index) => `
      <tr data-index="${index}">
        <td><button class="btn btn-secondary btn-sm" data-action="delete" type="button">Verwijder</button></td>
        <td><input class="form-input" data-field="id" value="${escapeAttr(row.id)}"></td>
        <td><input class="form-input" data-field="name" value="${escapeAttr(row.name)}"></td>
        <td><input class="form-input" data-field="type" value="${escapeAttr(row.type)}"></td>
        <td><input class="form-input" data-field="department" value="${escapeAttr(row.department)}"></td>
        <td><input class="form-input" data-field="url" value="${escapeAttr(row.url)}"></td>
        <td><input class="form-input" data-field="icon" value="${escapeAttr(row.icon)}"></td>
        <td><input class="form-input" data-field="badge" value="${escapeAttr(row.badge)}"></td>
        <td><input class="form-input" data-field="status" value="${escapeAttr(row.status)}"></td>
        <td><textarea class="form-input" data-field="description">${escapeHtml(row.description)}</textarea></td>
        <td><input class="form-input" data-field="keywords" value="${escapeAttr(row.keywords)}"></td>
        <td><input class="form-input" data-field="contexts" value="${escapeAttr(row.contexts)}"></td>
        <td><input class="form-input" data-field="order" type="number" value="${escapeAttr(row.order)}"></td>
        <td><label><input type="checkbox" data-field="enabled" ${row.enabled ? 'checked' : ''}> actief</label><textarea class="form-input mt-1" data-field="notes">${escapeHtml(row.notes)}</textarea></td>
      </tr>
    `).join('');
  }
  function validateRows(rows) {
    const ids = new Set();
    rows.forEach((row, index) => {
      const rowLabel = `rij ${index + 1}`;
      if (!row.id) throw new Error(`Module ${rowLabel}: id ontbreekt.`);
      if (!row.name) throw new Error(`Module ${rowLabel}: naam ontbreekt.`);
      if (!row.url) throw new Error(`Module ${rowLabel}: url ontbreekt.`);
      if (ids.has(row.id)) throw new Error(`Dubbele module-id gevonden: ${row.id}`);
      ids.add(row.id);
    });
  }
  async function loadModules() {
    setLoading(true);
    setStatus('Modules laden...', 'info');
    try {
      const rows = normalizeLoadedRows(await window.EMSAdminStore.get('modules', { forceRefresh: true }));
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
  function addRow() {
    syncTableToState();
    const max = Math.max(0, ...state.rows.map((row) => Number(row.order) || 0));
    state.rows.push(buildRowTemplate(max + 10));
    applyFilter();
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
  function removeRow(filteredIndex) {
    const target = state.filteredRows[filteredIndex];
    if (!target) return;
    state.rows = state.rows.filter((row) => row !== target);
    applyFilter();
  }
  function bindEvents() {
    els.search?.addEventListener('input', applyFilter);
    els.hideDisabled?.addEventListener('change', applyFilter);
    els.refresh?.addEventListener('click', loadModules);
    els.reset?.addEventListener('click', resetModules);
    els.add?.addEventListener('click', addRow);
    els.save?.addEventListener('click', saveModules);
    els.tbody?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action="delete"]');
      if (!button) return;
      const row = button.closest('tr[data-index]');
      if (!row) return;
      removeRow(Number(row.dataset.index));
    });
  }
  document.addEventListener('DOMContentLoaded', () => { bindEvents(); loadModules(); });
})();
