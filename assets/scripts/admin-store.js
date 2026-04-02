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

  function toBool(value) {
    if (value === true || value === false) return value;
    const normalized = String(value || '').trim().toLowerCase();
    if (['true', '1', 'yes', 'ja', 'waar', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'nee', 'off', 'onwaar'].includes(normalized)) return false;
    return false;
  }

  function normalizeThemeRows(rows) {
    const theme = { colors: {} };

    (Array.isArray(rows) ? rows : []).filter((row) => toBool(row.active ?? true)).forEach((row) => {
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

  function normalizeCollectionPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.rows)) return payload.rows;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data?.rows)) return payload.data.rows;
    if (Array.isArray(payload?.data?.items)) return payload.data.items;
    return null;
  }

  function normalizeApiData(type, payload) {
    if (payload == null) {
      return type === 'theme' ? { colors: {} } : [];
    }

    const data = payload?.data ?? payload;

    if (type === 'theme') {
      const themeRows = normalizeCollectionPayload(data);
      if (themeRows) return normalizeThemeRows(themeRows);
      if (typeof data === 'object' && !Array.isArray(data)) return data;
      return { colors: {} };
    }

    const rows = normalizeCollectionPayload(data);
    if (rows) return rows;
    if (typeof data === 'object' && data && Array.isArray(data.items)) return data.items;
    return [];
  }

  async function fetchDefaultsByType(type) {
    const cfg = getTypeConfig(type);
    const defaults = await fetchJson(cfg.defaultPath);
    return normalizeApiData(type, defaults);
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
      if (cached != null) return structuredCloneSafe(normalizeApiData(type, cached));
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
        const normalizedLocal = normalizeApiData(type, localData);
        writeCache(type, normalizedLocal);
        return structuredCloneSafe(normalizedLocal);
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
      saveLocalType(type, normalizeApiData(type, data));
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
    const saved = readLocal(storageKey);

    if (!saved) {
      return structuredCloneSafe(defaults);
    }

    if (typeof defaults === 'object' && !Array.isArray(defaults)) {
      return structuredCloneSafe({ ...defaults, ...saved });
    }

    return structuredCloneSafe(saved);
  }

  global.saveAdminData = saveAdminData;
  global.loadAdminData = loadAdminData;
  global.removeAdminData = removeAdminData;
})(window);
