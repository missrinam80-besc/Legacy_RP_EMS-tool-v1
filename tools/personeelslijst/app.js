/**
 * Personeelslijst read-only
 * Robuuste versie met centrale staff service en directe fetch fallback.
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
  setMessage,
  sanitizeRow
} = window.PersoneelShared;

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  initStaffApi();
  loadRows();
});

function resolveApiUrl() {
  return String(window.EMS_STORE_CONFIG?.apiBaseUrl || '').trim();
}

function initStaffApi() {
  if (window.EmsStaffService) {
    window.EmsStaffService.setApiUrl(resolveApiUrl());
  }
}

function bindEvents() {
  loadBtn?.addEventListener('click', loadRows);
  searchInput?.addEventListener('input', applyFilter);
}

function normalizeApiPayload(data) {
  if (data?.ok === true) return data.data || {};
  if (data?.success === true) return data;
  throw new Error(data?.error || data?.message || 'Personeelslijst laden mislukt.');
}

async function fetchVisibleRowsDirect() {
  const baseUrl = resolveApiUrl();
  if (!baseUrl) {
    throw new Error('Geen personeels-API geconfigureerd.');
  }

  const separator = baseUrl.includes('?') ? '&' : '?';
  const response = await fetch(`${baseUrl}${separator}action=readonly`, {
    method: 'GET',
    mode: 'cors',
    redirect: 'follow',
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Personeels-API gaf een HTTP-fout terug: ${response.status}`);
  }

  const data = await response.json();
  const payload = normalizeApiPayload(data);
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  return rows.map(sanitizeRow).filter(row => row.is_active);
}

async function getVisibleRows() {
  if (window.EmsStaffService && typeof window.EmsStaffService.getVisibleStaff === 'function') {
    return await window.EmsStaffService.getVisibleStaff(true);
  }
  return await fetchVisibleRowsDirect();
}

async function loadRows() {
  loadBtn.disabled = true;
  setMessage(messageBox, 'Personeelslijst wordt geladen...', 'info');

  try {
    staffRows = await getVisibleRows();
    applyFilter();

    const loadedAt = window.EmsStaffService?.getLastLoadedAt?.();
    const suffix = loadedAt
      ? ` Laatst opgehaald: ${loadedAt.toLocaleString('nl-BE')}.`
      : '';

    setMessage(messageBox, `Personeelslijst is geladen.${suffix}`, 'success');
  } catch (error) {
    const hint = ' Controleer of de Apps Script webapp publiek bereikbaar is en naar de juiste deploy-URL wijst.';
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
        <span class="personeel-badge ${getStatusClass(row.status)}">${escapeHtml(row.status)}</span>
      </td>
    </tr>
  `).join('');
}
