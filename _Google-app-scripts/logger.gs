function logAction_(action, actor, id, name, message) {
  const sheet = getSheetOrThrow_(CONFIG.SHEET_LOG);

  sheet.appendRow([
    new Date(),
    actor,
    action,
    id,
    name,
    message
  ]);
}

function logError_(source, err) {
  const sheet = getSheetOrThrow_(CONFIG.SHEET_LOG);

  sheet.appendRow([
    new Date(),
    source,
    'error',
    '',
    '',
    err.message
  ]);
}