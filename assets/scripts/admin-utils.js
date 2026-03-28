(function(global) {
  function generateId(prefix = 'item') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function slugify(value = '') {
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function formatCurrency(value, currency = 'EUR') {
    const number = Number(value) || 0;
    return new Intl.NumberFormat('nl-BE', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2
    }).format(number);
  }

  function safeParseJSON(value, fallback = null) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function normalizeArray(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  }

  global.AdminUtils = {
    generateId,
    slugify,
    formatCurrency,
    safeParseJSON,
    normalizeArray
  };
})(window);
