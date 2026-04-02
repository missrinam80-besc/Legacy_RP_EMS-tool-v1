
/**
 * Personeelslijst read-only
 * Robuuste versie met centrale staff service en fallback-API.
 */

let staffRows = [];
let filteredRows = [];

const tableBody = document.getElementById('staffTableBody');
const searchInput = document.getElementById('searchInput');
const loadBtn = document.getElementById('loadBtn');
const messageBox = document.getElementById('messageBox');
const resultCount = document.getElementById('resultCount');

const {
  getStatusClass,
  escapeHtml,
  setMessage
} = window.PersoneelShared;

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  initStaffApi();
  loadRows();
});

function initStaffApi() {
  const fallbackApi = window.EMS_STORE_CONFIG?.apiBaseUrl || '';
  const inlineApi = typeof window.API_URL === 'string' ? window.API_URL : '';

  if (window.EmsStaffService) {
    window.EmsStaffService.setApiUrl(inlineApi || fallbackApi);
  }
}

function bindEvents() {
  loadBtn?.addEventListener('click', loadRows);
  searchInput?.addEventListener('input', applyFilter);
}

async function loadRows() {
  if (!window.EmsStaffService) {
    setMessage(messageBox, 'Personeelsservice is niet geladen.', 'error');
    return;
  }

  loadBtn.disabled = true;
  setMessage(messageBox, 'Personeelslijst wordt geladen...', 'info');

  try {
    staffRows = await window.EmsStaffService.getVisibleStaff(true);
    applyFilter();

    const loadedAt = window.EmsStaffService.getLastLoadedAt();
    const suffix = loadedAt
      ? ` Laatst opgehaald: ${loadedAt.toLocaleString('nl-BE')}.`
      : '';

    setMessage(messageBox, `Personeelslijst is geladen.${suffix}`, 'success');
  } catch (error) {
    const hint = ' Controleer of de Apps Script webapp publiek bereikbaar en opnieuw gedeployed is.';
    setMessage(messageBox, (error.message || 'Fout bij laden.') + hint, 'error');
  } finally {
    loadBtn.disabled = false;
  }
}

function applyFilter() {
  const query = String(searchInput?.value || '').trim().toLowerCase();

  if (!query) {
    filteredRows = [...staffRows];
  } else {
    filteredRows = staffRows.filter(row => {
      return [row.roepnummer, row.naam, row.rang, row.afdeling, row.status]
        .some(value => String(value || '').toLowerCase().includes(query));
    });
  }

  if (resultCount) {
    resultCount.textContent = String(filteredRows.length);
  }

  renderTable();
}

function renderTable() {
  if (!tableBody) return;

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
