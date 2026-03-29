/**
 * =========================================================
 * validation.gs
 * ---------------------------------------------------------
 * Centrale validatie + sanitization layer
 * Past op bestaande EMS Apps Script structuur
 * =========================================================
 */

const VALIDATION = {
  MODULE_TYPES: ['tool', 'portal', 'form', 'info', 'link', 'admin'],
  DEPARTMENTS: ['general', 'command', 'spoed', 'ambulance', 'chirurgie', 'psychologie', 'ortho', 'forensisch', 'labo'],
  THEME_TYPES: ['string', 'color', 'boolean', 'number', 'path'],
  THEME_GROUPS: ['branding', 'colors', 'layout', 'labels', 'advanced'],
  PRICE_CATEGORIES: ['consult', 'treatment', 'medication', 'surgery', 'admission', 'document', 'transport', 'equipment', 'other'],
  MEDICATION_TYPES: ['medication', 'fluid', 'bandage', 'tool', 'equipment'],
  MEDICATION_CATEGORIES: ['pain', 'cardio', 'sedation', 'blood', 'saline', 'woundcare', 'airway', 'monitoring', 'transport', 'surgery'],
  INJURY_CATEGORIES: ['abrasion', 'contusion', 'cut', 'laceration', 'puncture', 'gunshot', 'crush', 'avulsion', 'burn', 'fracture_related'],
  SEVERITIES: ['licht', 'matig', 'ernstig', 'kritiek'],
  IMPACTS: ['geen', 'laag', 'matig', 'hoog', 'extreem'],
  RULE_GROUPS: ['vitals', 'wound', 'fracture', 'consciousness', 'mobility', 'triage', 'pain', 'bloodloss', 'combined'],
  RULE_OPERATORS: ['equals', 'not_equals', 'in', 'contains', 'gte', 'lte', 'true', 'false'],
  RULE_ADVICE_TYPES: ['treatment', 'medication', 'tool', 'warning', 'triage', 'step', 'status'],
  CURRENCIES: ['EUR'],
  BOOL_TRUE: ['true', '1', 'yes', 'ja', 'waar', 'on'],
  BOOL_FALSE: ['false', '0', 'no', 'nee', 'onwaar', 'off']
};

function sanitizeString_(value) {
  return String(value == null ? '' : value)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

function sanitizeSingleLine_(value) {
  return sanitizeString_(value).replace(/\n+/g, ' ');
}

function sanitizeId_(value) {
  return sanitizeSingleLine_(value)
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '');
}

function sanitizePath_(value) {
  return sanitizeSingleLine_(value)
    .replace(/\s+/g, '-');
}

function sanitizeBoolean_(value) {
  if (value === true || value === false) return value;
  const str = sanitizeSingleLine_(value).toLowerCase();
  if (VALIDATION.BOOL_TRUE.indexOf(str) >= 0) return true;
  if (VALIDATION.BOOL_FALSE.indexOf(str) >= 0) return false;
  return false;
}

function sanitizeNumber_(value, fallback) {
  if (typeof value === 'number' && !isNaN(value)) return value;
  const str = sanitizeSingleLine_(value).replace(',', '.');
  const num = Number(str);
  return isNaN(num) ? (fallback != null ? fallback : 0) : num;
}

function sanitizePipeList_(value) {
  if (Array.isArray(value)) {
    return value
      .map(sanitizeSingleLine_)
      .filter(Boolean)
      .join('|');
  }

  return sanitizeSingleLine_(value)
    .split('|')
    .map(function(part) { return sanitizeSingleLine_(part); })
    .filter(Boolean)
    .join('|');
}

function splitPipeList_(value) {
  return sanitizePipeList_(value)
    .split('|')
    .filter(Boolean);
}

function ensureRequired_(obj, fields, context) {
  fields.forEach(function(field) {
    if (sanitizeString_(obj[field]) === '') {
      throw new Error(context + ': verplicht veld ontbreekt -> ' + field);
    }
  });
}

function ensureAllowed_(value, allowed, fieldName, context, allowEmpty) {
  const clean = sanitizeSingleLine_(value);
  if (allowEmpty && clean === '') return;
  if (allowed.indexOf(clean) === -1) {
    throw new Error(context + ': ongeldige waarde voor ' + fieldName + ' -> ' + clean);
  }
}

function ensureUniqueIds_(rows, fieldName, context) {
  const seen = {};
  rows.forEach(function(row, index) {
    const id = sanitizeSingleLine_(row[fieldName]);
    if (!id) return;
    if (seen[id]) {
      throw new Error(context + ': dubbele waarde voor ' + fieldName + ' -> ' + id + ' (rij ' + (index + 2) + ')');
    }
    seen[id] = true;
  });
}

function sanitizeModuleRow_(row) {
  const clean = {
    id: sanitizeId_(row.id),
    name: sanitizeSingleLine_(row.name),
    type: sanitizeSingleLine_(row.type),
    department: sanitizeSingleLine_(row.department),
    url: sanitizePath_(row.url),
    icon: sanitizeSingleLine_(row.icon),
    badge: sanitizeSingleLine_(row.badge),
    status: sanitizeSingleLine_(row.status),
    description: sanitizeString_(row.description),
    keywords: sanitizePipeList_(row.keywords),
    contexts: sanitizePipeList_(row.contexts),
    order: sanitizeNumber_(row.order, 999),
    enabled: sanitizeBoolean_(row.enabled),
    notes: sanitizeString_(row.notes)
  };

  ensureRequired_(clean, ['id', 'name', 'type', 'url', 'contexts'], 'modules');
  ensureAllowed_(clean.type, VALIDATION.MODULE_TYPES, 'type', 'modules');
  ensureAllowed_(clean.department, VALIDATION.DEPARTMENTS, 'department', 'modules', true);

  return clean;
}

function sanitizeThemeRow_(row) {
  const clean = {
    key: sanitizeSingleLine_(row.key),
    value: sanitizeString_(row.value),
    type: sanitizeSingleLine_(row.type),
    group: sanitizeSingleLine_(row.group),
    active: sanitizeBoolean_(row.active),
    notes: sanitizeString_(row.notes)
  };

  ensureRequired_(clean, ['key', 'value', 'type', 'group'], 'theme');
  ensureAllowed_(clean.type, VALIDATION.THEME_TYPES, 'type', 'theme');
  ensureAllowed_(clean.group, VALIDATION.THEME_GROUPS, 'group', 'theme');

  if (clean.type === 'color' && !/^#[0-9a-fA-F]{6}$/.test(clean.value)) {
    throw new Error('theme: ongeldige kleurwaarde voor key -> ' + clean.key);
  }

  return clean;
}

function sanitizePriceRow_(row) {
  const clean = {
    id: sanitizeId_(row.id),
    code: sanitizeSingleLine_(row.code).toUpperCase(),
    label: sanitizeSingleLine_(row.label),
    department: sanitizeSingleLine_(row.department),
    category: sanitizeSingleLine_(row.category),
    documentTypes: sanitizePipeList_(row.documentTypes),
    defaultPrice: sanitizeNumber_(row.defaultPrice, 0),
    currency: sanitizeSingleLine_(row.currency || 'EUR').toUpperCase(),
    vatMode: sanitizeSingleLine_(row.vatMode),
    active: sanitizeBoolean_(row.active),
    visibleInCalculator: sanitizeBoolean_(row.visibleInCalculator),
    visibleInReports: sanitizeBoolean_(row.visibleInReports),
    sortOrder: sanitizeNumber_(row.sortOrder, 999),
    notes: sanitizeString_(row.notes)
  };

  ensureRequired_(clean, ['id', 'code', 'label', 'category'], 'prijzen');
  ensureAllowed_(clean.department, VALIDATION.DEPARTMENTS, 'department', 'prijzen', true);
  ensureAllowed_(clean.category, VALIDATION.PRICE_CATEGORIES, 'category', 'prijzen');
  ensureAllowed_(clean.currency, VALIDATION.CURRENCIES, 'currency', 'prijzen');

  return clean;
}

function sanitizeMedicationRow_(row) {
  const clean = {
    id: sanitizeId_(row.id),
    name: sanitizeSingleLine_(row.name),
    type: sanitizeSingleLine_(row.type),
    category: sanitizeSingleLine_(row.category),
    dosage: sanitizeSingleLine_(row.dosage),
    route: sanitizeSingleLine_(row.route),
    indication: sanitizeString_(row.indication),
    contraNote: sanitizeString_(row.contraNote),
    price: sanitizeNumber_(row.price, 0),
    departments: sanitizePipeList_(row.departments),
    active: sanitizeBoolean_(row.active),
    warnings: sanitizePipeList_(row.warnings),
    notes: sanitizeString_(row.notes)
  };

  ensureRequired_(clean, ['id', 'name', 'type', 'category'], 'medicatie');
  ensureAllowed_(clean.type, VALIDATION.MEDICATION_TYPES, 'type', 'medicatie');
  ensureAllowed_(clean.category, VALIDATION.MEDICATION_CATEGORIES, 'category', 'medicatie');

  splitPipeList_(clean.departments).forEach(function(dep) {
    ensureAllowed_(dep, VALIDATION.DEPARTMENTS, 'departments', 'medicatie');
  });

  return clean;
}

function sanitizeInjuryRow_(row) {
  const clean = {
    id: sanitizeId_(row.id),
    label: sanitizeSingleLine_(row.label),
    category: sanitizeSingleLine_(row.category),
    severity: sanitizeSingleLine_(row.severity),
    bodyZones: sanitizePipeList_(row.bodyZones),
    bleedingImpact: sanitizeSingleLine_(row.bleedingImpact),
    painImpact: sanitizeSingleLine_(row.painImpact),
    reopeningRisk: sanitizeSingleLine_(row.reopeningRisk),
    needsSuturing: sanitizeBoolean_(row.needsSuturing),
    fractureRisk: sanitizeSingleLine_(row.fractureRisk),
    mobilityImpact: sanitizeSingleLine_(row.mobilityImpact),
    instabilityImpact: sanitizeSingleLine_(row.instabilityImpact),
    defaultTreatments: sanitizePipeList_(row.defaultTreatments),
    active: sanitizeBoolean_(row.active),
    notes: sanitizeString_(row.notes)
  };

  ensureRequired_(clean, ['id', 'label', 'category', 'severity'], 'verwondingen');
  ensureAllowed_(clean.category, VALIDATION.INJURY_CATEGORIES, 'category', 'verwondingen');
  ensureAllowed_(clean.severity, VALIDATION.SEVERITIES, 'severity', 'verwondingen');
  ['bleedingImpact', 'painImpact', 'reopeningRisk', 'fractureRisk', 'mobilityImpact', 'instabilityImpact']
    .forEach(function(field) {
      if (clean[field] !== '') {
        ensureAllowed_(clean[field], VALIDATION.IMPACTS, field, 'verwondingen', true);
      }
    });

  return clean;
}

function sanitizeTreatmentRuleRow_(row) {
  const clean = {
    id: sanitizeId_(row.id),
    department: sanitizeSingleLine_(row.department),
    conditionGroup: sanitizeSingleLine_(row.conditionGroup),
    conditionField: sanitizeSingleLine_(row.conditionField),
    operator: sanitizeSingleLine_(row.operator),
    conditionValue: sanitizeSingleLine_(row.conditionValue),
    adviceType: sanitizeSingleLine_(row.adviceType),
    adviceValue: sanitizeSingleLine_(row.adviceValue),
    priority: sanitizeNumber_(row.priority, 999),
    requires: sanitizePipeList_(row.requires),
    blocks: sanitizePipeList_(row.blocks),
    visibleInOutput: sanitizeBoolean_(row.visibleInOutput),
    active: sanitizeBoolean_(row.active),
    notes: sanitizeString_(row.notes)
  };

  ensureRequired_(clean, ['id', 'conditionGroup', 'conditionField', 'operator', 'conditionValue', 'adviceType', 'adviceValue'], 'behandelregels');
  ensureAllowed_(clean.department, VALIDATION.DEPARTMENTS, 'department', 'behandelregels', true);
  ensureAllowed_(clean.conditionGroup, VALIDATION.RULE_GROUPS, 'conditionGroup', 'behandelregels');
  ensureAllowed_(clean.operator, VALIDATION.RULE_OPERATORS, 'operator', 'behandelregels');
  ensureAllowed_(clean.adviceType, VALIDATION.RULE_ADVICE_TYPES, 'adviceType', 'behandelregels');

  return clean;
}

function sanitizeStaffRow_(row) {
  const clean = {
    roepnummer: sanitizeSingleLine_(row.roepnummer),
    naam: sanitizeSingleLine_(row.naam),
    rang: sanitizeSingleLine_(row.rang),
    afdeling: sanitizeSingleLine_(row.afdeling),
    status: sanitizeSingleLine_(row.status),
    is_active: sanitizeBoolean_(row.is_active),
    updated_at: sanitizeSingleLine_(row.updated_at),
    updated_by: sanitizeSingleLine_(row.updated_by),
    specialisatie: sanitizeSingleLine_(row.specialisatie),
    opmerking: sanitizeString_(row.opmerking)
  };

  ensureRequired_(clean, ['roepnummer', 'naam'], 'personeel');
  return clean;
}

function sanitizeRowsByType_(type, rows) {
  if (!Array.isArray(rows)) {
    throw new Error(type + ': verwacht een array van rows.');
  }

  let sanitized;

  switch (type) {
    case 'modules':
      sanitized = rows.map(sanitizeModuleRow_);
      ensureUniqueIds_(sanitized, 'id', 'modules');
      return sanitized;

    case 'theme':
      sanitized = rows.map(sanitizeThemeRow_);
      ensureUniqueIds_(sanitized, 'key', 'theme');
      return sanitized;

    case 'prices':
      sanitized = rows.map(sanitizePriceRow_);
      ensureUniqueIds_(sanitized, 'id', 'prijzen');
      return sanitized;

    case 'medication':
      sanitized = rows.map(sanitizeMedicationRow_);
      ensureUniqueIds_(sanitized, 'id', 'medicatie');
      return sanitized;

    case 'injuries':
      sanitized = rows.map(sanitizeInjuryRow_);
      ensureUniqueIds_(sanitized, 'id', 'verwondingen');
      return sanitized;

    case 'treatmentRules':
      sanitized = rows.map(sanitizeTreatmentRuleRow_);
      ensureUniqueIds_(sanitized, 'id', 'behandelregels');
      return sanitized;

    case 'staff':
      sanitized = rows.map(sanitizeStaffRow_);
      ensureUniqueIds_(sanitized, 'roepnummer', 'personeel');
      return sanitized;

    default:
      throw new Error('Onbekend validatietype: ' + type);
  }
}