/**
 * Personeelslijst admin
 * Rij-per-rij bewerken en opslaan (CORS-proof versie)
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
  setMessage(messageBox, 'Personeelslijst wordt geladen...', 'info');

  try {
    const response = await fetch(`${API_URL}?action=list`);
    const data = await response.json();

    if (!data.success) throw new Error(data.message || 'Laden mislukt.');

    staffRows = data.rows.map(sanitizeRow);
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

  resultCount.textContent = filteredRows.length;
  renderTable();
}

function renderTable() {
  if (!filteredRows.length) {
    tableBody.innerHTML = `<tr><td colspan="7">Geen resultaten gevonden.</td></tr>`;
    return;
  }

  tableBody.innerHTML = filteredRows.map(row => {
    const key = getRowKey(row);
    const isEditing = !!editStateByKey[key];

    const draft = isEditing ? editStateByKey[key].draft : row;
    const original = isEditing ? editStateByKey[key].original : row;

    return `
      <tr>
        <td>
          ${isEditing ? `
            <button data-action="save" data-key="${key}">Opslaan</button>
            <button data-action="cancel" data-key="${key}">Annuleren</button>
          ` : `
            <button data-action="edit" data-key="${key}">Bewerken</button>
          `}
        </td>

        <td><input value="${original.roepnummer}" disabled></td>
        <td><input value="${draft.naam}" data-field="naam" data-key="${key}" ${isEditing ? '' : 'disabled'}></td>
        <td><input value="${original.rang}" disabled></td>
        <td><input value="${draft.afdeling}" data-field="afdeling" data-key="${key}" ${isEditing ? '' : 'disabled'}></td>

        <td>
          <select data-field="status" data-key="${key}" ${isEditing ? '' : 'disabled'}>
            ${STATUS_OPTIONS.map(s =>
              `<option ${s === draft.status ? 'selected' : ''}>${s}</option>`
            ).join('')}
          </select>
        </td>

        <td>
          <input type="checkbox" ${draft.is_active ? 'checked' : ''} data-field="is_active" data-key="${key}" ${isEditing ? '' : 'disabled'}>
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
    editStateByKey[key] = { original: { ...row }, draft: { ...row } };
    renderTable();
  }

  if (action === 'cancel') {
    delete editStateByKey[key];
    renderTable();
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

  const draft = sanitizeRow(editStateByKey[key].draft);

  setMessage(messageBox, 'Opslaan...', 'info');

  try {
    await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({
        action: 'saveRow',
        actor,
        row: draft
      })
    });

    setMessage(messageBox, 'Opgeslagen. Lijst wordt vernieuwd...', 'success');

    delete editStateByKey[key];

    setTimeout(loadRows, 1200);
  } catch (err) {
    setMessage(messageBox, err.message || 'Fout bij opslaan', 'error');
  }
}

function getRowKey(row) {
  return String(row.roepnummer || '').trim();
}