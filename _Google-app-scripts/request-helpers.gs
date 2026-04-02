/**
 * Request helpers
 * ----------------
 * Ondersteunt:
 * - lege GET requests
 * - JSON body
 * - x-www-form-urlencoded met payload=
 */

function getJsonBody_(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return {};

    var raw = String(e.postData.contents || '').trim();
    if (!raw) return {};

    if (raw.charAt(0) === '{' || raw.charAt(0) === '[') {
      return JSON.parse(raw);
    }

    var params = {};
    raw.split('&').forEach(function (part) {
      var pieces = part.split('=');
      var key = decodeURIComponent((pieces[0] || '').replace(/\+/g, ' '));
      var value = decodeURIComponent((pieces.slice(1).join('=') || '').replace(/\+/g, ' '));
      params[key] = value;
    });

    if (params.payload) {
      return JSON.parse(params.payload);
    }

    return params;
  } catch (err) {
    throw new Error('Ongeldige request body: ' + err.message);
  }
}

function ensurePost_(method) {
  if (String(method || '').toUpperCase() !== 'POST') {
    throw new Error('Deze actie vereist een POST request.');
  }
}

function getRowPayloadFromGet_(e) {
  if (!e || !e.parameter) return { row: {} };

  return {
    row: {
      roepnummer: e.parameter.roepnummer || '',
      naam: e.parameter.naam || '',
      rang: e.parameter.rang || '',
      afdeling: e.parameter.afdeling || '',
      status: e.parameter.status || '',
      zichtbaar: e.parameter.zichtbaar || '',
      is_active: e.parameter.is_active || '',
      updated_at: e.parameter.updated_at || '',
      updated_by: e.parameter.updated_by || ''
    }
  };
}