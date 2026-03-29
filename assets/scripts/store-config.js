window.EMS_STORE_CONFIG = {
  apiBaseUrl: 'https://script.google.com/macros/s/AKfycbxCKvLhdVTGJXbCArfS13vGpJl-ntbXVd4gsYKH0H8LrM6YJheJj0-aUle__ISX_D8PNA/exec',

  cacheEnabled: true,
  cachePrefix: 'ems_admin_cache_',
  cacheTtlMs: 5 * 60 * 1000,

  configTypes: {
    theme: {
      apiType: 'theme',
      defaultPath: '../../data/admin/default-theme.json',
      localKey: 'theme'
    },
    modules: {
      apiType: 'modules',
      defaultPath: '../../data/admin/default-modules.json',
      localKey: 'modules'
    },
    prices: {
      apiType: 'prices',
      defaultPath: '../../data/admin/default-prijzen.json',
      localKey: 'prices'
    },
    medication: {
      apiType: 'medication',
      defaultPath: '../../data/admin/default-medicatie.json',
      localKey: 'medication'
    },
    injuries: {
      apiType: 'injuries',
      defaultPath: '../../data/admin/default-verwondingen.json',
      localKey: 'injuries'
    },
    treatmentRules: {
      apiType: 'treatmentRules',
      defaultPath: '../../data/admin/default-behandelregels.json',
      localKey: 'treatmentRules'
    }
  }
};