/**
 * EMS Tool API Router
 */
function doGet(e) {
  return handleRequest_(e, 'GET');
}

function doPost(e) {
  return handleRequest_(e, 'POST');
}

function handleRequest_(e, method) {
  try {
    var body = getJsonBody_(e);
    var action = String(
      (e && e.parameter && e.parameter.action) ||
      (body && body.action) ||
      ''
    ).trim().toLowerCase();

    if (typeof logDebug_ === 'function') {
      logDebug_('handleRequest_start', {
        method: method,
        action: action,
        params: (e && e.parameter) || {},
        hasBody: !!Object.keys(body || {}).length
      });
    }

    var result;
    switch (action) {
      case '':
      case 'health':
      case 'healthcheck':
        result = handleHealthcheck_();
        break;

      case 'readonly':
        result = handleReadonlyStaff_();
        break;

      case 'list':
        result = handleListStaff_();
        break;

      case 'save':
      case 'savestaff':
        ensurePost_(method);
        result = handleSaveStaff_(body, e);
        break;

      case 'getconfig':
        result = handleGetConfig_(e, body);
        break;

      case 'getallconfigs':
        result = handleGetAllConfigs_();
        break;

      case 'saveconfig':
        ensurePost_(method);
        result = handleSaveConfig_(body, e);
        break;

      default:
        throw new Error('Onbekende actie: ' + action);
    }

    if (typeof logDebug_ === 'function') {
      logDebug_('handleRequest_success', { method: method, action: action });
    }

    return okResponse_(result);
  } catch (error) {
    if (typeof logError_ === 'function') {
      logError_('handleRequest_error', error, {
        method: method,
        params: (e && e.parameter) || {}
      });
    }
    return errorResponse_(error);
  }
}
