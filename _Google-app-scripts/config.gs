function doGet(e) {
  return handleRequest_(e);
}

function doPost(e) {
  return handleRequest_(e);
}

function handleRequest_(e) {
  try {
    const method = e.method || 'GET';
    const action = e.parameter.action;
    const body = getJsonBody_(e);

    if (!action) throw new Error('Missing action');

    let result;

    switch (action) {

      // ===== HEALTH =====
      case 'healthcheck':
        result = handleHealthcheck_(); break;

      case 'pingSheets':
        result = handlePingSheets_(); break;

      case 'testConfig':
        result = handleTestConfig_(); break;

      case 'testStaff':
        result = handleTestStaff_(); break;

      case 'debugInfo':
        result = handleDebugInfo_(); break;

      // ===== CONFIG =====
      case 'getConfig':
        result = handleGetConfig_(e); break;

      case 'getAllConfigs':
        result = handleGetAllConfigs_(); break;

      case 'saveConfig':
        ensurePost_(method);
        result = handleSaveConfig_(body); break;

      // ===== STAFF =====
      case 'list':
        result = handleListStaff_(); break;

      case 'readonly':
        result = handleReadonlyStaff_(); break;

      case 'dropdown':
        result = handleStaffDropdown_(); break;

      case 'saveAll':
        ensurePost_(method);
        result = handleSaveAllStaff_(body); break;

      case 'saveRow':
        result = method === 'GET'
          ? handleSaveStaffRow_(getRowPayloadFromGet_(e))
          : handleSaveStaffRow_(body);
        break;

      case 'deleteByCallsign':
        ensurePost_(method);
        result = handleDeleteStaffByCallsign_(body); break;

      default:
        throw new Error('Unknown action: ' + action);
    }

    return jsonSuccess_(result);

  } catch (err) {
    logError_('handleRequest', err);
    return jsonError_(err.message);
  }
}