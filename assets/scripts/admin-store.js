(function (global) {
  const LEGACY_KEY_MAP = {
    ems_admin_theme: 'theme',
    ems_admin_modules: 'modules',
    ems_admin_prices: 'prices',
    ems_admin_medication: 'medication',
    ems_admin_injuries: 'injuries',
    ems_admin_treatment_rules: 'treatmentRules'
  };

  function ensureStore() {
    if (!global.EMSAdminStore) {
      throw new Error('EMSAdminStore ontbreekt. Laad eerst store-config.js, api-client.js en admin-store.js.');
    }
  }

  async function fetchJson(path) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Kon ${path} niet laden (${response.status})`);
    }
    return response.json();
  }

  function readLocal(storageKey) {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn(`Ongeldige lokale admin data voor ${storageKey}.`, error);
      return null;
    }
  }

  function saveAdminData(storageKey, data) {
    const type = LEGACY_KEY_MAP[storageKey];

    if (type && global.EMSAdminStore) {
      global.EMSAdminStore.clearCache(type);
      localStorage.setItem(storageKey, JSON.stringify(data));
      return data;
    }

    localStorage.setItem(storageKey, JSON.stringify(data));
    return data;
  }

  function removeAdminData(storageKey) {
    const type = LEGACY_KEY_MAP[storageKey];
    if (type && global.EMSAdminStore) {
      global.EMSAdminStore.clearCache(type);
    }
    localStorage.removeItem(storageKey);
  }

  function mergeWithDefaults(defaultData, savedData) {
    if (!savedData || typeof savedData !== 'object') {
      return structuredClone(defaultData);
    }

    const merged = structuredClone(defaultData);

    Object.keys(savedData).forEach((key) => {
      merged[key] = savedData[key];
    });

    return merged;
  }

  async function loadAdminData(storageKey, defaultPath) {
    const type = LEGACY_KEY_MAP[storageKey];

    if (type && global.EMSAdminStore) {
      const data = await global.EMSAdminStore.get(type);
      return structuredClone(data);
    }

    const defaults = await fetchJson(defaultPath);
    const savedData = readLocal(storageKey);
    return mergeWithDefaults(defaults, savedData);
  }

  async function resetAdminData(storageKey, defaultPath) {
    const type = LEGACY_KEY_MAP[storageKey];

    if (type && global.EMSAdminStore) {
      global.EMSAdminStore.clearCache(type);
    }

    const defaults = await fetchJson(defaultPath);
    localStorage.setItem(storageKey, JSON.stringify(defaults));
    return defaults;
  }

  function exportAdminData(data, filename = 'export.json') {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function importAdminData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result || '{}');
          resolve(data);
        } catch (error) {
          reject(new Error('Het JSON-bestand kon niet gelezen worden.'));
        }
      };

      reader.onerror = () => reject(new Error('Het bestand kon niet gelezen worden.'));
      reader.readAsText(file);
    });
  }

  async function getAdminCollection(storageKey, defaultPath, itemKey = 'items') {
    const data = await loadAdminData(storageKey, defaultPath);
    return Array.isArray(data?.[itemKey]) ? data[itemKey] : Array.isArray(data) ? data : [];
  }

  function getStoredCollection(storageKey, itemKey = 'items') {
    const data = readLocal(storageKey);
    if (Array.isArray(data?.[itemKey])) return data[itemKey];
    if (Array.isArray(data)) return data;
    return [];
  }

  async function getByType(type, options = {}) {
    ensureStore();
    return global.EMSAdminStore.get(type, options);
  }

  async function saveByType(type, data, actor = 'frontend') {
    ensureStore();
    return global.EMSAdminStore.save(type, data, actor);
  }

  async function refreshByType(type) {
    ensureStore();
    return global.EMSAdminStore.refresh(type);
  }

  function clearTypeCache(type) {
    ensureStore();
    global.EMSAdminStore.clearCache(type);
  }

  function clearAllCache() {
    ensureStore();
    global.EMSAdminStore.clearAllCache();
  }

  global.AdminStore = {
    fetchJson,
    loadAdminData,
    saveAdminData,
    removeAdminData,
    resetAdminData,
    exportAdminData,
    importAdminData,
    mergeWithDefaults,
    getAdminCollection,
    getStoredCollection,
    readLocal,
    getByType,
    saveByType,
    refreshByType,
    clearTypeCache,
    clearAllCache
  };
})(window);