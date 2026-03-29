function getSheetOrThrow_(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('Sheet niet gevonden: ' + name);
  return sheet;
}

function readSheetAsObjects_(sheetName) {
  const sheet = getSheetOrThrow_(sheetName);
  const data = sheet.getDataRange().getValues();

  if (data.length < 2) return [];

  const headers = data[0];

  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function writeObjectsToSheet_(sheetName, rows) {
  const sheet = getSheetOrThrow_(sheetName);
  sheet.clearContents();

  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const values = [headers].concat(rows.map(r => headers.map(h => r[h])));

  sheet.getRange(1, 1, values.length, headers.length).setValues(values);
}

function writeObjectsToSheetWithHeaders_(sheetName, headers, rows) {
  const sheet = getSheetOrThrow_(sheetName);
  sheet.clearContents();

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (!rows.length) return;

  const values = rows.map(r => headers.map(h => r[h]));
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
}