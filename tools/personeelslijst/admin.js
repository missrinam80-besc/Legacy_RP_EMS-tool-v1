const CONFIG = {
  SHEET_STAFF: 'personeel',
  SHEET_LOG: 'Log',
  ALLOWED_ORIGINS: ['*'] // later vervangen door je GitHub Pages URL
};

/**
 * Web API entrypoint - GET
 */
function doGet(e) {
  return handleRequest_(e, 'GET');
}

/**
 * Web API entrypoint - POST
 */
function doPost(e) {
  return handleRequest_(e, 'POST');
}

/**
 * Centrale request handler.
 * saveRow mag hier zowel via GET als via POST binnenkomen.
 */
function handleRequest_(e, method) {
  try {
    debugRequest_('handleRequest_start', e, method);

    const body = method === 'POST' ? getJsonBody_(e) : null;
    const action = getAction_(e, method, body);
    let result;

    switch (action) {
      case 'list':
        result = {
          success: true,
          rows: getStaffRows_(false)
        };
        break;

      case 'readonly':
        result = {
          success: true,
          rows: getStaffRows_(true)
        };
        break;

      case 'dropdown':
        result = {
          success: true,
          items: getDropdownItems_()
        };
        break;

      case 'saveAll':
        ensurePost_(method);
        result = saveAllRows_(body);
        break;

      case 'saveRow':
        // saveRow ondersteunen via GET of POST
        if (method === 'GET') {
          result = saveRow_(getRowPayloadFromGet_(e));
        } else {
          ensurePost_(method);
          result = saveRow_(body);
        }
        break;

      case 'deleteByCallsign':
        ensurePost_(method);
        result = deleteByCallsign_(body);
        break;

      default:
        result = {
          success: false,
          message: 'Onbekende action.'
        };
    }

    debugSimple_('handleRequest_success', 'action=' + action);
    return jsonResponse_(result);
  } catch (err) {
    debugSimple_('handleRequest_error', err.message || String(err));

    return jsonResponse_({
      success: false,
      message: err.message || String(err)
    });
  }
}

/**
 * Haalt action op uit querystring of body.
 */
function getAction_(e, method, body) {
  if (method === 'GET') {
    return valueOrEmpty_(e && e.parameter && e.parameter.action).trim();
  }

  return valueOrEmpty_(body && body.action).trim();
}

/**
 * Bouwt saveRow payload op vanuit GET parameters.
 */
function getRowPayloadFromGet_(e) {
  const p = e && e.parameter ? e.parameter : {};

  return {
    actor: valueOrEmpty_(p.actor),
    row: {
      roepnummer: valueOrEmpty_(p.roepnummer),
      naam: valueOrEmpty_(p.naam),
      afdeling: valueOrEmpty_(p.afdeling),
      status: valueOrEmpty_(p.status),
      is_active: p.is_active === 'true' || p.is_active === '1'
    }
  };
}

/**
 * JSON body parser voor POST requests.
 * Ondersteunt:
 * 1) raw JSON body
 * 2) form submit met hidden field "payload"
 * 3) x-www-form-urlencoded body zoals payload=%7B...%7D
 */
function getJsonBody_(e) {
  if (e && e.parameter && e.parameter.payload) {
    return parsePayloadJson_(e.parameter.payload, 'payload is geen geldige JSON.');
  }

  const raw = e && e.postData && typeof e.postData.contents === 'string'
    ? e.postData.contents
    : '';

  if (!raw) {
    throw new Error('Geen geldige POST body ontvangen.');
  }

  const trimmed = raw.trim();

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return parsePayloadJson_(trimmed, 'POST body is geen geldige JSON.');
  }

  const formObject = parseFormEncodedBody_(trimmed);

  if (formObject.payload) {
    return parsePayloadJson_(formObject.payload, 'payload is geen geldige JSON.');
  }

  if (formObject.action) {
    return formObject;
  }

  throw new Error('POST body is geen geldige JSON.');
}

/**
 * Parse helper voor JSON tekst.
 */
function parsePayloadJson_(text, errorMessage) {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(errorMessage);
  }
}

/**
 * Parse helper voor x-www-form-urlencoded body.
 */
function parseFormEncodedBody_(raw) {
  const result = {};
  const pairs = raw.split('&');

  pairs.forEach(function(pair) {
    if (!pair) return;

    const idx = pair.indexOf('=');
    const key = idx >= 0 ? pair.substring(0, idx) : pair;
    const value = idx >= 0 ? pair.substring(idx + 1) : '';

    const decodedKey = decodeFormComponent_(key);
    const decodedValue = decodeFormComponent_(value);

    result[decodedKey] = decodedValue;
  });

  return result;
}

/**
 * Decode helper voor form onderdelen.
 */
function decodeFormComponent_(value) {
  return decodeURIComponent(String(value || '').replace(/\+/g, ' '));
}

function ensurePost_(method) {
  if (method !== 'POST') {
    throw new Error('Deze actie vereist POST.');
  }
}

/**
 * JSON response helper.
 */
function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Leest alle medewerkers uit het sheet.
 * @param {boolean} readonlyMode Indien true: enkel zichtbare records tonen.
 */
function getStaffRows_(readonlyMode) {
  const sheet = getSheetOrThrow_(CONFIG.SHEET_STAFF);
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) return [];

  const headers = values[0].map(String);
  const rows = [];

  for (let i = 1; i < values.length; i++) {
    const rowObj = rowToObject_(headers, values[i]);

    if (
      isEmpty_(rowObj.roepnummer) &&
      isEmpty_(rowObj.naam) &&
      isEmpty_(rowObj.rang) &&
      isEmpty_(rowObj.afdeling) &&
      isEmpty_(rowObj.status)
    ) {
      continue;
    }

    rowObj.roepnummer = normalizeCallsign_(rowObj.roepnummer);
    rowObj.status = normalizeStatus_(rowObj.status);
    rowObj.is_active = normalizeBoolean_(rowObj.is_active);

    if (readonlyMode && rowObj.is_active !== true) {
      continue;
    }

    rows.push({
      roepnummer: rowObj.roepnummer,
      naam: valueOrEmpty_(rowObj.naam),
      rang: valueOrEmpty_(rowObj.rang),
      afdeling: valueOrEmpty_(rowObj.afdeling),
      status: rowObj.status,
      is_active: rowObj.is_active,
      updated_at: valueOrEmpty_(rowObj.updated_at),
      updated_by: valueOrEmpty_(rowObj.updated_by)
    });
  }

  rows.sort(function(a, b) {
    return Number(a.roepnummer || 0) - Number(b.roepnummer || 0);
  });

  return rows;
}

/**
 * Dropdown-data voor andere tools.
 * Houdt enkel zichtbare medewerkers.
 */
function getDropdownItems_() {
  const rows = getStaffRows_(true);

  return rows.map(function(row) {
    return {
      value: String(row.roepnummer),
      label: String(row.roepnummer) + ' - ' + row.naam,
      roepnummer: String(row.roepnummer),
      naam: row.naam,
      rang: row.rang,
      afdeling: row.afdeling,
      status: row.status
    };
  });
}

/**
 * Bulk save als fallback.
 */
function saveAllRows_(payload) {
  const rows = payload.rows || [];
  const actor = valueOrEmpty_(payload.actor) || 'Onbekend';

  if (!Array.isArray(rows)) {
    throw new Error('rows moet een array zijn.');
  }

  validateRows_(rows);

  const sheet = getSheetOrThrow_(CONFIG.SHEET_STAFF);
  const headers = getExpectedHeaders_();

  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  const now = new Date();
  const output = rows.map(function(row) {
    return [
      normalizeCallsign_(row.roepnummer),
      valueOrEmpty_(row.naam),
      valueOrEmpty_(row.rang),
      valueOrEmpty_(row.afdeling),
      normalizeStatus_(row.status),
      normalizeBoolean_(row.is_active),
      now,
      actor
    ];
  });

  if (output.length > 0) {
    sheet.getRange(2, 1, output.length, headers.length).setValues(output);
  }

  logAction_('save_all', actor, '', '', 'Personeelslijst volledig bijgewerkt: ' + rows.length + ' rijen.');

  return {
    success: true,
    message: 'Personeelslijst opgeslagen.',
    count: rows.length
  };
}

/**
 * Slaat één rij op basis van roepnummer op.
 */
function saveRow_(payload) {
  debugSimple_('saveRow_payload', truncate_(JSON.stringify(payload), 500));

  const actor = valueOrEmpty_(payload.actor) || 'Onbekend';
  const row = payload.row || {};

  const roepnummer = normalizeCallsign_(row.roepnummer);
  if (!roepnummer) {
    throw new Error('Roepnummer ontbreekt.');
  }

  const naam = valueOrEmpty_(row.naam).trim();
  const afdeling = valueOrEmpty_(row.afdeling).trim();
  const status = normalizeStatus_(row.status);
  const isActive = normalizeBoolean_(row.is_active);

  if (!naam) {
    throw new Error('Naam ontbreekt.');
  }

  if (!isAllowedStatus_(status)) {
    throw new Error('Ongeldige status: ' + status);
  }

  const sheet = getSheetOrThrow_(CONFIG.SHEET_STAFF);
  const data = sheet.getDataRange().getValues();

  if (data.length < 2) {
    throw new Error('Geen personeelsdata gevonden.');
  }

  const headers = data[0].map(String);
  const colMap = getColumnMap_(headers);

  validateRequiredHeaders_(colMap);

  for (let i = 1; i < data.length; i++) {
    const currentRoepnummer = normalizeCallsign_(data[i][colMap.roepnummer]);

    if (currentRoepnummer === roepnummer) {
      const existingNaam = valueOrEmpty_(data[i][colMap.naam]);
      const existingRang = valueOrEmpty_(data[i][colMap.rang]);

      data[i][colMap.naam] = naam;
      data[i][colMap.afdeling] = afdeling;
      data[i][colMap.status] = status;
      data[i][colMap.is_active] = isActive;
      data[i][colMap.updated_at] = new Date();
      data[i][colMap.updated_by] = actor;

      sheet.getRange(i + 1, 1, 1, headers.length).setValues([data[i]]);

      logAction_(
        'save_row',
        actor,
        roepnummer,
        naam || existingNaam,
        'Rij bijgewerkt. Rang bleef onveranderd: ' + existingRang
      );

      debugSimple_('saveRow_success', 'roepnummer=' + roepnummer);

      return {
        success: true,
        message: 'Medewerker bijgewerkt.',
        row: {
          roepnummer: roepnummer,
          naam: naam,
          rang: existingRang,
          afdeling: afdeling,
          status: status,
          is_active: isActive,
          updated_by: actor
        }
      };
    }
  }

  throw new Error('Roepnummer niet gevonden: ' + roepnummer);
}

/**
 * Verwijdert één medewerker op basis van roepnummer.
 * Momenteel niet gebruikt door de frontend.
 */
function deleteByCallsign_(payload) {
  const actor = payload.actor || 'Onbekend';
  const roepnummer = normalizeCallsign_(payload.roepnummer);

  if (!roepnummer) {
    throw new Error('Roepnummer ontbreekt.');
  }

  const sheet = getSheetOrThrow_(CONFIG.SHEET_STAFF);
  const data = sheet.getDataRange().getValues();

  if (data.length < 2) {
    return {
      success: false,
      message: 'Geen data gevonden.'
    };
  }

  for (let i = data.length; i >= 2; i--) {
    const current = normalizeCallsign_(data[i - 1][0]);
    if (current === roepnummer) {
      const targetName = data[i - 1][1] || '';
      sheet.deleteRow(i);

      logAction_('delete', actor, roepnummer, targetName, 'Medewerker verwijderd.');
      return {
        success: true,
        message: 'Medewerker verwijderd.'
      };
    }
  }

  return {
    success: false,
    message: 'Roepnummer niet gevonden.'
  };
}

function validateRows_(rows) {
  const seen = {};

  rows.forEach(function(row, index) {
    const nr = normalizeCallsign_(row.roepnummer);
    const naam = valueOrEmpty_(row.naam).trim();
    const status = normalizeStatus_(row.status);

    if (!nr) {
      throw new Error('Rij ' + (index + 1) + ': roepnummer ontbreekt.');
    }

    if (!naam) {
      throw new Error('Rij ' + (index + 1) + ': naam ontbreekt.');
    }

    if (seen[nr]) {
      throw new Error('Dubbel roepnummer gevonden: ' + nr);
    }
    seen[nr] = true;

    if (!isAllowedStatus_(status)) {
      throw new Error('Rij ' + (index + 1) + ': ongeldige status (' + status + ').');
    }
  });
}

function getExpectedHeaders_() {
  return [
    'roepnummer',
    'naam',
    'rang',
    'afdeling',
    'status',
    'is_active',
    'updated_at',
    'updated_by'
  ];
}

function rowToObject_(headers, row) {
  const obj = {};
  headers.forEach(function(header, index) {
    obj[header] = row[index];
  });
  return obj;
}

function getColumnMap_(headers) {
  const map = {};
  headers.forEach(function(header, index) {
    map[String(header).trim()] = index;
  });
  return map;
}

function validateRequiredHeaders_(colMap) {
  const required = [
    'roepnummer',
    'naam',
    'rang',
    'afdeling',
    'status',
    'is_active',
    'updated_at',
    'updated_by'
  ];

  required.forEach(function(header) {
    if (typeof colMap[header] !== 'number') {
      throw new Error('Kolom ontbreekt in sheet: ' + header);
    }
  });
}

function getSheetOrThrow_(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) {
    throw new Error('Sheet niet gevonden: ' + name);
  }
  return sheet;
}

function logAction_(action, actor, callsign, targetName, details) {
  const sheet = getSheetOrThrow_(CONFIG.SHEET_LOG);

  sheet.appendRow([
    new Date(),
    action,
    actor,
    callsign || '',
    targetName || '',
    details || ''
  ]);
}

function debugRequest_(label, e, method) {
  try {
    const info = {
      method: method || '',
      parameter: e && e.parameter ? e.parameter : {},
      postDataType: e && e.postData ? e.postData.type : '',
      postDataLength: e && e.postData && e.postData.contents ? String(e.postData.contents).length : 0,
      postDataPreview: e && e.postData && e.postData.contents ? truncate_(String(e.postData.contents), 500) : ''
    };

    logAction_('debug', 'system', '', label, JSON.stringify(info));
  } catch (err) {
    logAction_('debug_error', 'system', '', label, err.message || String(err));
  }
}

function debugSimple_(label, details) {
  try {
    logAction_('debug', 'system', '', label, details || '');
  } catch (err) {
    // stil falen
  }
}

function truncate_(value, maxLen) {
  const text = String(value || '');
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen) + '...';
}

function normalizeCallsign_(value) {
  if (value === null || value === undefined || value === '') return '';
  return String(Math.trunc(Number(value)) || value).trim();
}

function normalizeBoolean_(value) {
  if (value === true || value === 'TRUE' || value === 'true' || value === 1 || value === '1') return true;
  return false;
}

function normalizeStatus_(value) {
  const status = String(value || '').trim().toLowerCase();

  if (status === 'actief') return 'actief';
  if (status === 'verlof') return 'verlof';
  if (status === 'ziekte') return 'ziekte';
  if (status === 'non actief' || status === 'non-actief' || status === 'nonactief') return 'non-actief';

  return 'actief';
}

function isAllowedStatus_(status) {
  return ['actief', 'non-actief', 'verlof', 'ziekte'].indexOf(status) !== -1;
}

function valueOrEmpty_(value) {
  return value === null || value === undefined ? '' : value;
}

function isEmpty_(value) {
  return value === null || value === undefined || value === '';
}
