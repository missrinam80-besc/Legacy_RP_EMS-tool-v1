function handleHealthcheck_() {
  return {
    status: 'ok',
    service: 'ems-tool-api',
    timestamp: new Date().toISOString(),
    spreadsheet: getSpreadsheet_().getName()
  };
}