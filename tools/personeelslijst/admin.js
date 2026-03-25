/**
 * Personeelslijst admin
 * Rij-per-rij bewerken en opslaan via hidden form POST in een verborgen iframe.
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
  setRowButtonsDisabled(true);
  setMessage(messageBox, 'Personeelslijst wordt geladen...', 'info');

  try {
    const response = await fetch(`${API_URL}?action=list`);
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
    setRowButtonsDisabled(false);
  }
}

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
        ].some(v => String(v || '').toLowerCase().includes(query))
      );

  resultCount.textContent = String(filteredRows.length);
  renderTable();
}

function renderTable() {
  if (!filteredRows.length) {
    tableBody.innerHTML = `<tr><td colspan="7" class="personeel-empty-state">Geen resultaten gevonden.</td></tr>`;
    return;
  }

  tableBody.innerHTML = filteredRows.map(row => {
    const key = getRowKey(row);
    const isEditing = !!editStateByKey[key];

    const draft = isEditing ? editStateByKey[key].draft : row;
    const original = isEditing ? editStateByKey[key].original : row;

    return `
      <tr class="${isEditing ? 'personeel-row--editing' : ''}">
        <td>
          ${isEditing ? `
            <button type="button" data-action="save" data-key="${escapeAttr(key)}">Opslaan</button>
            <button type="button" data-action="cancel" data-key="${escapeAttr(key)}">Annuleren</button>
          ` : `
            <button type="button" data-action="edit" data-key="${escapeAttr(key)}">Bewerken</button>
          `}
        </td>

        <td><input value="${escapeAttr(original.roepnummer)}" disabled></td>
        <td><input value="${escapeAttr(draft.naam)}" data-field="naam" data-key="${escapeAttr(key)}" ${isEditing ? '' : 'disabled'}></td>
        <td><input value="${escapeAttr(original.rang)}" disabled></td>
        <td><input value="${escapeAttr(draft.afdeling)}" data-field="afdeling" data-key="${escapeAttr(key)}" ${isEditing ? '' : 'disabled'}></td>

        <td>
          <select data-field="status" data-key="${escapeAttr(key)}" ${isEditing ? '' : 'disabled'}>
            ${STATUS_OPTIONS.map(s =>
              `<option value="${escapeAttr(s)}" ${s === draft.status ? 'selected' : ''}>${s}</option>`
            ).join('')}
          </select>
        </td>

        <td>
          <input type="checkbox" ${draft.is_active ? 'checked' : ''} data-field="is_active" data-key="${escapeAttr(key)}" ${isEditing ? '' : 'disabled'}>
        </td>
      </tr>
    `;
  }).join('');

  bindTableInputs();
}

function bindTableInputs() {
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.onclick = handleAction;
  });

  document.querySelectorAll('[data-field]').forEach(el => {
    el.oninput = updateDraft;
    el.onchange = updateDraft;
  });
}

function handleAction(e) {
  const key = e.target.dataset.key;
  const action = e.target.dataset.action;

  if (action === 'edit') {
    const row = staffRows.find(r => getRowKey(r) === key);
    if (!row) return;

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
    return;
  }

  if (action === 'save') {
    saveRow(key);
  }
}

function updateDraft(e) {
  const key = e.target.dataset.key;
  const field = e.target.dataset.field;

  if (!editStateByKey[key]) return;

  editStateByKey[key].draft[field] =
    e.target.type === 'checkbox'
      ? e.target.checked
      : e.target.value;
}

async function saveRow(key) {
  const actor = actorInput.value.trim();

  if (!actor) {
    setMessage(messageBox, 'Vul eerst je naam in.', 'error');
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

  loadBtn.disabled = true;
  setRowButtonsDisabled(true);
  setMessage(messageBox, `Rij ${draft.roepnummer} wordt opgeslagen...`, 'info');

  try {
    await submitPayloadViaHiddenForm({
      action: 'saveRow',
      actor,
      row: {
        roepnummer: draft.roepnummer,
        naam: draft.naam,
        afdeling: draft.afdeling,
        status: draft.status,
        is_active: draft.is_active
      }
    });

    delete editStateByKey[key];
    await loadRows();
    setMessage(messageBox, `Rij ${draft.roepnummer} is opgeslagen.`, 'success');
  } catch (error) {
    setMessage(messageBox, error.message || 'Fout bij opslaan.', 'error');
  } finally {
    loadBtn.disabled = false;
    setRowButtonsDisabled(false);
  }
}

function submitPayloadViaHiddenForm(payload) {
  return new Promise((resolve, reject) => {
    try {
      const iframeName = 'hiddenSubmitFrame';

      let iframe = document.getElementById(iframeName);
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.name = iframeName;
        iframe.id = iframeName;
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
      }

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = API_URL;
      form.target = iframeName;
      form.style.display = 'none';

      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'payload';
      input.value = JSON.stringify(payload);

      form.appendChild(input);
      document.body.appendChild(form);

      let done = false;

      const cleanup = () => {
        if (form && form.parentNode) {
          form.parentNode.removeChild(form);
        }
      };

      iframe.onload = () => {
        if (done) return;
        done = true;
        cleanup();
        resolve();
      };

      form.submit();

      // fallback indien onload niet betrouwbaar triggert
      setTimeout(() => {
        if (done) return;
        done = true;
        cleanup();
        resolve();
      }, 1200);
    } catch (error) {
      reject(error);
    }
  });
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

function getRowKey(row) {
  return String(row.roepnummer || '').trim();
}

function setRowButtonsDisabled(disabled) {
  document.querySelectorAll('#staffTableBody button').forEach(button => {
    button.disabled = disabled;
  });
}

function escapeAttr(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}