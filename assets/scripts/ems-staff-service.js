
/**
 * EMS Staff Service
 * -----------------
 * Robuuste dataservice voor personeels- en roepnummerdata.
 *
 * Ondersteunt:
 * - oude én nieuwe API-responseformaten
 * - fallback naar centrale EMS_STORE_CONFIG apiBaseUrl
 * - duidelijkere foutmeldingen bij fetch/CORS/proxy-problemen
 */

window.EmsStaffService = (() => {
  let cache = [];
  let lastLoadedAt = null;
  let apiUrl = '';

  function setApiUrl(url) {
    apiUrl = String(url || '').trim();
  }

  function getApiUrl() {
    return apiUrl;
  }

  function normalizeStatus(value) {
    const status = String(value || '').trim().toLowerCase();

    if (status === 'actief') return 'actief';
    if (status === 'verlof') return 'verlof';
    if (status === 'ziekte') return 'ziekte';
    if (status === 'non actief' || status === 'non-actief' || status === 'nonactief') {
      return 'non-actief';
    }

    return 'actief';
  }

  function toBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;

    const normalized = String(value || '').trim().toLowerCase();
    return ['true', '1', 'ja', 'yes', 'y'].includes(normalized);
  }

  function sanitizeRow(row) {
    return {
      roepnummer: String(row?.roepnummer || '').trim(),
      naam: String(row?.naam || '').trim(),
      rang: String(row?.rang || '').trim(),
      afdeling: String(row?.afdeling || '').trim(),
      status: normalizeStatus(row?.status),
      is_active: toBoolean(row?.is_active)
    };
  }

  function uniqueUrls(urls) {
    return [...new Set(urls.map(item => String(item || '').trim()).filter(Boolean))];
  }

  function getCandidateApiUrls() {
    const centralApi = window.EMS_STORE_CONFIG?.apiBaseUrl || '';
    const inlineApi = typeof window.API_URL === 'string' ? window.API_URL : '';
    return uniqueUrls([apiUrl, centralApi, inlineApi]);
  }

  function buildActionUrl(baseUrl, action) {
    const separator = String(baseUrl).includes('?') ? '&' : '?';
    return `${baseUrl}${separator}action=${encodeURIComponent(action)}`;
  }

  async function safeFetchJson(url) {
    let response;

    try {
      response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow',
        cache: 'no-store'
      });
    } catch (error) {
      throw new Error(`Netwerkfout bij ophalen van personeelsdata (${error.message || 'fetch mislukt'}).`);
    }

    if (!response.ok) {
      throw new Error(`Personeels-API gaf een HTTP-fout terug: ${response.status}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (error) {
      throw new Error('Personeels-API gaf geen geldige JSON terug.');
    }

    return data;
  }

  function extractRowsFromResponse(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Lege of ongeldige response van personeels-API.');
    }

    // Nieuw formaat: { ok: true, data: { rows: [...] } }
    if (data.ok === true) {
      return Array.isArray(data.data?.rows) ? data.data.rows : [];
    }

    // Oud formaat: { success: true, rows: [...] }
    if (data.success === true) {
      return Array.isArray(data.rows) ? data.rows : [];
    }

    const explicitMessage = data.error || data.message || data.data?.error || data.data?.message;
    if (explicitMessage) {
      throw new Error(explicitMessage);
    }

    throw new Error('Personeelslijst laden mislukt.');
  }

  async function load(forceReload = false) {
    if (!forceReload && cache.length) {
      return cache;
    }

    const candidateUrls = getCandidateApiUrls();
    if (!candidateUrls.length) {
      throw new Error('API URL is niet ingesteld voor de personeelslijst.');
    }

    let lastError = null;

    for (const baseUrl of candidateUrls) {
      try {
        const data = await safeFetchJson(buildActionUrl(baseUrl, 'readonly'));
        cache = extractRowsFromResponse(data).map(sanitizeRow);
        lastLoadedAt = new Date();
        apiUrl = baseUrl;
        return cache;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('Personeelslijst laden mislukt.');
  }

  function clearCache() {
    cache = [];
    lastLoadedAt = null;
  }

  async function getAll(forceReload = false) {
    return await load(forceReload);
  }

  async function getVisibleStaff(forceReload = false) {
    const rows = await load(forceReload);
    return rows.filter(row => row.is_active);
  }

  async function getByStatus(status, visibleOnly = true) {
    const rows = visibleOnly ? await getVisibleStaff() : await getAll();
    const normalized = normalizeStatus(status);
    return rows.filter(row => row.status === normalized);
  }

  async function getByRole(roles, options = {}) {
    const { visibleOnly = true, status = null } = options;
    const rows = visibleOnly ? await getVisibleStaff() : await getAll();
    const roleList = Array.isArray(roles) ? roles : [roles];
    const normalizedRoles = roleList.map(role => String(role || '').trim().toLowerCase());

    return rows.filter(row => {
      const matchesRole = normalizedRoles.includes(String(row.rang || '').trim().toLowerCase());
      const matchesStatus = status ? row.status === normalizeStatus(status) : true;
      return matchesRole && matchesStatus;
    });
  }

  async function getByDepartment(departments, options = {}) {
    const { visibleOnly = true, status = null } = options;
    const rows = visibleOnly ? await getVisibleStaff() : await getAll();
    const deptList = Array.isArray(departments) ? departments : [departments];
    const normalizedDepartments = deptList.map(item => String(item || '').trim().toLowerCase());

    return rows.filter(row => {
      const matchesDepartment = normalizedDepartments.includes(String(row.afdeling || '').trim().toLowerCase());
      const matchesStatus = status ? row.status === normalizeStatus(status) : true;
      return matchesDepartment && matchesStatus;
    });
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

  function sortByName(rows) {
    return [...rows].sort((a, b) => a.naam.localeCompare(b.naam, 'nl-BE'));
  }

  function buildOptionLabel(row, format = 'naam-roepnummer-rang') {
    switch (format) {
      case 'naam':
        return row.naam;
      case 'roepnummer-naam':
        return `${row.roepnummer} - ${row.naam}`;
      case 'naam-rang':
        return `${row.naam} (${row.rang})`;
      case 'naam-roepnummer':
        return `${row.naam} (${row.roepnummer})`;
      case 'naam-roepnummer-rang':
      default:
        return `${row.naam} (${row.roepnummer} - ${row.rang})`;
    }
  }

  function populateSelect(selectElement, rows, options = {}) {
    const {
      includeEmpty = true,
      emptyLabel = 'Selecteer...',
      labelFormat = 'naam-roepnummer-rang',
      valueField = 'roepnummer'
    } = options;

    if (!selectElement) return;

    const sortedRows = sortByName(rows);
    selectElement.innerHTML = '';

    if (includeEmpty) {
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = emptyLabel;
      selectElement.appendChild(emptyOption);
    }

    sortedRows.forEach(row => {
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

  return {
    setApiUrl,
    getApiUrl,
    load,
    clearCache,
    getAll,
    getVisibleStaff,
    getByStatus,
    getByRole,
    getByDepartment,
    getByCallSign,
    getByName,
    sortByName,
    buildOptionLabel,
    populateSelect,
    normalizeStatus,
    sanitizeRow,
    getLastLoadedAt: () => lastLoadedAt,
    getCandidateApiUrls
  };
})();
