/**
 * Personeelslijst admin
 * Rij-per-rij bewerken en opslaan.
 */

let staffRows = [];
let filteredRows = [];
let editStateByKey = {};

const tableBody = document.getElementById('staffTableBody');
const searchInput = document.getElementById('searchInput');
const actorInput = document.getElementById('actorInput');
const loadBtn = document.getElementById('loadBtn');
const messageBox = document.getElementById('messageBox');
const resultCount = document.getElementById('resultCount');

const {
  STATUS_OPTIONS,
  normalizeStatus,
  getStatusClass,
  escapeHtml,
  setMessage,
  sanitizeRow
} = window.PersoneelShared;

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  loadRows();
});

function bindEvents() {
  loadBtn.addEventListener('click', loadRows);
  searchInput.addEventListener('input', applyFilter);
}

async function loadRows() {
  loadBtn.disabled = true;
  setMessage(messageBox, 'Personeelslijst wordt geladen...', 'info');

  try {
    const response = await fetch(`${API_URL}?action=list`);

    if (!response.ok) {
      throw new Error(`HTTP-fout: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Laden mislukt.');
    }

    staffRows = Array.isArray(data.rows) ? data.rows.map(sanitizeRow) : [];
    editStateByKey = {};
    applyFilter();

    setMessage(messageBox, 'Personeelslijst is geladen.', 'success');
  } catch (error) {
    setMessage(messageBox, error.message || 'Fout bij laden.', 'error');
  } finally {
    loadBtn.disabled = false;
  }
}

function applyFilter() {
  const query = searchInput.value.trim().toLowerCase();

  if (!query) {
    filteredRows = [...staffRows];
  } else {
    filteredRows = staffRows.filter(row => {
      return [
        row.roepnummer,
        row.naam,
        row.rang,
        row.afdeling,
        row.status,
        row.is_active ? 'zichtbaar' : 'verborgen'
      ].some(value => String(value || '').toLowerCase().includes(query));
    });
  }

  resultCount.textContent = String(filteredRows.length);
  renderTable();
}

function renderTable() {
  if (!filteredRows.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="personeel-empty-state">Geen resultaten gevonden.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filteredRows.map(row => {
    const key = getRowKey(row);
    const isEditing = !!editStateByKey[key];

    const draft = isEditing ? editStateByKey[key].draft : row;
    const original = isEditing ? editStateByKey[key].original : row;

    return `
      <tr class="${isEditing ? 'personeel-row--editing' : ''}" data-row-key="${escapeHtml(key)}">
        <td class="personeel-actions-cell">
          ${isEditing ? `
            <div class="personeel-row-actions">
              <button class="btn btn-primary btn-sm" type="button" data-action="save-row" data-key="${escapeHtml(key)}">Opslaan</button>
              <button class="btn btn-sm" type="button" data-action="cancel-row" data-key="${escapeHtml(key)}">Annuleren</button>
            </div>
          ` : `
            <div class="personeel-row-actions">
              <button class="btn btn-sm" type="button" data-action="edit-row" data-key="${escapeHtml(key)}">Bewerken</button>
            </div>
          `}
        </td>

        <td>
          <input
            class="form-input personeel-input personeel-input--readonly"
            type="text"
            value="${escapeHtml(original.roepnummer)}"
            readonly
            disabled
          />
        </td>

        <td>
          <input
            class="form-input personeel-input"
            type="text"
            value="${escapeHtml(draft.naam)}"
            data-key="${escapeHtml(key)}"
            data-field="naam"
            ${isEditing ? '' : 'readonly disabled'}
          />
        </td>

        <td>
          <input
            class="form-input personeel-input personeel-input--readonly"
            type="text"
            value="${escapeHtml(original.rang)}"
            readonly
            disabled
          />
        </td>

        <td>
          <input
            class="form-input personeel-input"
            type="text"
            value="${escapeHtml(draft.afdeling)}"
            data-key="${escapeHtml(key)}"
            data-field="afdeling"
            ${isEditing ? '' : 'readonly disabled'}
          />
        </td>

        <td>
          <select
            class="form-input personeel-select ${getStatusClass(draft.status)}"
            data-key="${escapeHtml(key)}"
            data-field="status"
            ${isEditing ? '' : 'disabled'}
          >
            ${renderStatusOptions(draft.status)}
          </select>
        </td>

        <td class="personeel-checkbox-cell">
          <label class="personeel-checkbox-label">
            <input
              type="checkbox"
              ${draft.is_active ? 'checked' : ''}
              data-key="${escapeHtml(key)}"
              data-field="is_active"
              ${isEditing ? '' : 'disabled'}
            />
            <span>Zichtbaar</span>
          </label>
        </td>
      </tr>
    `;
  }).join('');

  bindTableInputs();
}

function renderStatusOptions(currentStatus) {
  const normalized = normalizeStatus(currentStatus);

  return STATUS_OPTIONS.map(status => `
    <option value="${status}" ${status === normalized ? 'selected' : ''}>${status}</option>
  `).join('');
}

function bindTableInputs() {
  document.querySelectorAll('#staffTableBody [data-action]').forEach(button => {
    button.addEventListener('click', handleRowAction);
  });

  document.querySelectorAll('#staffTableBody input[data-field], #staffTableBody select[data-field]').forEach(input => {
    if (input.type === 'checkbox') {
      input.addEventListener('change', handleFieldChange);
    } else {
      input.addEventListener('input', handleFieldChange);
      input.addEventListener('change', handleFieldChange);
      input.addEventListener('blur', handleTrimOnBlur);
    }
  });
}

function handleFieldChange(event) {
  const element = event.target;
  const key = element.dataset.key;
  const field = element.dataset.field;

  if (!key || !field || !editStateByKey[key]) return;

  if (element.type === 'checkbox') {
    editStateByKey[key].draft[field] = element.checked;
    return;
  }

  if (field === 'status') {
    editStateByKey[key].draft[field] = normalizeStatus(element.value);
    renderTable();
    return;
  }

  editStateByKey[key].draft[field] = element.value;
}

function handleTrimOnBlur(event) {
  const element = event.target;
  const key = element.dataset.key;
  const field = element.dataset.field;

  if (!key || !field || !editStateByKey[key]) return;
  if (element.type === 'checkbox' || field === 'status') return;

  const trimmedValue = String(element.value || '').trim();
  element.value = trimmedValue;
  editStateByKey[key].draft[field] = trimmedValue;
}

async function handleRowAction(event) {
  const action = event.currentTarget.dataset.action;
  const key = event.currentTarget.dataset.key;

  if (!key) return;

  if (action === 'edit-row') {
    startRowEdit(key);
    return;
  }

  if (action === 'cancel-row') {
    cancelRowEdit(key);
    return;
  }

  if (action === 'save-row') {
    await saveRow(key);
  }
}

function startRowEdit(key) {
  const row = staffRows.find(item => getRowKey(item) === key);
  if (!row) return;

  editStateByKey[key] = {
    original: { ...row },
    draft: { ...row }
  };

  renderTable();
}

function cancelRowEdit(key) {
  delete editStateByKey[key];
  renderTable();
  setMessage(messageBox, 'Wijzigingen aan de rij zijn geannuleerd.', 'info');
}

async function saveRow(key) {
  const actor = actorInput.value.trim();

  if (!actor) {
    setMessage(messageBox, 'Vul eerst jouw naam in voor logging.', 'error');
    return;
  }

  const state = editStateByKey[key];
  if (!state) return;

  const draft = sanitizeRow(state.draft);
  const validationError = validateSingleRow(draft);

  if (validationError) {
    setMessage(messageBox, validationError, 'error');
    return;
  }

  const updatedRows = staffRows.map(row => {
    return getRowKey(row) === key ? draft : row;
  });

  const duplicateError = validateDuplicateRoepnummers(updatedRows);
  if (duplicateError) {
    setMessage(messageBox, duplicateError, 'error');
    return;
  }

  loadBtn.disabled = true;
  setRowButtonsDisabled(true);
  setMessage(messageBox, `Rij ${draft.roepnummer} wordt opgeslagen...`, 'info');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'saveAll',
        actor,
        rows: updatedRows.map(sanitizeRow)
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP-fout: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Opslaan mislukt.');
    }

    staffRows = updatedRows;
    delete editStateByKey[key];
    applyFilter();

    setMessage(messageBox, `Rij ${draft.roepnummer} is opgeslagen.`, 'success');
  } catch (error) {
    setMessage(messageBox, error.message || 'Fout bij opslaan.', 'error');
  } finally {
    loadBtn.disabled = false;
    setRowButtonsDisabled(false);
  }
}

function validateSingleRow(row) {
  if (!row.roepnummer) {
    return 'Roepnummer ontbreekt.';
  }

  if (!row.naam) {
    return `Naam ontbreekt voor roepnummer ${row.roepnummer}.`;
  }

  if (!STATUS_OPTIONS.includes(row.status)) {
    return `Ongeldige status voor roepnummer ${row.roepnummer}.`;
  }

  return null;
}

function validateDuplicateRoepnummers(rows) {
  const seen = new Set();

  for (const row of rows) {
    const roepnummer = String(row.roepnummer || '').trim();

    if (seen.has(roepnummer)) {
      return `Dubbel roepnummer gevonden: ${roepnummer}`;
    }

    seen.add(roepnummer);
  }

  return null;
}

function getRowKey(row) {
  return String(row.roepnummer || '').trim();
}

function setRowButtonsDisabled(disabled) {
  document.querySelectorAll('#staffTableBody button').forEach(button => {
    button.disabled = disabled;
  });
}