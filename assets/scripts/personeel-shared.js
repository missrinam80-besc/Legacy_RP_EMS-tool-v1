/**
 * Gedeelde helpers voor de personeelslijst.
 * Deze functies worden gebruikt door zowel admin.js als view.js.
 */

window.PersoneelShared = (() => {
  const STATUS_OPTIONS = ['actief', 'non-actief', 'verlof'];

  function normalizeStatus(value) {
    const status = String(value || '').trim().toLowerCase();

    if (status === 'actief') return 'actief';
    if (status === 'verlof') return 'verlof';
    if (status === 'non actief' || status === 'non-actief' || status === 'nonactief') return 'non-actief';

    return 'actief';
  }

  function getStatusClass(status) {
    const value = normalizeStatus(status);

    if (value === 'actief') return 'personeel-badge--actief';
    if (value === 'non-actief') return 'personeel-badge--non-actief';
    if (value === 'verlof') return 'personeel-badge--verlof';

    return 'personeel-badge--default';
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function setMessage(messageBox, text, type = 'info') {
    messageBox.textContent = text;

    const classMap = {
      success: 'status-box status-success mt-2',
      error: 'status-box status-error mt-2',
      info: 'status-box status-info mt-2'
    };

    messageBox.className = classMap[type] || classMap.info;
  }

  function sanitizeRow(row) {
    return {
      roepnummer: String(row.roepnummer || '').trim(),
      naam: String(row.naam || '').trim(),
      rang: String(row.rang || '').trim(),
      afdeling: String(row.afdeling || '').trim(),
      status: normalizeStatus(row.status),
      is_active: !!row.is_active
    };
  }

  return {
    STATUS_OPTIONS,
    normalizeStatus,
    getStatusClass,
    escapeHtml,
    setMessage,
    sanitizeRow
  };
})();
