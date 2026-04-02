/**
 * Response helpers
 */

function okResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify({
      ok: true,
      data: data || {}
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse_(error) {
  return ContentService
    .createTextOutput(JSON.stringify({
      ok: false,
      error: error && error.message ? error.message : String(error || 'Onbekende fout')
    }))
    .setMimeType(ContentService.MimeType.JSON);
}