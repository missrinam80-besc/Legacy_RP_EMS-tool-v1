/**
 * EMS Staff Service
 * -----------------
 * Centrale dataservice voor personeelsgegevens.
 * Werkt met zowel het oude API-formaat {success, rows}
 * als het nieuwe formaat {ok, data:{rows}}.
 */
(function initStaffService(global) {
  const existing = global.EmsStaffService;
  if (existing && typeof existing.getAll === 'function') {
    return;
  }

  let cache = [];
  let lastLoadedAt = null;
  let apiUrl = '';

  function setApiUrl(url) {
    apiUrl = String(url || '').trim();
  }

  function getApiUrl() {
    return apiUrl;
  }

  function getFallbackApiUrl() {
    try {
      if (global.EMS_STORE_CONFIG && typeof global.EMS_STORE_CONFIG.apiBaseUrl === 'string') {
        return global.EMS_STORE_CONFIG.apiBaseUrl.trim();
      }
    } catch (error) {}
    try {
      if (global.API_URL) {
        return String(global.API_URL).trim();
      }
    } catch (error) {}
    return '';
  }

  function normalizeStatus(value) {
    const status = String(value || '').trim().toLowerCase();
    if (status === 'actief') return 'actief';
    if (status === 'verlof') return 'verlof';
    if (status === 'ziekte' || status === 'ziek') return 'ziekte';
    if (['non actief', 'non-actief', 'nonactief', 'inactief'].includes(status)) return 'non-actief';
    return status || 'actief';
  }

  function toBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    const normalized = String(value || '').trim().toLowerCase();
    return ['true', '1', 'ja', 'yes', 'y', 'zichtbaar', 'actief'].includes(normalized);
  }

  function sanitizeRow(row) {
    return {
      roepnummer: String(row.roepnummer || row.callSign || '').trim(),
      naam: String(row.naam || row.name || '').trim(),
      rang: String(row.rang || row.role || '').trim(),
      afdeling: String(row.afdeling || row.department || '').trim(),
      status: normalizeStatus(row.status),
      is_active: toBoolean(row.is_active ?? row.visible ?? row.zichtbaar ?? true)
    };
  }

  function extractRows(payload) {
    if (!payload || typeof payload !== 'object') return [];
    if (Array.isArray(payload.rows)) return payload.rows;
    if (payload.success === true && Array.isArray(payload.rows)) return payload.rows;
    if (payload.ok === true && payload.data && Array.isArray(payload.data.rows)) return payload.data.rows;
    if (payload.ok === true && Array.isArray(payload.data)) return payload.data;
    return [];
  }

  function isSuccessPayload(payload) {
    return !!(
      payload && (
        payload.success === true ||
        payload.ok === true ||
        Array.isArray(payload.rows) ||
        (payload.data && Array.isArray(payload.data.rows))
      )
    );
  }

  async function fetchRowsFrom(url, action='readonly') {
    const target = String(url || '').trim();
    if (!target) throw new Error('API URL is niet ingesteld.');
    const separator = target.includes('?') ? '&' : '?';
    const response = await fetch(`${target}${separator}action=${encodeURIComponent(action)}`);
    if (!response.ok) {
      throw new Error(`Personeels-API gaf een HTTP-fout terug: ${response.status}`);
    }
    const data = await response.json();
    if (!isSuccessPayload(data)) {
      throw new Error(data?.message || data?.error || 'Personeelslijst laden mislukt.');
    }
    return extractRows(data).map(sanitizeRow);
  }

  async function load(forceReload = false) {
    if (!forceReload && cache.length) return cache;
    const candidates = [getApiUrl(), getFallbackApiUrl()].filter(Boolean);
    if (!candidates.length) throw new Error('Geen personeels-API geconfigureerd. Controleer EMS_STORE_CONFIG.apiBaseUrl.');

    let lastError = null;
    for (const candidate of [...new Set(candidates)]) {
      try {
        cache = await fetchRowsFrom(candidate, 'readonly');
        apiUrl = candidate;
        lastLoadedAt = new Date();
        return cache;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('Personeelslijst laden mislukt.');
  }

  function clearCache() { cache = []; lastLoadedAt = null; }
  async function getAll(forceReload = false) { return await load(forceReload); }
  async function getVisibleStaff(forceReload = false) { return (await load(forceReload)).filter(r => r.is_active); }
  async function getByStatus(status, visibleOnly = true) {
    const rows = visibleOnly ? await getVisibleStaff() : await getAll();
    const normalized = normalizeStatus(status);
    return rows.filter(row => row.status === normalized);
  }
  async function getByRole(roles, options = {}) {
    const { visibleOnly = true, status = null } = options;
    const rows = visibleOnly ? await getVisibleStaff() : await getAll();
    const list = (Array.isArray(roles) ? roles : [roles]).map(v => String(v || '').trim().toLowerCase());
    return rows.filter(row => list.includes(String(row.rang || '').trim().toLowerCase()) && (!status || row.status === normalizeStatus(status)));
  }
  async function getByDepartment(departments, options = {}) {
    const { visibleOnly = true, status = null } = options;
    const rows = visibleOnly ? await getVisibleStaff() : await getAll();
    const list = (Array.isArray(departments) ? departments : [departments]).map(v => String(v || '').trim().toLowerCase());
    return rows.filter(row => list.includes(String(row.afdeling || '').trim().toLowerCase()) && (!status || row.status === normalizeStatus(status)));
  }
  async function getByCallSign(roepnummer, visibleOnly = true) {
    const rows = visibleOnly ? await getVisibleStaff() : await getAll();
    const target = String(roepnummer || '').trim();
    return rows.find(row => row.roepnummer === target) || null;
  }
  async function getByName(name, visibleOnly = true) {
    const rows = visibleOnly ? await getVisibleStaff() : await getAll();
    const target = String(name || '').trim().toLowerCase();
    return rows.find(row => String(row.naam || '').trim().toLowerCase() === target) || null;
  }
  function sortByName(rows) { return [...rows].sort((a, b) => a.naam.localeCompare(b.naam, 'nl-BE')); }
  function buildOptionLabel(row, format = 'naam-roepnummer-rang') {
    switch (format) {
      case 'naam': return row.naam;
      case 'roepnummer-naam': return `${row.roepnummer} - ${row.naam}`;
      case 'naam-rang': return `${row.naam} (${row.rang})`;
      case 'naam-roepnummer': return `${row.naam} (${row.roepnummer})`;
      default: return `${row.naam} (${row.roepnummer} - ${row.rang})`;
    }
  }
  function populateSelect(selectElement, rows, options = {}) {
    const { includeEmpty = true, emptyLabel = 'Selecteer...', labelFormat = 'naam-roepnummer-rang', valueField = 'roepnummer' } = options;
    if (!selectElement) return;
    selectElement.innerHTML = '';
    if (includeEmpty) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = emptyLabel;
      selectElement.appendChild(opt);
    }
    sortByName(rows).forEach(row => {
      const option = document.createElement('option');
      option.value = row[valueField] || '';
      option.textContent = buildOptionLabel(row, labelFormat);
      option.dataset.naam = row.naam;
      option.dataset.roepnummer = row.roepnummer;
      option.dataset.rang = row.rang;
      option.dataset.afdeling = row.afdeling;
      option.dataset.status = row.status;
      selectElement.appendChild(option);
    });
  }

  global.EmsStaffService = {
    setApiUrl, getApiUrl, load, clearCache, getAll, getVisibleStaff,
    getByStatus, getByRole, getByDepartment, getByCallSign, getByName,
    sortByName, buildOptionLabel, populateSelect, normalizeStatus, sanitizeRow,
    getLastLoadedAt: () => lastLoadedAt
  };
})(window);
