(function (global) {
  const STORAGE_SUFFIX = '_central_report';
  const DEFAULT_LABELS = {
    medication: 'Centrale medicatie',
    prices: 'Centrale kosten',
    sync: 'Bereken totaal en vul kostenveld',
    emptyMedication: 'Geen centrale medicatie beschikbaar voor dit rapport.',
    emptyPrices: 'Geen centrale kostenregels beschikbaar voor dit rapport.',
    hint: 'Deze selectie leest mee uit de centrale beheerlaag. Je kunt ze optioneel aanvinken voor dit rapport.'
  };

  const state = {
    initialized: false,
    options: {},
    prices: [],
    medication: []
  };

  function toArray(value) {
    if (Array.isArray(value)) return value;
    if (value == null || value === '') return [];
    if (typeof value === 'string') return value.split('|').map((item) => item.trim()).filter(Boolean);
    return [value];
  }

  function toBool(value) {
    if (value === true || value === false) return value;
    const normalized = String(value || '').trim().toLowerCase();
    return ['true', '1', 'yes', 'ja', 'waar', 'on'].includes(normalized);
  }

  function normalizePayload(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.data?.items)) return payload.data.items;
    return [];
  }

  function normalizePrice(item) {
    return {
      id: item.id || '',
      label: item.label || item.name || 'Naamloos item',
      department: String(item.department || '').trim().toLowerCase(),
      documentTypes: toArray(item.documentTypes).map((value) => String(value).trim().toLowerCase()),
      price: Number(item.defaultPrice ?? item.price ?? 0) || 0,
      active: item.active !== false && !['false', '0', 'nee', 'no'].includes(String(item.active).toLowerCase?.() || ''),
      visibleInReports: item.visibleInReports == null ? true : toBool(item.visibleInReports),
      category: item.category || '',
      notes: item.notes || ''
    };
  }

  function normalizeMedication(item) {
    return {
      id: item.id || '',
      name: item.name || item.label || 'Naamloze medicatie',
      departments: toArray(item.departments).map((value) => String(value).trim().toLowerCase()),
      price: Number(item.price ?? 0) || 0,
      active: item.active !== false && !['false', '0', 'nee', 'no'].includes(String(item.active).toLowerCase?.() || ''),
      type: item.type || '',
      category: item.category || '',
      dosage: item.dosage || '',
      route: item.route || '',
      indication: item.indication || '',
      contraNote: item.contraNote || '',
      warnings: toArray(item.warnings),
      notes: item.notes || ''
    };
  }

  function normalizeDepartment(value) {
    const raw = String(value || '').trim().toLowerCase();
    const map = {
      general: 'algemeen',
      ambulance: 'ambulance',
      spoed: 'spoed',
      chirurgie: 'chirurgie',
      psych: 'psychologie',
      psychologie: 'psychologie',
      revalidatie: 'ortho',
      ortho: 'ortho',
      orthopedie: 'ortho'
    };
    return map[raw] || raw;
  }

  function matchesDocument(itemDocTypes, targetDocType) {
    if (!targetDocType) return true;
    if (!itemDocTypes.length) return true;
    return itemDocTypes.includes(String(targetDocType).trim().toLowerCase());
  }

  function matchesDepartment(itemDepartment, targetDepartment) {
    const normalizedTarget = normalizeDepartment(targetDepartment);
    if (!normalizedTarget) return true;

    if (Array.isArray(itemDepartment)) {
      if (!itemDepartment.length) return true;
      return itemDepartment.map(normalizeDepartment).includes(normalizedTarget);
    }

    const normalizedItem = normalizeDepartment(itemDepartment);
    if (!normalizedItem || ['algemeen', 'general'].includes(normalizedItem)) return true;
    return normalizedItem === normalizedTarget;
  }

  async function loadCentralData() {
    if (!global.EMSAdminStore?.get) {
      return { prices: [], medication: [] };
    }

    const [pricesPayload, medicationPayload] = await Promise.all([
      global.EMSAdminStore.get('prices').catch(() => ({ items: [] })),
      global.EMSAdminStore.get('medication').catch(() => ({ items: [] }))
    ]);

    return {
      prices: normalizePayload(pricesPayload).map(normalizePrice),
      medication: normalizePayload(medicationPayload).map(normalizeMedication)
    };
  }

  function getStorageKey() {
    return `${state.options.storageKey || 'ems-report'}${STORAGE_SUFFIX}`;
  }

  function readSavedSelection() {
    try {
      return JSON.parse(localStorage.getItem(getStorageKey()) || '{}');
    } catch (error) {
      console.warn('[EMSReportCentral] Kon selectie niet lezen.', error);
      return {};
    }
  }

  function saveSelection() {
    const selection = getSelection();
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(selection));
    } catch (error) {
      console.warn('[EMSReportCentral] Kon selectie niet bewaren.', error);
    }
  }

  function clearSelection() {
    localStorage.removeItem(getStorageKey());
  }

  function getSelection() {
    const medication = Array.from(document.querySelectorAll('[data-central-med]:checked')).map((el) => el.value);
    const prices = Array.from(document.querySelectorAll('[data-central-price]:checked')).map((el) => el.value);
    return { medication, prices };
  }

  function getSelectedMedication() {
    const selected = new Set(getSelection().medication);
    return state.medication.filter((item) => selected.has(item.id));
  }

  function getSelectedPrices() {
    const selected = new Set(getSelection().prices);
    return state.prices.filter((item) => selected.has(item.id));
  }

  function computeSelectedTotal() {
    return [...getSelectedMedication(), ...getSelectedPrices()].reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  }

  function renderList(items, mode) {
    if (!items.length) {
      return `<div class="muted-line">${mode === 'medication' ? DEFAULT_LABELS.emptyMedication : DEFAULT_LABELS.emptyPrices}</div>`;
    }

    return items.map((item) => {
      const description = mode === 'medication'
        ? [item.category, item.route, item.dosage].filter(Boolean).join(' · ')
        : [item.category, item.department].filter(Boolean).join(' · ');

      return `
        <label class="checkbox-card">
          <input type="checkbox" value="${escapeAttr(item.id)}" ${mode === 'medication' ? 'data-central-med' : 'data-central-price'} />
          <span class="checkbox-card__body">
            <strong>${escapeHtml(mode === 'medication' ? item.name : item.label)}</strong>
            <span>${escapeHtml(description || 'Geen extra details')}</span>
            <span>€ ${formatEuro(item.price)}</span>
          </span>
        </label>
      `;
    }).join('');
  }

  function ensureStyles() {
    if (document.getElementById('ems-report-central-style')) return;
    const style = document.createElement('style');
    style.id = 'ems-report-central-style';
    style.textContent = `
      .report-central-panel { border-top: 1px solid rgba(255,255,255,.08); padding-top: 1rem; margin-top: 1rem; }
      .report-central-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: .75rem; }
      .checkbox-card { display: flex; gap: .75rem; align-items: flex-start; padding: .75rem; border: 1px solid rgba(255,255,255,.08); border-radius: 12px; margin-bottom: .5rem; cursor: pointer; }
      .checkbox-card input { margin-top: .15rem; }
      .checkbox-card__body { display: flex; flex-direction: column; gap: .2rem; }
      .report-central-actions { display: flex; gap: .75rem; align-items: center; flex-wrap: wrap; margin-top: .75rem; }
      .report-central-total { font-weight: 600; }
      .report-central-help { margin-bottom: .75rem; opacity: .8; }
    `;
    document.head.appendChild(style);
  }

  function injectPanel() {
    const host = document.querySelector('.input-panel .panel-body')
      || document.querySelector('.panel .panel-body')
      || document.querySelector('.panel-body');

    if (!host) return;

    const existing = document.getElementById('reportCentralSection');
    if (existing) existing.remove();

    const section = document.createElement('details');
    section.className = 'accordion-section report-central-panel';
    section.id = 'reportCentralSection';
    section.innerHTML = `
      <summary>Centrale medicatie & kosten</summary>
      <div class="accordion-content">
        <p class="report-central-help">${DEFAULT_LABELS.hint}</p>
        <div class="report-central-grid">
          <div>
            <h3>${DEFAULT_LABELS.medication}</h3>
            <div id="reportCentralMedicationList">${renderList(state.medication, 'medication')}</div>
          </div>
          <div>
            <h3>${DEFAULT_LABELS.prices}</h3>
            <div id="reportCentralPriceList">${renderList(state.prices, 'prices')}</div>
          </div>
        </div>
        <div class="report-central-actions">
          <button type="button" class="btn btn-secondary btn-compact" id="syncCentralCostsBtn">${DEFAULT_LABELS.sync}</button>
          <span class="report-central-total" id="reportCentralTotal">Berekend subtotaal: € 0,00</span>
        </div>
      </div>
    `;

    const costSummary = Array.from(host.querySelectorAll('details.accordion-section')).find((entry) => {
      return /kosten/i.test(entry.querySelector('summary')?.textContent || '');
    });

    if (costSummary && costSummary.parentNode === host) {
      host.insertBefore(section, costSummary);
    } else {
      host.appendChild(section);
    }
  }

  function restoreSelection() {
    const saved = readSavedSelection();
    toArray(saved.medication).forEach((id) => {
      const input = document.querySelector(`[data-central-med][value="${cssEscape(id)}"]`);
      if (input) input.checked = true;
    });
    toArray(saved.prices).forEach((id) => {
      const input = document.querySelector(`[data-central-price][value="${cssEscape(id)}"]`);
      if (input) input.checked = true;
    });
    updateCentralCostLabel();
    syncMedicationField();
  }

  function cssEscape(value) {
    if (global.CSS?.escape) return global.CSS.escape(String(value));
    return String(value).replace(/([\\"\]])/g, '\\$1');
  }

  function bindPanelEvents() {
    document.querySelectorAll('[data-central-med], [data-central-price]').forEach((input) => {
      input.addEventListener('change', handleSelectionChange);
    });

    document.getElementById('syncCentralCostsBtn')?.addEventListener('click', syncCostFieldFromCentral);
    document.getElementById('resetBtn')?.addEventListener('click', () => {
      clearSelection();
      window.setTimeout(() => {
        document.querySelectorAll('[data-central-med], [data-central-price]').forEach((input) => {
          input.checked = false;
        });
        updateCentralCostLabel();
        syncMedicationField();
      }, 0);
    });
  }

  function handleSelectionChange() {
    saveSelection();
    updateCentralCostLabel();
    syncMedicationField();
    if (typeof state.options.onChange === 'function') {
      state.options.onChange();
    }
  }

  function syncMedicationField() {
    const medicationField = document.getElementById('medicationGiven');
    if (!medicationField) return;

    const currentManual = medicationField.dataset.manualText || medicationField.value.trim();
    medicationField.dataset.manualText = currentManual;

    const meds = getSelectedMedication();
    if (!meds.length) {
      medicationField.value = currentManual;
      return;
    }

    const autoLines = meds.map((item) => {
      const parts = [item.name, item.dosage, item.route].filter(Boolean);
      return parts.join(' - ');
    });

    medicationField.value = [currentManual, '[Centrale selectie]', ...autoLines]
      .filter(Boolean)
      .join('\n');
  }

  function syncCostFieldFromCentral() {
    const totalField = document.getElementById('costTotal');
    const notesField = document.getElementById('costNotes');
    const total = computeSelectedTotal();

    if (totalField) {
      totalField.value = total ? String(total) : '';
      totalField.dataset.centralSynced = 'true';
    }

    if (notesField) {
      const labels = [...getSelectedPrices().map((item) => item.label), ...getSelectedMedication().map((item) => item.name)];
      notesField.value = labels.length ? `Centrale selectie: ${labels.join(', ')}` : notesField.value;
    }

    updateCentralCostLabel();
    saveSelection();
    if (typeof state.options.onChange === 'function') {
      state.options.onChange();
    }
  }

  function updateCentralCostLabel() {
    const total = computeSelectedTotal();
    const label = document.getElementById('reportCentralTotal');
    if (label) {
      label.textContent = `Berekend subtotaal: € ${formatEuro(total)}`;
    }
  }

  function formatEuro(value) {
    return new Intl.NumberFormat('nl-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));
  }

  function appendSections(reportText) {
    const meds = getSelectedMedication();
    const prices = getSelectedPrices();
    if (!meds.length && !prices.length) return reportText;

    const lines = [reportText, '', '---', '', '__**CENTRALE MEDICATIE & KOSTEN**__'];

    if (meds.length) {
      lines.push('', '__**CENTRALE MEDICATIESELECTIE**__');
      meds.forEach((item) => {
        const detail = [item.category, item.dosage, item.route].filter(Boolean).join(' | ');
        lines.push(`- **${item.name}**${detail ? ` (${detail})` : ''}${item.indication ? ` — ${item.indication}` : ''}${item.price ? ` | € ${formatEuro(item.price)}` : ''}`);
      });
    }

    if (prices.length) {
      lines.push('', '__**CENTRALE KOSTENITEMS**__');
      prices.forEach((item) => {
        lines.push(`- **${item.label}**${item.category ? ` (${item.category})` : ''} | € ${formatEuro(item.price)}`);
      });
    }

    lines.push('', `- **Berekend subtotaal centrale selectie:** € ${formatEuro(computeSelectedTotal())}`);
    return lines.join('\n');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  async function init(options = {}) {
    state.options = options;
    const payload = await loadCentralData();

    state.prices = payload.prices.filter((item) => item.active && item.visibleInReports)
      .filter((item) => matchesDocument(item.documentTypes, options.documentType))
      .filter((item) => matchesDepartment(item.department, options.department));

    state.medication = payload.medication.filter((item) => item.active)
      .filter((item) => matchesDepartment(item.departments, options.department));

    ensureStyles();
    injectPanel();
    restoreSelection();
    bindPanelEvents();
    state.initialized = true;
  }

  global.EMSReportCentral = { init, appendSections, getSelection, computeSelectedTotal, clearSelection };
})(window);
