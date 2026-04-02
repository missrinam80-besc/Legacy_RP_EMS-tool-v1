function logDebug_(eventName, payload) {
  try {
    Logger.log('[DEBUG] ' + String(eventName || '') + ' ' + JSON.stringify(payload || {}));
  } catch (error) {
    Logger.log('[DEBUG] ' + String(eventName || ''));
  }
}

function logError_(eventName, error, payload) {
  try {
    Logger.log('[ERROR] ' + String(eventName || '') + ' ' + JSON.stringify({
      message: error && error.message ? error.message : String(error || ''),
      payload: payload || {}
    }));
  } catch (logFailure) {
    Logger.log('[ERROR] ' + String(eventName || '') + ' ' + String(error && error.message ? error.message : error || ''));
  }
}