function handleHealthcheck_() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString()
  };
}

function handlePingSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    name: ss.getName(),
    id: ss.getId()
  };
}

function handleTestConfig_() {
  const result = {};
  Object.keys(CONFIG_SHEETS).forEach(type => {
    result[type] = readSheetAsObjects_(CONFIG_SHEETS[type]).length;
  });
  return result;
}

function handleTestStaff_() {
  return {
    count: getStaffRows_(false).length
  };
}

function handleDebugInfo_() {
  return {
    sheets: Object.values(CONFIG_SHEETS)
  };
}