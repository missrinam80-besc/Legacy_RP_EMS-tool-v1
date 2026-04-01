(function (global) {
  const currentScript = document.currentScript;
  const scriptUrl = currentScript?.src || '';
  const siteRoot = scriptUrl
    ? scriptUrl.replace(/assets\/scripts\/store-config\.js(?:\?.*)?$/, '')
    : new URL('../../', window.location.href).href;

  function joinRoot(path) {
    const clean = String(path || '').replace(/^\/+/, '');
    return new URL(clean, siteRoot).toString();
  }

  global.EMS_STORE_CONFIG = {
    apiBaseUrl: 'https://script.google.com/macros/s/AKfycbxCKvLhdVTGJXbCArfS13vGpJl-ntbXVd4gsYKH0H8LrM6YJheJj0-aUle__ISX_D8PNA/exec',
    siteRoot,
    cacheEnabled: true,
    cachePrefix: 'ems_admin_cache_',
    cacheTtlMs: 5 * 60 * 1000,
    localPrefix: 'ems_admin_local_',
    configTypes: {
      theme: {
        apiType: 'theme',
        defaultPath: joinRoot('data/admin/default-theme.json'),
        localKey: 'theme'
      },
      modules: {
        apiType: 'modules',
        defaultPath: joinRoot('data/admin/default-modules.json'),
        localKey: 'modules'
      },
      prices: {
        apiType: 'prices',
        defaultPath: joinRoot('data/admin/default-prices.json'),
        localKey: 'prices'
      },
      medication: {
        apiType: 'medication',
        defaultPath: joinRoot('data/admin/default-medication.json'),
        localKey: 'medication'
      },
      injuries: {
        apiType: 'injuries',
        defaultPath: joinRoot('data/admin/default-injuries.json'),
        localKey: 'injuries'
      },
      treatmentRules: {
        apiType: 'treatmentRules',
        defaultPath: joinRoot('data/admin/default-treatment-rules.json'),
        localKey: 'treatmentRules'
      }
    },
    resolveSitePath(path) {
      if (!path) return '';
      if (/^(?:https?:)?\/\//i.test(path) || path.startsWith('data:')) return path;
      return joinRoot(path);
    }
  };
})(window);
