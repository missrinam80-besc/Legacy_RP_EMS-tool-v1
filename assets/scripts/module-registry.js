(function (global) {
  const URL_ALIASES = {
    'tools/feedback/index.html': 'tools/aanvragen-feedback/index.html',
    'tools/training-aanvraag/index.html': 'tools/aanvragen-training/index.html',
    'tools/specialisatie-aanvraag/index.html': 'tools/aanvragen-specialisatie/index.html',
    'pages/portaal-spoed-ambu.html': 'tools/portaal-spoed-ambu/index.html',
    'pages/portaal-chirurgie.html': 'tools/portaal-chirurgie/index.html',
    'pages/portaal-psychologie.html': 'tools/portaal-psychologie/index.html',
    'pages/portaal-ortho-revalidatie.html': 'tools/portaal-ortho-revalidatie/index.html',
    'pages/portaal-forensisch.html': 'tools/portaal-forensisch/index.html'
  };

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function normalizeContext(value) {
    let cleaned = normalize(value)
      .replace(/[_\s]+/g, '-')
      .replace(/\.+/g, '.')
      .replace(/-+/g, '-');

    cleaned = cleaned
      .replace(/^home\.medewerker\./, 'home.')
      .replace(/^home\.command\./, 'command.')
      .replace(/^command\.high-command\./, 'command.')
      .replace(/algemene-info/g, 'algemene-info')
      .replace(/algemene_info/g, 'algemene-info')
      .replace(/quick-actions/g, 'quick')
      .replace(/quick_actions/g, 'quick');

    return cleaned;
  }

  function toSafeText(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function asArray(value) {
    if (Array.isArray(value)) return value.filter(Boolean);

    if (typeof value === 'string') {
      return value
        .split('|')
        .map((part) => part.trim())
        .filter(Boolean);
    }

    return [];
  }

  function resolveModuleUrl(url) {
    const raw = String(url || '').trim();
    if (!raw) return '#';
    const alias = URL_ALIASES[raw] || raw;
    return alias;
  }

  function normalizeModuleRow(item) {
    return {
      ...item,
      url: resolveModuleUrl(item.url),
      keywords: Array.isArray(item.keywords)
        ? item.keywords.join(' ')
        : String(item.keywords || ''),
      contexts: asArray(item.contexts).map(normalizeContext),
      enabled: item.enabled !== false && String(item.enabled).toLowerCase() !== 'false',
      order: Number(item.order) || 9999
    };
  }

  async function loadModuleData() {
    if (!global.EMSAdminStore) {
      throw new Error('EMSAdminStore ontbreekt.');
    }

    const raw = await global.EMSAdminStore.get('modules');
    const items = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.items)
        ? raw.items
        : [];

    return {
      items: items.map(normalizeModuleRow)
    };
  }

  function getStatusTone(status = '') {
    const value = normalize(status);

    if (value === 'actief' || value === 'live') return 'success';
    if (value === 'nieuw') return 'warning';
    if (value === 'in opbouw' || value === 'in-opbouw' || value === 'beta') return 'warning';
    if (value === 'intern') return 'info';

    return '';
  }

  function itemMatchesContext(item, context) {
    const targetContext = normalizeContext(context);
    const contexts = asArray(item.contexts).map(normalizeContext);
    return contexts.includes(targetContext) && item.enabled !== false;
  }

  function sortItems(items) {
    return [...items].sort((a, b) => (Number(a.order) || 9999) - (Number(b.order) || 9999));
  }

  function buildQuickAction(item) {
    return `
      <a class="quick-action-card module-card"
         href="${toSafeText(item.url)}"
         data-name="${toSafeText(item.name)}"
         data-category="${toSafeText(item.type)}"
         data-status="${toSafeText(item.status)}"
         data-keywords="${toSafeText(item.keywords)}">
        <span class="quick-action-card__icon" aria-hidden="true">${toSafeText(item.icon || '🔗')}</span>
        <div>
          <strong>${toSafeText(item.name)}</strong>
          <p class="text-soft mt-1">${toSafeText(item.description)}</p>
        </div>
      </a>
    `;
  }

  function buildToolCard(item, variant = 'hub') {
    const baseClass = variant === 'portal' ? 'portal-card' : 'tool-card tool-card--hub';
    const titleClass = variant === 'portal' ? 'portal-card__title' : 'tool-card__title-row';
    const iconClass = variant === 'portal' ? 'portal-card__icon' : 'tool-icon';
    const topClass = variant === 'portal' ? 'portal-card__top' : 'tool-card__top';
    const badgeClass = variant === 'portal' ? 'portal-card__badge' : 'tool-badge';
    const statusClass = variant === 'portal' ? 'portal-card__status' : 'tool-status';
    const tone = getStatusTone(item.status);
    const footer = variant === 'portal'
      ? '<div class="portal-card__footer"><span class="portal-card__link">Openen →</span></div>'
      : '';

    return `
      <a class="${baseClass} module-card"
         href="${toSafeText(item.url)}"
         data-name="${toSafeText(item.name)}"
         data-category="${toSafeText(item.type)} ${toSafeText(item.department)}"
         data-status="${toSafeText(item.status)}"
         data-keywords="${toSafeText(item.keywords)}">
        <div class="${topClass}">
          <span class="${badgeClass}">${toSafeText(item.badge || item.type)}</span>
          <span class="${statusClass}${tone ? ` ${statusClass}--${tone}` : ''}">
            ${toSafeText(item.status || '')}
          </span>
        </div>
        <div class="${titleClass}">
          <span class="${iconClass}" aria-hidden="true">${toSafeText(item.icon || '🔗')}</span>
          ${variant === 'portal'
            ? `<div><h3>${toSafeText(item.name)}</h3></div>`
            : `<h3>${toSafeText(item.name)}</h3>`}
        </div>
        <p>${toSafeText(item.description)}</p>
        ${footer}
      </a>
    `;
  }

  function renderRegion(context, container) {
    const all = global.__EMS_MODULES__?.items || [];
    const items = sortItems(all.filter((item) => itemMatchesContext(item, context)));
    const variant = container.dataset.variant || 'hub';
    const type = container.dataset.renderType || 'cards';

    if (!items.length) {
      container.innerHTML = '<div class="status-box status-info">Geen modules beschikbaar in deze sectie.</div>';
      return 0;
    }

    container.innerHTML = items
      .map((item) => (type === 'quick' ? buildQuickAction(item) : buildToolCard(item, variant)))
      .join('');

    return items.length;
  }

  function filterCards(searchInputSelector, cardSelector, sectionSelector, statusSelector, emptyMessage) {
    const searchInput = document.querySelector(searchInputSelector);
    const statusBox = document.querySelector(statusSelector);

    if (!searchInput) return;

    const applyFilter = () => {
      const query = normalize(searchInput.value);
      const cards = Array.from(document.querySelectorAll(cardSelector));
      let visibleCount = 0;

      cards.forEach((card) => {
        const haystack = normalize([
          card.dataset.name,
          card.dataset.category,
          card.dataset.status,
          card.dataset.keywords,
          card.textContent
        ].join(' '));

        const match = !query || haystack.includes(query);
        card.hidden = !match;
        if (match) visibleCount += 1;
      });

      Array.from(document.querySelectorAll(sectionSelector)).forEach((section) => {
        const visibleChildren = Array.from(section.querySelectorAll(cardSelector))
          .filter((card) => !card.hidden).length;

        section.hidden = visibleChildren === 0;
      });

      if (statusBox) {
        if (!query) {
          statusBox.textContent = `Klaar om te starten. ${cards.length} links en modules beschikbaar.`;
        } else if (!visibleCount) {
          statusBox.textContent = emptyMessage || `Geen resultaten voor "${searchInput.value}".`;
        } else {
          statusBox.textContent = `${visibleCount} resultaten gevonden voor "${searchInput.value}".`;
        }
      }
    };

    searchInput.addEventListener('input', applyFilter);
    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        searchInput.value = '';
        applyFilter();
        searchInput.blur();
      }
    });

    applyFilter();
  }

  async function renderPageRegions() {
    global.__EMS_MODULES__ = await loadModuleData();

    const regions = Array.from(document.querySelectorAll('[data-module-context]'));
    regions.forEach((container) => {
      renderRegion(container.dataset.moduleContext, container);
    });

    return global.__EMS_MODULES__;
  }

  global.ModuleRegistry = {
    loadModuleData,
    renderPageRegions,
    renderRegion,
    filterCards,
    sortItems,
    normalizeModuleRow,
    normalizeContext,
    resolveModuleUrl
  };
})(window);
