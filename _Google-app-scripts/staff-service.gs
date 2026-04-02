/**
 * Staff service
 * -------------
 * Verwachte kolommen in sheet "personeel":
 * roepnummer | naam | rang | afdeling | status | zichtbaar | updated_at | updated_by
 */

function handleReadonlyStaff_() {
  return {
    rows: getStaffRows_(true)
  };
}

function handleListStaff_() {
  return {
    rows: getStaffRows_(false)
  };
}

function handleSaveStaff_(body, e) {
  var payload = body && body.row ? body : getRowPayloadFromGet_(e);
  var row = payload.row || {};

  var roepnummer = String(row.roepnummer || '').trim();
  var naam = String(row.naam || '').trim();

  if (!roepnummer) {
    throw new Error('personeel: verplicht veld ontbreekt -> roepnummer');
  }

  if (!naam) {
    throw new Error('personeel: verplicht veld ontbreekt -> naam');
  }

  var actor = String(row.updated_by || body.updated_by || 'Onbekend').trim();
  var now = new Date();

  var normalized = {
    roepnummer: roepnummer,
    naam: naam,
    rang: String(row.rang || '').trim(),
    afdeling: String(row.afdeling || '').trim(),
    status: normalizeStaffStatus_(row.status),
    zichtbaar: toSheetBoolean_(row.zichtbaar != null ? row.zichtbaar : row.is_active),
    updated_at: now,
    updated_by: actor
  };

  upsertStaffRow_(normalized);

  return {
    saved: true,
    row: sanitizeStaffRow_(normalized)
  };
}

function getStaffRows_(visibleOnly) {
  var sheet = getSheetByNameSafe_(EMS_CONFIG.sheets.staff);
  var values = sheet.getDataRange().getValues();

  if (!values || values.length < 2) return [];

  var headers = values[0].map(function (h) {
    return String(h || '').trim();
  });

  var rows = [];

  for (var i = 1; i < values.length; i++) {
    var raw = mapRowToObject_(headers, values[i]);

    // Volledig lege rij overslaan
    if (isEmptyStaffRow_(raw)) {
      continue;
    }

    // Rij zonder roepnummer overslaan
    if (!String(raw.roepnummer || '').trim()) {
      continue;
    }

    // Rij zonder naam overslaan i.p.v. hele lijst te doen falen
    if (!String(raw.naam || '').trim()) {
      Logger.log('[STAFF_SKIP] Rij overgeslagen zonder naam op sheet-rij ' + (i + 1) + ' (roepnummer: ' + String(raw.roepnummer || '').trim() + ')');
      continue;
    }

    var row = sanitizeStaffRow_(raw);

    if (visibleOnly && row.is_active !== true) {
      continue;
    }

    rows.push(row);
  }

  return rows;
}

function upsertStaffRow_(rowObj) {
  var sheet = getSheetByNameSafe_(EMS_CONFIG.sheets.staff);
  var values = sheet.getDataRange().getValues();

  if (!values || !values.length) {
    throw new Error('Personeel-sheet heeft geen header rij.');
  }

  var headers = values[0].map(function (h) {
    return String(h || '').trim();
  });

  var rowIndex = findRowIndexByValue_(sheet, headers, 'roepnummer', rowObj.roepnummer);

  var rowArray = headers.map(function (header) {
    switch (header) {
      case 'roepnummer': return rowObj.roepnummer;
      case 'naam': return rowObj.naam;
      case 'rang': return rowObj.rang;
      case 'afdeling': return rowObj.afdeling;
      case 'status': return rowObj.status;
      case 'zichtbaar': return rowObj.zichtbaar;
      case 'is_active': return rowObj.zichtbaar;
      case 'updated_at': return rowObj.updated_at;
      case 'updated_by': return rowObj.updated_by;
      default: return '';
    }
  });

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowArray.length).setValues([rowArray]);
  } else {
    sheet.appendRow(rowArray);
  }
}

function sanitizeStaffRow_(row) {
  return {
    roepnummer: String(row.roepnummer || '').trim(),
    naam: String(row.naam || '').trim(),
    rang: String(row.rang || '').trim(),
    afdeling: String(row.afdeling || '').trim(),
    status: normalizeStaffStatus_(row.status),
    zichtbaar: toBooleanValue_(row.zichtbaar != null ? row.zichtbaar : row.is_active),
    is_active: toBooleanValue_(row.zichtbaar != null ? row.zichtbaar : row.is_active),
    updated_at: row.updated_at || '',
    updated_by: String(row.updated_by || '').trim()
  };
}

function isEmptyStaffRow_(row) {
  return !String(row.roepnummer || '').trim() &&
         !String(row.naam || '').trim() &&
         !String(row.rang || '').trim() &&
         !String(row.afdeling || '').trim() &&
         !String(row.status || '').trim() &&
         !String(row.zichtbaar || row.is_active || '').trim();
}

function normalizeStaffStatus_(value) {
  var status = String(value || '').trim().toLowerCase();
  if (status === 'verlof') return 'verlof';
  if (status === 'ziekte' || status === 'ziek') return 'ziekte';
  if (status === 'non actief' || status === 'non-actief' || status === 'inactief') return 'non-actief';
  return 'actief';
}

function toBooleanValue_(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  var normalized = String(value || '').trim().toLowerCase();
  return ['true', '1', 'ja', 'yes', 'y', 'zichtbaar', 'actief'].indexOf(normalized) !== -1;
}

function toSheetBoolean_(value) {
  return toBooleanValue_(value) ? true : false;
}