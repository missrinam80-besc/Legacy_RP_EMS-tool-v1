/**
 * EMS Tool Config
 * ----------------
 * Centrale config voor sheetnamen en instellingen.
 */

var EMS_CONFIG = {
  spreadsheetId: '', // Leeg laten om actieve spreadsheet te gebruiken, of vul expliciet een ID in.
  sheets: {
    staff: 'personeel',
    modules: 'modules',
    theme: 'theme',
    prices: 'prijzen',
    medication: 'medicatie',
    injuries: 'verwondingen',
    treatmentRules: 'behandelregels',
    meta: 'meta',
    logs: 'logs'
  },
  defaults: {
    status: 'actief'
  }
};

function getSpreadsheet_() {
  if (EMS_CONFIG.spreadsheetId && String(EMS_CONFIG.spreadsheetId).trim()) {
    return SpreadsheetApp.openById(String(EMS_CONFIG.spreadsheetId).trim());
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheetByNameSafe_(name) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    throw new Error('Sheet niet gevonden: ' + name);
  }
  return sheet;
}

function getConfigSheetMap_() {
  return {
    theme: EMS_CONFIG.sheets.theme,
    modules: EMS_CONFIG.sheets.modules,
    prices: EMS_CONFIG.sheets.prices,
    medication: EMS_CONFIG.sheets.medication,
    injuries: EMS_CONFIG.sheets.injuries,
    treatmentRules: EMS_CONFIG.sheets.treatmentRules
  };
}