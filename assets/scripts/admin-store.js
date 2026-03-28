(function(global) {
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
    localStorage.setItem(storageKey, JSON.stringify(data));
    return data;
  }

  function removeAdminData(storageKey) {
    localStorage.removeItem(storageKey);
  }

  function mergeWithDefaults(defaultData, savedData) {
    if (!savedData || typeof savedData !== 'object') return structuredClone(defaultData);

    const merged = structuredClone(defaultData);
    Object.keys(savedData).forEach((key) => {
      merged[key] = savedData[key];
    });
    return merged;
  }

  async function loadAdminData(storageKey, defaultPath) {
    const defaults = await fetchJson(defaultPath);
    const savedData = readLocal(storageKey);
    return mergeWithDefaults(defaults, savedData);
  }

  async function resetAdminData(storageKey, defaultPath) {
    const defaults = await fetchJson(defaultPath);
    saveAdminData(storageKey, defaults);
    return defaults;
  }

  function exportAdminData(data, filename = 'export.json') {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
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
    return Array.isArray(data?.[itemKey]) ? data[itemKey] : [];
  }

  function getStoredCollection(storageKey, itemKey = 'items') {
    const data = readLocal(storageKey);
    return Array.isArray(data?.[itemKey]) ? data[itemKey] : [];
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
    readLocal
  };
})(window);
