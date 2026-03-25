/**
 * Personeelslijst admin - volledige werkversie
 * --------------------------------------------
 * Deze versie:
 * - laadt personeelsdata via GET
 * - laat rij-per-rij bewerken toe
 * - slaat wijzigingen op via GET action=saveRow
 * - toont debug-info op de pagina
 *
 * Vereisten:
 * - admin.html bevat elementen met ids:
 *   staffTableBody, searchInput, actorInput, loadBtn, messageBox, resultCount
 * - API_URL bestaat globaal in admin.html
 * - window.PersoneelShared bevat minstens:
 *   STATUS_OPTIONS, setMessage, sanitizeRow
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
  setMessage,
  sanitizeRow
} = window.PersoneelShared;

// =========================
// DEBUG
// =========================

let debugBox = null;

document.addEventListener('DOMContentLoaded', () => {
  createDebugBox();
  debugLog('DEBUG admin.js geladen');
  debugLog('API_URL = ' + API_URL);

  bindEvents();
  loadRows();
});

function createDebugBox() {
  debugBox = document.createElement('div');
  debugBox.id = 'debugBox';
  debugBox.style.marginTop = '16px';
  debugBox.style.padding = '12px';
  debugBox.style.border = '1px solid #666';
  debugBox.style.borderRadius = '8px';
  debugBox.style.background = '#111';
  debugBox.style.color = '#eee';
  debugBox.style.fontFamily = 'monospace';
  debugBox.style.fontSize = '12px';
  debugBox.style.whiteSpace = 'pre-wrap';
  debugBox.style.maxHeight = '260px';
  debugBox.style.overflow = 'auto';
  debugBox.textContent = 'Debug gestart...\n';

  const panels = document.querySelectorAll('.panel.mt-2');
  const targetPanel = panels.length ? panels[panels.length - 1] : null;

  if (targetPanel) {
    targetPanel.appendChild(debugBox);
  } else {
    document.body.appendChild(debugBox);
  }
}

function debugLog(text) {
  const line = `[${new Date().toLocaleTimeString()}] ${text}`;
  console.log(line);

  if (debugBox) {
    debugBox.textContent += line + '\n';
    debugBox.scrollTop = debugBox.scrollHeight;
  }
}

// =========================
// EVENTS
// =========================

function bindEvents() {
  loadBtn.addEventListener('click', () => {
    debugLog('Klik op Laden');
    loadRows();
  });

  searchInput.addEventListener('input', applyFilter);
}

// =========================
// DATA LADEN
// =========================

async function loadRows() {
  loadBtn.disabled = true;
  setRowButtonsDisabled(true);
  setMessage(messageBox, 'Personeelslijst wordt geladen...', 'info');
  debugLog('loadRows() gestart');

  try {
    const response = await fetch(`${API_URL}?action=list`);
    debugLog('GET list response ontvangen');

    if (!response.ok) {
      throw new Error(`HTTP-fout: ${response.status}`);
    }

    const data = await response.json();
    debugLog('GET list JSON parsed, success=' + data.success);

    if (!data.success) {
      throw new Error(data.message || 'Laden mislukt.');
    }

    staffRows = Array.isArray(data.rows)
      ? data.rows.map(sanitizeRow)
      : [];

    editStateByKey = {};
    applyFilter();

    setMessage(messageBox, 'Personeelslijst is geladen.', 'success');
    debugLog('Rows geladen: ' + staffRows.length);
  } catch (error) {
    setMessage(messageBox, error.message || 'Fout bij laden.', 'error');
    debugLog('FOUT loadRows: ' + (error.message || error));
  } finally {
    loadBtn.disabled = false;
    setRowButtonsDisabled(false);
  }
}

// =========================
// FILTEREN
// =========================

function applyFilter() {
  const query = searchInput.value.trim().toLowerCase();

  filteredRows = !query
    ? [...staffRows]
    : staffRows.filter(row =>
        [
          row.roepnummer,
          row.naam,
          row.rang,
          row.afdeling,
          row.status,
          row.is_active ? 'zichtbaar' : 'verborgen'
        ].some(value => String(value || '').toLowerCase().includes(query))
      );

  resultCount.textContent = String(filteredRows.length);
  renderTable();
}

// =========================
// TABEL RENDEREN
// =========================

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

    const original = isEditing ? editStateByKey[key].original : row;
    const draft = isEditing ? editStateByKey[key].draft : row;

    return `
      <tr class="${isEditing ? 'personeel-row--editing' : ''}">
        <td>
          ${
            isEditing
              ? `
                <button type="button" data-action="save" data-key="${escapeAttr(key)}">Opslaan</button>
                <button type="button" data-action="cancel" data-key="${escapeAttr(key)}">Annuleren</button>
              `
              : `
                <button type="button" data-action="edit" data-key="${escapeAttr(key)}">Bewerken</button>
              `
          }
        </td>

        <td>
          <input value="${escapeAttr(original.roepnummer)}" disabled>
        </td>

        <td>
          <input
            value="${escapeAttr(draft.naam)}"
            data-field="naam"
            data-key="${escapeAttr(key)}"
            ${isEditing ? '' : 'disabled'}
          >
        </td>

        <td>
          <input value="${escapeAttr(original.rang)}" disabled>
        </td>

        <td>
          <input
            value="${escapeAttr(draft.afdeling)}"
            data-field="afdeling"
            data-key="${escapeAttr(key)}"
            ${isEditing ? '' : 'disabled'}
          >
        </td>

        <td>
          <select
            data-field="status"
            data-key="${escapeAttr(key)}"
            ${isEditing ? '' : 'disabled'}
          >
            ${STATUS_OPTIONS.map(status => `
              <option value="${escapeAttr(status)}" ${status === draft.status ? 'selected' : ''}>
                ${escapeHtml(status)}
              </option>
            `).join('')}
          </select>
        </td>

        <td>
          <input
            type="checkbox"
            ${draft.is_active ? 'checked' : ''}
            data-field="is_active"
            data-key="${escapeAttr(key)}"
            ${isEditing ? '' : 'disabled'}
          >
        </td>
      </tr>
    `;
  }).join('');

  bindTableInputs();
}

function bindTableInputs() {
  document.querySelectorAll('[data-action]').forEach(button => {
    button.onclick = handleAction;
  });

  document.querySelectorAll('[data-field]').forEach(input => {
    input.oninput = updateDraft;
    input.onchange = updateDraft;
  });
}

// =========================
// ACTIES
// =========================

function handleAction(event) {
  const key = event.target.dataset.key;
  const action = event.target.dataset.action;

  debugLog(`handleAction: ${action} voor key=${key}`);

  if (action === 'edit') {
    const row = staffRows.find(item => getRowKey(item) === key);

    if (!row) {
      debugLog('Geen rij gevonden voor edit');
      return;
    }

    editStateByKey[key] = {
      original: { ...row },
      draft: { ...row }
    };

    renderTable();
    return;
  }

  if (action === 'cancel') {
    delete editStateByKey[key];
    renderTable();
    setMessage(messageBox, 'Wijzigingen geannuleerd.', 'info');
    debugLog('Wijzigingen geannuleerd voor key=' + key);
    return;
  }

  if (action === 'save') {
    saveRow(key);
  }
}

function updateDraft(event) {
  const key = event.target.dataset.key;
  const field = event.target.dataset.field;

  if (!editStateByKey[key]) {
    return;
  }

  editStateByKey[key].draft[field] =
    event.target.type === 'checkbox'
      ? event.target.checked
      : event.target.value;
}

// =========================
// OPSLAAN
// =========================

async function saveRow(key) {
  debugLog('saveRow() gestart voor key=' + key);

  const actor = actorInput.value.trim();
  debugLog('actor=' + actor);

  if (!actor) {
    setMessage(messageBox, 'Vul eerst je naam in.', 'error');
    debugLog('saveRow gestopt: actor ontbreekt');
    return;
  }

  const state = editStateByKey[key];
  if (!state) {
    debugLog('saveRow gestopt: geen state gevonden');
    return;
  }

  const draft = sanitizeRow(state.draft);
  const validationError = validateSingleRow(draft);

  debugLog('draft=' + JSON.stringify(draft));

  if (validationError) {
    setMessage(messageBox, validationError, 'error');
    debugLog('saveRow validatiefout: ' + validationError);
    return;
  }

  loadBtn.disabled = true;
  setRowButtonsDisabled(true);
  setMessage(messageBox, `Rij ${draft.roepnummer} wordt opgeslagen...`, 'info');

  try {
    const payload = {
      action: 'saveRow',
      actor,
      row: {
        roepnummer: draft.roepnummer,
        naam: draft.naam,
        afdeling: draft.afdeling,
        status: draft.status,
        is_active: draft.is_active
      }
    };

    debugLog('payload=' + JSON.stringify(payload));

    const result = await getSaveRow(payload);
    debugLog('GET save response=' + JSON.stringify(result));

    delete editStateByKey[key];

    await wait(700);
    debugLog('Lijst wordt herladen na save');
    await loadRows();

    setMessage(messageBox, `Rij ${draft.roepnummer} is opgeslagen.`, 'success');
  } catch (error) {
    setMessage(messageBox, error.message || 'Fout bij opslaan.', 'error');
    debugLog('FOUT saveRow: ' + (error.message || error));
  } finally {
    loadBtn.disabled = false;
    setRowButtonsDisabled(false);
  }
}

async function getSaveRow(payload) {
  const params = new URLSearchParams({
    action: payload.action,
    actor: payload.actor,
    roepnummer: payload.row.roepnummer,
    naam: payload.row.naam,
    afdeling: payload.row.afdeling,
    status: payload.row.status,
    is_active: payload.row.is_active ? 'true' : 'false'
  });

  const url = `${API_URL}?${params.toString()}`;
  debugLog('GET save URL=' + url);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP-fout bij opslaan: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Opslaan mislukt.');
  }

  return data;
}

// =========================
// VALIDATIE
// =========================

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

// =========================
// HELPERS
// =========================

function getRowKey(row) {
  return String(row.roepnummer || '').trim();
}

function setRowButtonsDisabled(disabled) {
  document.querySelectorAll('#staffTableBody button').forEach(button => {
    button.disabled = disabled;
  });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeAttr(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
