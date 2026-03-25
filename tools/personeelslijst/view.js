/**
 * Personeelslijst read-only
 * Toolspecifieke logica voor de publieke of interne weergave.
 */

let staffRows = [];
let filteredRows = [];

const tableBody = document.getElementById('staffTableBody');
const searchInput = document.getElementById('searchInput');
const loadBtn = document.getElementById('loadBtn');
const messageBox = document.getElementById('messageBox');
const resultCount = document.getElementById('resultCount');

const {
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
    const response = await fetch(`${API_URL}?action=readonly`);

    if (!response.ok) {
      throw new Error(`HTTP-fout: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Laden mislukt.');
    }

    staffRows = Array.isArray(data.rows)
      ? data.rows.map(sanitizeRow).filter(row => row.is_active)
      : [];

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
        row.status
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
        <td colspan="5" class="personeel-empty-state">Geen resultaten gevonden.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filteredRows.map(row => `
    <tr>
      <td>${escapeHtml(row.roepnummer)}</td>
      <td>${escapeHtml(row.naam)}</td>
      <td>${escapeHtml(row.rang)}</td>
      <td>${escapeHtml(row.afdeling)}</td>
      <td>
        <span class="personeel-badge ${getStatusClass(row.status)}">
          ${escapeHtml(row.status)}
        </span>
      </td>
    </tr>
  `).join('');
}