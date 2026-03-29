function handleListStaff_() {
  return { rows: getStaffRows_(false) };
}

function handleReadonlyStaff_() {
  return { rows: getStaffRows_(true) };
}

function handleStaffDropdown_() {
  return {
    items: getStaffRows_(true).map(r => ({
      value: r.roepnummer,
      label: r.roepnummer + ' - ' + r.naam
    }))
  };
}

function getStaffRows_(readonly) {
  const rows = readSheetAsObjects_(CONFIG.SHEET_STAFF);

  return rows
    .map(sanitizeStaffRow_)
    .filter(r => r.roepnummer && r.naam)
    .filter(r => readonly ? r.is_active : true);
}

function handleSaveAllStaff_(body) {
  const rows = sanitizeRowsByType_('staff', body.rows);
  writeObjectsToSheetWithHeaders_(CONFIG.SHEET_STAFF, STAFF_HEADERS, rows);
  return { saved: true };
}

function handleSaveStaffRow_(body) {
  const row = sanitizeStaffRow_(body.row);
  return upsertStaffRow_(row);
}

function handleDeleteStaffByCallsign_(body) {
  const roepnummer = body.roepnummer;
  const sheet = getSheetOrThrow_(CONFIG.SHEET_STAFF);
  const data = sheet.getDataRange().getValues();

  for (let i = data.length; i >= 2; i--) {
    if (String(data[i-1][0]) === String(roepnummer)) {
      sheet.deleteRow(i);
      return { success: true };
    }
  }

  throw new Error('Niet gevonden');
}