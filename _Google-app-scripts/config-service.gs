/**
 * Config service
 * --------------
 * Leest en schrijft centrale configuratie-tabs.
 */

function handleGetConfig_(e) {
  var type = String((e && e.parameter && e.parameter.type) || '').trim();
  if (!type) throw new Error('Config type ontbreekt.');

  var sheetMap = getConfigSheetMap_();
  var sheetName = sheetMap[type];
  if (!sheetName) throw new Error('Onbekend config type: ' + type);

  return {
    type: type,
    rows: readConfigRows_(sheetName)
  };
}

function handleGetAllConfigs_() {
  var sheetMap = getConfigSheetMap_();
  var result = {};

  Object.keys(sheetMap).forEach(function(type) {
    result[type] = readConfigRows_(sheetMap[type]);
  });

  return result;
}

function handleSaveConfig_(body, e) {
  var type = String((body && body.type) || (e && e.parameter && e.parameter.type) || '').trim();
  if (!type) throw new Error('Config type ontbreekt.');

  var sheetMap = getConfigSheetMap_();
  var sheetName = sheetMap[type];
  if (!sheetName) throw new Error('Onbekend config type: ' + type);

  var actor = String((body && body.actor) || 'frontend').trim();
  var rows = normalizeConfigInputRows_(type, body && body.data);
  var sanitized = sanitizeRowsByType_(type, rows);
  var headers = getHeadersForType_(type);

  writeObjectsToSheetWithHeaders_(sheetName, headers, sanitized);

  logDebug_('save_config', {
    type: type,
    actor: actor,
    rows: sanitized.length
  });

  return {
    saved: true,
    type: type,
    rows: sanitized
  };
}

function readConfigRows_(sheetName) {
  var sheet = getSheetByNameSafe_(sheetName);
  var values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) return [];

  var headers = values[0].map(function(h) { return String(h || '').trim(); });
  return values.slice(1)
    .map(function(row) { return mapRowToObject_(headers, row); })
    .filter(function(row) {
      return Object.keys(row).some(function(key) {
        return String(row[key] == null ? '' : row[key]).trim() !== '';
      });
    });
}

function normalizeConfigInputRows_(type, data) {
  if (type === 'theme') {
    return normalizeThemeInputRows_(data);
  }

  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.rows)) return data.rows;
  if (data && Array.isArray(data.items)) return data.items;
  if (data == null) return [];

  throw new Error(type + ': verwacht een array van rows.');
}

function normalizeThemeInputRows_(data) {
  var theme = data || {};
  var colors = theme.colors || {};
  return [
    { key: 'siteTitle', value: String(theme.siteTitle || ''), type: 'string', group: 'branding', active: true, notes: '' },
    { key: 'siteSubtitle', value: String(theme.siteSubtitle || ''), type: 'string', group: 'branding', active: true, notes: '' },
    { key: 'bannerPath', value: String(theme.bannerPath || ''), type: 'path', group: 'branding', active: true, notes: '' },
    { key: 'logoPath', value: String(theme.logoPath || ''), type: 'path', group: 'branding', active: true, notes: '' },
    { key: 'borderRadius', value: String(theme.borderRadius || '16px'), type: 'string', group: 'layout', active: true, notes: '' },
    { key: 'compactMode', value: !!theme.compactMode, type: 'boolean', group: 'layout', active: true, notes: '' },
    { key: 'color_primary', value: String(colors.primary || '#8b0a0a'), type: 'color', group: 'colors', active: true, notes: '' },
    { key: 'color_background', value: String(colors.background || '#f4f6fa'), type: 'color', group: 'colors', active: true, notes: '' },
    { key: 'color_surface', value: String(colors.surface || '#ffffff'), type: 'color', group: 'colors', active: true, notes: '' },
    { key: 'color_text', value: String(colors.text || '#1a1a1a'), type: 'color', group: 'colors', active: true, notes: '' },
    { key: 'color_accent', value: String(colors.accent || '#c59d2a'), type: 'color', group: 'colors', active: true, notes: '' },
    { key: 'color_success', value: String(colors.success || '#1f8b4c'), type: 'color', group: 'colors', active: true, notes: '' },
    { key: 'color_warning', value: String(colors.warning || '#d48b00'), type: 'color', group: 'colors', active: true, notes: '' },
    { key: 'color_danger', value: String(colors.danger || '#b42318'), type: 'color', group: 'colors', active: true, notes: '' }
  ];
}

function getHeadersForType_(type) {
  switch (type) {
    case 'modules':
      return ['id', 'name', 'type', 'department', 'url', 'icon', 'badge', 'status', 'description', 'keywords', 'contexts', 'order', 'enabled', 'notes'];
    case 'theme':
      return ['key', 'value', 'type', 'group', 'active', 'notes'];
    case 'prices':
      return ['id', 'code', 'label', 'department', 'category', 'documentTypes', 'defaultPrice', 'currency', 'vatMode', 'active', 'visibleInCalculator', 'visibleInReports', 'sortOrder', 'notes'];
    case 'medication':
      return ['id', 'name', 'type', 'category', 'dosage', 'route', 'indication', 'contraNote', 'price', 'departments', 'active', 'warnings', 'notes'];
    case 'injuries':
      return ['id', 'label', 'category', 'severity', 'bodyZones', 'bleedingImpact', 'painImpact', 'reopeningRisk', 'needsSuturing', 'fractureRisk', 'mobilityImpact', 'instabilityImpact', 'defaultTreatments', 'active', 'notes'];
    case 'treatmentRules':
      return ['id', 'department', 'conditionGroup', 'conditionField', 'operator', 'conditionValue', 'adviceType', 'adviceValue', 'priority', 'requires', 'blocks', 'visibleInOutput', 'active', 'notes'];
    default:
      throw new Error('Onbekend config type: ' + type);
  }
}
