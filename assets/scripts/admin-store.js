(function (global) {
  const LEGACY_KEY_MAP = {
    ems_admin_theme: 'theme',
    ems_admin_modules: 'modules',
    ems_admin_prices: 'prices',
    ems_admin_medication: 'medication',
    ems_admin_injuries: 'injuries',
    ems_admin_treatment_rules: 'treatmentRules'
  };

  const storeConfig = global.EMS_STORE_CONFIG || {};

  function getTypeConfig(type) {
    const cfg = storeConfig.configTypes?.[type];
    if (!cfg) throw new Error(`Onbekend configtype: ${type}`);
    return cfg;
  }

  function getCacheKey(type) {
    return `${storeConfig.cachePrefix || 'ems_admin_cache_'}${type}`;
  }

  function getLocalKey(type) {
    const cfg = getTypeConfig(type);
    return `${storeConfig.localPrefix || 'ems_admin_local_'}${cfg.localKey || type}`;
  }

  function structuredCloneSafe(value) {
    if (typeof structuredClone === 'function') {
      return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
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

  function readCache(type) {
    if (!storeConfig.cacheEnabled) return null;
    const cached = readLocal(getCacheKey(type));
    if (!cached?.expiresAt || Date.now() > cached.expiresAt) return null;
    return cached.value;
  }

  function writeCache(type, value) {
    if (!storeConfig.cacheEnabled) return;
    localStorage.setItem(getCacheKey(type), JSON.stringify({
      expiresAt: Date.now() + (storeConfig.cacheTtlMs || 300000),
      value
    }));
  }

  function clearCache(type) {
    localStorage.removeItem(getCacheKey(type));
  }

  function clearAllCache() {
    Object.keys(storeConfig.configTypes || {}).forEach(clearCache);
  }

  function saveLocalType(type, value) {
    localStorage.setItem(getLocalKey(type), JSON.stringify(value));
  }

  function readLocalType(type) {
    return readLocal(getLocalKey(type));
  }

  function mergeWithDefaults(defaultData, savedData) {
    if (!savedData || typeof savedData !== 'object') {
      return structuredCloneSafe(defaultData);
    }

    const merged = structuredCloneSafe(defaultData);
    Object.keys(savedData).forEach((key) => {
      merged[key] = savedData[key];
    });
    return merged;
  }

  function toBool(value) {
    if (value === true || value === false) return value;
    const normalized = String(value || '').trim().toLowerCase();
    if (['true', '1', 'yes', 'ja', 'waar', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'nee', 'off', 'onwaar'].includes(normalized)) return false;
    return false;
  }

  function normalizeThemeRows(rows) {
    const theme = {
      colors: {}
    };

    rows.filter((row) => toBool(row.active ?? true)).forEach((row) => {
      const key = String(row.key || '').trim();
      const value = row.value;
      if (!key) return;

      if (key.startsWith('color_')) {
        theme.colors[key.replace(/^color_/, '')] = value;
      } else if (row.type === 'boolean') {
        theme[key] = toBool(value);
      } else {
        theme[key] = value;
      }
    });

    return theme;
  }

  function normalizeApiData(type, payload) {
    if (payload == null) return payload;

    const data = payload.data ?? payload;

    if (type === 'theme') {
      if (Array.isArray(data)) return normalizeThemeRows(data);
      if (Array.isArray(data?.items)) return normalizeThemeRows(data.items);
      return data;
    }

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data;
    return data;
  }

  async function fetchDefaultsByType(type) {
    const cfg = getTypeConfig(type);
    return fetchJson(cfg.defaultPath);
  }

  async function fetchApiType(type) {
    if (!global.EMSApiClient?.apiGet) {
      throw new Error('EMSApiClient ontbreekt.');
    }

    const cfg = getTypeConfig(type);
    const data = await global.EMSApiClient.apiGet({
      action: 'getConfig',
      type: cfg.apiType
    });

    return normalizeApiData(type, data);
  }

  async function getType(type, options = {}) {
    const { forceRefresh = false } = options;

    if (!forceRefresh) {
      const cached = readCache(type);
      if (cached != null) return structuredCloneSafe(cached);
    }

    try {
      const apiData = await fetchApiType(type);
      writeCache(type, apiData);
      saveLocalType(type, apiData);
      return structuredCloneSafe(apiData);
    } catch (apiError) {
      console.warn(`[EMSAdminStore] API fallback voor ${type}.`, apiError);

      const localData = readLocalType(type);
      if (localData != null) {
        writeCache(type, localData);
        return structuredCloneSafe(localData);
      }

      const defaults = await fetchDefaultsByType(type);
      writeCache(type, defaults);
      saveLocalType(type, defaults);
      return structuredCloneSafe(defaults);
    }
  }

  async function saveType(type, data, actor = 'frontend') {
    const payload = normalizeApiData(type, data);

    try {
      if (!global.EMSApiClient?.apiPost) {
        throw new Error('EMSApiClient ontbreekt.');
      }

      await global.EMSApiClient.apiPost({
        action: 'saveConfig',
        type: getTypeConfig(type).apiType,
        data: payload,
        actor
      });
    } catch (error) {
      console.warn(`[EMSAdminStore] API save fallback voor ${type}. Data wordt lokaal bewaard.`, error);
    }

    saveLocalType(type, payload);
    writeCache(type, payload);
    return structuredCloneSafe(payload);
  }

  async function refreshType(type) {
    clearCache(type);
    return getType(type, { forceRefresh: true });
  }

  if (!global.EMSAdminStore) {
    global.EMSAdminStore = {
      get: getType,
      save: saveType,
      refresh: refreshType,
      clearCache,
      clearAllCache
    };
  }

  function saveAdminData(storageKey, data) {
    const type = LEGACY_KEY_MAP[storageKey];
    if (type) {
      saveLocalType(type, data);
      clearCache(type);
      return data;
    }

    localStorage.setItem(storageKey, JSON.stringify(data));
    return data;
  }

  function removeAdminData(storageKey) {
    const type = LEGACY_KEY_MAP[storageKey];
    if (type) {
      localStorage.removeItem(getLocalKey(type));
      clearCache(type);
      return;
    }
    localStorage.removeItem(storageKey);
  }

  async function loadAdminData(storageKey, defaultPath) {
    const type = LEGACY_KEY_MAP[storageKey];

    if (type) {
      const data = await global.EMSAdminStore.get(type);
      return structuredCloneSafe(data);
    }

    const defaults = await fetchJson(defaultPath);
    const savedData = readLocal(storageKey);
    return mergeWithDefaults(defaults, savedData);
  }

  async function resetAdminData(storageKey, defaultPath) {
    const type = LEGACY_KEY_MAP[storageKey];

    if (type) {
      localStorage.removeItem(getLocalKey(type));
      clearCache(type);
    }

    const defaults = await fetchJson(defaultPath);

    if (type) {
      saveLocalType(type, defaults);
      writeCache(type, defaults);
    } else {
      localStorage.setItem(storageKey, JSON.stringify(defaults));
    }

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
    return global.EMSAdminStore.get(type, options);
  }

  async function saveByType(type, data, actor = 'frontend') {
    return global.EMSAdminStore.save(type, data, actor);
  }

  async function refreshByType(type) {
    return global.EMSAdminStore.refresh(type);
  }

  function clearTypeCache(type) {
    global.EMSAdminStore.clearCache(type);
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
