/**
 * Personeelslijst admin - volledige werkversie
 * --------------------------------------------
 * Deze versie:
 * - laadt personeelsdata via GET
 * - laat rij-per-rij bewerken toe
 * - slaat wijzigingen op via GET action=saveRow
 * - toont debug-info in een toon/verberg debugpaneel
 *
 * Vereisten:
 * - admin.html bevat elementen met ids:
 *   staffTableBody, searchInput, actorInput, loadBtn, messageBox,
 *   resultCount, toggleDebugBtn, debugPanel, debugOutput, clearDebugBtn
 * - API_URL bestaat globaal in admin.html
 * - window.PersoneelShared bevat minstens:
 *   STATUS_OPTIONS, setMessage, sanitizeRow
 */

let staffRows = [];
let filteredRows = [];
let editStateByKey = {};
let debugVisible = false;

const tableBody = document.getElementById('staffTableBody');
const searchInput = document.getElementById('searchInput');
const actorInput = document.getElementById('actorInput');
const loadBtn = document.getElementById('loadBtn');
const messageBox = document.getElementById('messageBox');
const resultCount = document.getElementById('resultCount');

const toggleDebugBtn = document.getElementById('toggleDebugBtn');
const clearDebugBtn = document.getElementById('clearDebugBtn');
const debugPanel = document.getElementById('debugPanel');
const debugOutput = document.getElementById('debugOutput');

const {
  STATUS_OPTIONS,
  setMessage,
  sanitizeRow
} = window.PersoneelShared;

function resolveApiUrl() {
  const inlineApi = typeof API_URL === 'string' ? API_URL : '';
  const centralApi = window.EMS_STORE_CONFIG?.apiBaseUrl || '';
  return String(inlineApi || centralApi || '').trim();
}

function buildApiUrl(action) {
  const baseUrl = resolveApiUrl();
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}action=${encodeURIComponent(action)}`;
}

function normalizeApiPayload(data) {
  if (data?.ok === true) return data.data || {};
  if (data?.success === true) return data;
  throw new Error(data?.error || data?.message || 'Laden mislukt.');
}

// =========================
// INIT
// =========================

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  debugLog('DEBUG admin.js geladen');
  debugLog('API_URL = ' + resolveApiUrl());
  loadRows();
});

// =========================
// DEBUG
// =========================

function bindDebugEvents() {
  if (toggleDebugBtn) {
    toggleDebugBtn.addEventListener('click', toggleDebugPanel);
  }

  if (clearDebugBtn) {
    clearDebugBtn.addEventListener('click', clearDebugLog);
  }
}

function toggleDebugPanel() {
  debugVisible = !debugVisible;

  if (debugPanel) {
    debugPanel.hidden = !debugVisible;
  }

  if (toggleDebugBtn) {
    toggleDebugBtn.textContent = debugVisible ? 'Verberg debug' : 'Toon debug';
    toggleDebugBtn.classList.toggle('is-active', debugVisible);
  }
}

function clearDebugLog() {
  if (debugOutput) {
    debugOutput.textContent = 'Debug gewist...';
  }

  debugLog('Debuglog gewist');
}

function debugLog(text, data = null) {
  const time = new Date().toLocaleTimeString();
  let line = `[${time}] ${text}`;

  if (data !== null) {
    if (typeof data === 'string') {
      line += `\n${data}`;
    } else {
      try {
        line += `\n${JSON.stringify(data, null, 2)}`;
      } catch (error) {
        line += `\n[Kon data niet serialiseren]`;
      }
    }
  }


  if (debugOutput) {
    debugOutput.textContent += `\n${line}\n`;
    debugOutput.scrollTop = debugOutput.scrollHeight;
  }
}

// =========================
// EVENTS
// =========================

function bindEvents() {
  bindDebugEvents();

  loadBtn.addEventListener('click', () => {
    debugLog('Klik op Vernieuwen');
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
    const response = await fetch(buildApiUrl('list'), { method: 'GET', mode: 'cors', redirect: 'follow', cache: 'no-store' });
    debugLog('GET list response ontvangen', {
      ok: response.ok,
      status: response.status
    });

    if (!response.ok) {
      throw new Error(`HTTP-fout: ${response.status}`);
    }

    const data = await response.json();
    debugLog('GET list JSON parsed', data);

    const payload = normalizeApiPayload(data);

    staffRows = Array.isArray(payload.rows)
      ? payload.rows.map(sanitizeRow)
      : [];

    editStateByKey = {};
    applyFilter();

    setMessage(messageBox, 'Personeelslijst is geladen.', 'success');
    debugLog('Rows geladen: ' + staffRows.length);
  } catch (error) {
    setMessage(messageBox, error.message || 'Fout bij laden.', 'error');
    debugLog('FOUT loadRows', {
      message: error.message || String(error)
    });
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
        <td class="personeel-actions-cell">
          <div class="personeel-row-actions">
            ${
              isEditing
                ? `
                  <button class="btn btn-primary btn-sm" type="button" data-action="save" data-key="${escapeAttr(key)}">Opslaan</button>
                  <button class="btn btn-secondary btn-sm" type="button" data-action="cancel" data-key="${escapeAttr(key)}">Annuleren</button>
                `
                : `
                  <button class="btn btn-secondary btn-sm" type="button" data-action="edit" data-key="${escapeAttr(key)}">Bewerken</button>
                `
            }
          </div>
        </td>

        <td>
          <input
            class="personeel-input personeel-input--readonly"
            value="${escapeAttr(original.roepnummer)}"
            readonly
          >
        </td>

        <td>
          <input
            class="personeel-input"
            value="${escapeAttr(draft.naam)}"
            data-field="naam"
            data-key="${escapeAttr(key)}"
            ${isEditing ? '' : 'disabled'}
          >
        </td>

        <td>
          <input
            class="personeel-input personeel-input--readonly"
            value="${escapeAttr(original.rang)}"
            readonly
          >
        </td>

        <td>
          <input
            class="personeel-input"
            value="${escapeAttr(draft.afdeling)}"
            data-field="afdeling"
            data-key="${escapeAttr(key)}"
            ${isEditing ? '' : 'disabled'}
          >
        </td>

        <td>
          <select
            class="personeel-select ${getStatusClass(draft.status)}"
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

        <td class="personeel-checkbox-cell">
          <label class="personeel-checkbox-label">
            <input
              type="checkbox"
              ${draft.is_active ? 'checked' : ''}
              data-field="is_active"
              data-key="${escapeAttr(key)}"
              ${isEditing ? '' : 'disabled'}
            >
          </label>
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

  debugLog('draft gevalideerd', draft);

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

    debugLog('payload opgebouwd', payload);

    const result = await getSaveRow(payload);
    debugLog('GET save response', result);

    delete editStateByKey[key];

    await wait(700);
    debugLog('Lijst wordt herladen na save');
    await loadRows();

    setMessage(messageBox, `Rij ${draft.roepnummer} is opgeslagen.`, 'success');
  } catch (error) {
    setMessage(messageBox, error.message || 'Fout bij opslaan.', 'error');
    debugLog('FOUT saveRow', {
      message: error.message || String(error)
    });
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
  debugLog('GET save URL', url);

  const response = await fetch(url);
  debugLog('GET save HTTP response', {
    ok: response.ok,
    status: response.status
  });

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

function getStatusClass(status) {
  switch (String(status || '').toLowerCase()) {
    case 'actief':
      return 'personeel-badge--actief';
    case 'non-actief':
      return 'personeel-badge--non-actief';
    case 'verlof':
      return 'personeel-badge--verlof';
    case 'ziekte':
      return 'personeel-badge--ziekte';
    default:
      return 'personeel-badge--default';
  }
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