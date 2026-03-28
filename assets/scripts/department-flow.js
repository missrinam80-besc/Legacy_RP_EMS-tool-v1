
(function () {
  const STORE_PREFIX = 'ems.departmentFlow.';

  function byId(id) { return document.getElementById(id); }
  function q(sel) { return document.querySelector(sel); }
  function qa(sel) { return Array.from(document.querySelectorAll(sel)); }
  function text(v) { return String(v ?? '').trim(); }

  function setFieldValue(id, value) {
    const el = byId(id);
    if (!el || value == null || value === '') return false;
    if (el.tagName === 'SELECT' && el.multiple && Array.isArray(value)) {
      Array.from(el.options).forEach(opt => { opt.selected = value.includes(opt.value) || value.includes(opt.textContent.trim()); });
      return true;
    }
    if (el.type === 'checkbox') {
      el.checked = value === true || value === 'true' || value === 'Ja';
      return true;
    }
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function applyMapping(payload, mapping) {
    if (!mapping || !payload) return 0;
    let applied = 0;
    Object.entries(mapping).forEach(([fromKey, target]) => {
      const value = payload.values?.[fromKey];
      if (value == null || value === '') return;
      if (Array.isArray(target)) {
        target.forEach((id) => { if (setFieldValue(id, value)) applied += 1; });
      } else if (typeof target === 'string') {
        if (setFieldValue(target, value)) applied += 1;
      }
    });
    return applied;
  }

  function injectCard(config) {
    const mount = q(config.mountSelector || '.tool-nav, .request-hero-card__content, .intro, .page-container');
    if (!mount) return;
    const card = document.createElement('section');
    card.className = 'flow-card';
    card.innerHTML = `
      <h2 class="flow-card__title">Standaard flow ${config.label || ''}</h2>
      <p class="flow-card__text">Gebruik altijd dezelfde volgorde: aanvraag → tool → rapport. Je kan gegevens lokaal doorzetten naar de volgende stap.</p>
      <ol class="flow-steps">
        ${(config.steps || []).map(step => `<li class="flow-step ${step.id === config.stage ? 'is-active' : ''}">${step.title}</li>`).join('')}
      </ol>
      <div class="flow-actions" id="flowActions"></div>
      <div class="status-box status-info" id="flowStatus">Flowhulp geladen.</div>
    `;
    if (mount.classList && mount.classList.contains('tool-nav')) mount.after(card); else mount.appendChild(card);

    const actions = card.querySelector('#flowActions');
    const prev = (config.steps || []).findIndex(s => s.id === config.stage) - 1;
    const idx = (config.steps || []).findIndex(s => s.id === config.stage);
    const next = idx >= 0 ? idx + 1 : -1;
    if (prev >= 0) {
      const prevStep = config.steps[prev];
      const a = document.createElement('a');
      a.className = 'btn btn-secondary';
      a.href = prevStep.url;
      a.textContent = `← Naar ${prevStep.shortTitle || prevStep.title}`;
      actions.appendChild(a);
    }
    if (config.importMapping) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-secondary';
      b.textContent = config.importLabel || 'Importeer vorige stap';
      b.addEventListener('click', () => {
        const payload = api.load(config.departmentKey);
        const status = card.querySelector('#flowStatus');
        if (!payload) {
          status.textContent = 'Er staat nog geen vorige stap klaar in de lokale flowopslag.';
          return;
        }
        const count = applyMapping(payload, config.importMapping);
        if (typeof config.afterImport === 'function') config.afterImport(payload);
        status.textContent = count ? `Gegevens uit ${payload.stageLabel || payload.stage} geïmporteerd.` : 'Er was flowdata, maar er kon niets automatisch ingevuld worden.';
      });
      actions.appendChild(b);
    }
    if (next >= 0) {
      const nextStep = config.steps[next];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-primary';
      b.textContent = config.saveNextLabel || `Zet klaar voor ${nextStep.shortTitle || nextStep.title}`;
      b.addEventListener('click', () => {
        const payload = {
          departmentKey: config.departmentKey,
          label: config.label,
          stage: config.stage,
          stageLabel: (config.steps || []).find(s => s.id === config.stage)?.title || config.stage,
          updatedAt: new Date().toISOString(),
          values: typeof config.collectValues === 'function' ? config.collectValues() : {},
          summary: typeof config.buildSummary === 'function' ? config.buildSummary() : ''
        };
        api.save(config.departmentKey, payload);
        const status = card.querySelector('#flowStatus');
        status.textContent = `Huidige stap opgeslagen. Volgende stap: ${nextStep.title}.`;
        if (config.nextUrl) window.location.href = config.nextUrl;
        else window.location.href = nextStep.url;
      });
      actions.appendChild(b);
    }
  }

  const api = {
    save(key, payload) { localStorage.setItem(STORE_PREFIX + key, JSON.stringify(payload)); },
    load(key) { try { return JSON.parse(localStorage.getItem(STORE_PREFIX + key) || 'null'); } catch { return null; } },
    clear(key) { localStorage.removeItem(STORE_PREFIX + key); },
    init(config) {
      if (!config || !config.departmentKey) return;
      injectCard(config);
      if (config.autoImport) {
        const payload = api.load(config.departmentKey);
        if (payload) {
          applyMapping(payload, config.importMapping || {});
          if (typeof config.afterImport === 'function') config.afterImport(payload);
        }
      }
    }
  };

  window.DepartmentFlow = api;
})();
