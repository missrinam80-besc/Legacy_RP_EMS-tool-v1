(function(global) {
  function showToast(message, type = 'info') {
    const target = document.getElementById('statusMessage');
    if (!target) return;
    target.textContent = message;
    target.className = `status status--${type}`;
  }

  function filterCollection(items, query, fields = []) {
    if (!query) return items;
    const normalized = query.trim().toLowerCase();
    return items.filter((item) =>
      fields.some((field) => String(item?.[field] ?? '').toLowerCase().includes(normalized))
    );
  }

  function renderStatusBadge(label, tone = 'neutral') {
    return `<span class="tool-status tool-status--${tone}">${label}</span>`;
  }

  function renderToggleLabel(value, trueLabel = 'Ja', falseLabel = 'Nee') {
    return value ? trueLabel : falseLabel;
  }

  global.AdminUI = {
    showToast,
    filterCollection,
    renderStatusBadge,
    renderToggleLabel
  };
})(window);
