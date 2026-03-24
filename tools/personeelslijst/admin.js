/**
 * Personeelslijst admin
 * Toolspecifieke logica voor beheer.
 */

let staffRows = [];
let filteredRows = [];

const tableBody = document.getElementById('staffTableBody');
const searchInput = document.getElementById('searchInput');
const actorInput = document.getElementById('actorInput');
const loadBtn = document.getElementById('loadBtn');
const addRowBtn = document.getElementById('addRowBtn');
const saveBtn = document.getElementById('saveBtn');
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
  addRowBtn.addEventListener('click', addRow);
  saveBtn.addEventListener('click', saveRows);
  searchInput.addEventListener('input', applyFilter);
}

async function loadRows() {
  setButtonsDisabled(true);
  setMessage(messageBox, 'Personeelslijst wordt geladen...', 'info');

  try {
    const response = await fetch(`${API_URL}?action=list`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Laden mislukt.');
    }

    staffRows = Array.isArray(data.rows) ? data.rows.map(sanitizeRow) : [];
    applyFilter();
    setMessage(messageBox, 'Personeelslijst is geladen.', 'success');
  } catch (error) {
    setMessage(messageBox, error.message || 'Fout bij laden.', 'error');
  } finally {
    setButtonsDisabled(false);
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
        <td colspan="6" class="personeel-empty-state">Geen resultaten gevonden.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filteredRows.map(row => {
    const realIndex = staffRows.findIndex(item => String(item.roepnummer) === String(row.roepnummer));

    return `
      <tr>
        <td>
          <input class="form-input personeel-input" type="text" value="${escapeHtml(row.roepnummer)}" data-index="${realIndex}" data-field="roepnummer" />
        </td>
        <td>
          <input class="form-input personeel-input" type="text" value="${escapeHtml(row.naam)}" data-index="${realIndex}" data-field="naam" />
        </td>
        <td>
          <input class="form-input personeel-input" type="text" value="${escapeHtml(row.rang)}" data-index="${realIndex}" data-field="rang" />
        </td>
        <td>
          <input class="form-input personeel-input" type="text" value="${escapeHtml(row.afdeling)}" data-index="${realIndex}" data-field="afdeling" />
        </td>
        <td>
          <select class="form-input personeel-select ${getStatusClass(row.status)}" data-index="${realIndex}" data-field="status">
            ${renderStatusOptions(row.status)}
          </select>
        </td>
        <td class="personeel-checkbox-cell">
          <label class="personeel-checkbox-label">
            <input type="checkbox" ${row.is_active ? 'checked' : ''} data-index="${realIndex}" data-field="is_active" />
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
  const index = Number(element.dataset.index);
  const field = element.dataset.field;

  if (Number.isNaN(index) || !staffRows[index]) return;

  if (element.type === 'checkbox') {
    staffRows[index][field] = element.checked;
    return;
  }

  if (field === 'status') {
    staffRows[index][field] = normalizeStatus(element.value);
    applyFilter();
    return;
  }

  staffRows[index][field] = element.value;
}

function handleTrimOnBlur(event) {
  const element = event.target;
  const index = Number(element.dataset.index);
  const field = element.dataset.field;

  if (Number.isNaN(index) || !staffRows[index]) return;
  if (element.type === 'checkbox' || field === 'status') return;

  const trimmedValue = String(element.value || '').trim();
  element.value = trimmedValue;
  staffRows[index][field] = trimmedValue;
}

function addRow() {
  staffRows.unshift({
    roepnummer: '',
    naam: '',
    rang: '',
    afdeling: '',
    status: 'actief',
    is_active: true
  });

  searchInput.value = '';
  applyFilter();
  setMessage(messageBox, 'Nieuwe rij toegevoegd. Vul de gegevens in en klik daarna op Opslaan.', 'success');
}

async function saveRows() {
  const actor = actorInput.value.trim();

  if (!actor) {
    setMessage(messageBox, 'Vul eerst jouw naam in voor logging.', 'error');
    return;
  }

  const cleanedRows = staffRows
    .map(sanitizeRow)
    .filter(row => row.roepnummer || row.naam || row.rang || row.afdeling);

  const validationError = validateRows(cleanedRows);
  if (validationError) {
    setMessage(messageBox, validationError, 'error');
    return;
  }

  setButtonsDisabled(true);
  setMessage(messageBox, 'Personeelslijst wordt opgeslagen...', 'info');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'saveAll',
        actor,
        rows: cleanedRows
      })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Opslaan mislukt.');
    }

    setMessage(messageBox, 'Personeelslijst is opgeslagen.', 'success');
    await loadRows();
  } catch (error) {
    setMessage(messageBox, error.message || 'Fout bij opslaan.', 'error');
  } finally {
    setButtonsDisabled(false);
  }
}

function validateRows(rows) {
  const seenRoepnummers = new Set();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    if (!row.roepnummer) {
      return `Rij ${i + 1}: roepnummer ontbreekt.`;
    }

    if (!row.naam) {
      return `Rij ${i + 1}: naam ontbreekt.`;
    }

    if (seenRoepnummers.has(row.roepnummer)) {
      return `Dubbel roepnummer gevonden: ${row.roepnummer}`;
    }

    if (!STATUS_OPTIONS.includes(row.status)) {
      return `Rij ${i + 1}: ongeldige status.`;
    }

    seenRoepnummers.add(row.roepnummer);
  }

  return null;
}

function setButtonsDisabled(disabled) {
  loadBtn.disabled = disabled;
  addRowBtn.disabled = disabled;
  saveBtn.disabled = disabled;
}
