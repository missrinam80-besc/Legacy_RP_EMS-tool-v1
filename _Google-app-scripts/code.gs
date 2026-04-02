/**
 * EMS Tool API Router
 * -------------------
 * Centrale router voor:
 * - healthcheck
 * - personeel readonly/list/save
 * - centrale config get/save
 */

function doGet(e) {
  return handleRequest_(e, 'GET');
}

function doPost(e) {
  return handleRequest_(e, 'POST');
}

function handleRequest_(e, method) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || '').trim().toLowerCase();
    const body = getJsonBody_(e);

    logDebug_('handleRequest_start', {
      method: method,
      action: action,
      params: (e && e.parameter) || {},
      hasBody: !!Object.keys(body || {}).length
    });

    let result;

    switch (action) {
      case '':
      case 'health':
      case 'healthcheck':
        result = handleHealthcheck_();
        break;

      // =========================
      // PERSONEEL
      // =========================
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

      // =========================
      // CONFIG
      // =========================
      case 'getconfig':
        result = handleGetConfig_(e);
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

    logDebug_('handleRequest_success', {
      method: method,
      action: action
    });

    return okResponse_(result);
  } catch (error) {
    logError_('handleRequest_error', error, {
      method: method,
      params: (e && e.parameter) || {}
    });
    return errorResponse_(error);
  }
}