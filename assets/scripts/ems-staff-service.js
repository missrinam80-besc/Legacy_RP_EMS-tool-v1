/**
 * EMS Staff Service
 * -----------------
 * Centrale dataservice voor de personeelslijst.
 *
 * Doel:
 * - personeelsdata ophalen uit de bestaande Apps Script API
 * - gegevens normaliseren
 * - herbruikbare helpers voorzien voor dropdowns en autofill
 *
 * Gebruik:
 * - laden in elke tool die personeel nodig heeft
 * - daarna functies gebruiken via window.EmsStaffService
 */

window.EmsStaffService = (() => {
  let cache = [];
  let lastLoadedAt = null;

  /**
   * Normaliseert statuswaarden naar vaste waarden.
   */
  function normalizeStatus(value) {
    const status = String(value || '').trim().toLowerCase();

    if (status === 'actief') return 'actief';
    if (status === 'verlof') return 'verlof';
    if (status === 'non actief' || status === 'non-actief' || status === 'nonactief') return 'non-actief';

    return 'actief';
  }

  /**
   * Zet één rij om naar een consistente structuur.
   */
  function sanitizeRow(row) {
    return {
      roepnummer: String(row.roepnummer || '').trim(),
      naam: String(row.naam || '').trim(),
      rang: String(row.rang || '').trim(),
      afdeling: String(row.afdeling || '').trim(),
      status: normalizeStatus(row.status),
      is_active: !!row.is_active
    };
  }

  /**
   * Haalt read-only personeelsdata op via de API.
   * Resultaat wordt gecachet in memory.
   */
  async function load(forceReload = false) {
    if (!forceReload && cache.length) {
      return cache;
    }

    if (typeof API_URL !== 'string' || !API_URL) {
      throw new Error('API_URL is niet ingesteld.');
    }

    const response = await fetch(`${API_URL}?action=readonly`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Personeelslijst laden mislukt.');
    }

    cache = Array.isArray(data.rows) ? data.rows.map(sanitizeRow) : [];
    lastLoadedAt = new Date();

    return cache;
  }

  /**
   * Geeft alle geladen medewerkers terug.
   * Als nog niet geladen: eerst laden.
   */
  async function getAll(forceReload = false) {
    return await load(forceReload);
  }

  /**
   * Geeft alleen zichtbare medewerkers terug.
   */
  async function getVisibleStaff(forceReload = false) {
    const rows = await load(forceReload);
    return rows.filter(row => row.is_active);
  }

  /**
   * Filter op status.
   * Voorbeeld: getByStatus('actief')
   */
  async function getByStatus(status, visibleOnly = true) {
    const rows = visibleOnly ? await getVisibleStaff() : await getAll();
    const normalized = normalizeStatus(status);

    return rows.filter(row => row.status === normalized);
  }

  /**
   * Filter op rang.
   * Ondersteunt 1 rang of array van rangen.
   */
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

  /**
   * Filter op afdeling.
   */
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

  /**
   * Zoek medewerker op roepnummer.
   */
  async function getByCallSign(roepnummer, visibleOnly = true) {
    const rows = visibleOnly ? await getVisibleStaff() : await getAll();
    const target = String(roepnummer || '').trim();

    return rows.find(row => row.roepnummer === target) || null;
  }

  /**
   * Zoek medewerker op naam.
   */
  async function getByName(name, visibleOnly = true) {
    const rows = visibleOnly ? await getVisibleStaff() : await getAll();
    const target = String(name || '').trim().toLowerCase();

    return rows.find(row => String(row.naam || '').trim().toLowerCase() === target) || null;
  }

  /**
   * Sorteert personeel alfabetisch op naam.
   */
  function sortByName(rows) {
    return [...rows].sort((a, b) => a.naam.localeCompare(b.naam, 'nl-BE'));
  }

  /**
   * Bouwt label voor dropdowns.
   */
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

  /**
   * Vult een select-element met medewerkers.
   *
   * options:
   * - includeEmpty
   * - emptyLabel
   * - labelFormat
   * - valueField: 'roepnummer' of 'naam'
   */
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
    load,
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
    getLastLoadedAt: () => lastLoadedAt
  };
})();
