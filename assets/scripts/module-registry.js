(function (global) {
  const URL_ALIASES = {
    'tools/feedback/index.html': 'tools/aanvragen-feedback/index.html',
    'tools/training-aanvraag/index.html': 'tools/aanvragen-training/index.html',
    'tools/specialisatie-aanvraag/index.html': 'tools/aanvragen-specialisatie/index.html',
    'pages/portaal-spoed-ambu.html': 'tools/portaal-spoed-ambu/index.html',
    'pages/portaal-chirurgie.html': 'tools/portaal-chirurgie/index.html',
    'pages/portaal-psychologie.html': 'tools/portaal-psychologie/index.html',
    'pages/portaal-ortho-revalidatie.html': 'tools/portaal-ortho-revalidatie/index.html',
    'pages/portaal-ortho.html': 'tools/portaal-ortho-revalidatie/index.html',
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
      .replace(/algemene_info/g, 'algemene-info')
      .replace(/quick_actions/g, 'quick')
      .replace(/quick-actions/g, 'quick');

    const aliases = {
      'home.medewerker.tools': ['home.quick'],
      'home.tools': ['home.quick'],
      'home.afdelingen-portalen': ['home.afdelingen'],
      'command.high-command.algemene-info': ['command.algemene-info'],
      'command.high-command.aanvragen': ['command.aanvragen'],
      'command.high-command.tools': ['command.tools'],
      'portal.chirurgie': ['portal.chirurgie.tools', 'portal.chirurgie.rapporten', 'portal.chirurgie.aanvragen', 'portal.chirurgie.doorverwijzingen'],
      'portal.psychologie': ['portal.psychologie.tools', 'portal.psychologie.rapporten', 'portal.psychologie.aanvragen', 'portal.psychologie.doorverwijzingen'],
      'portal.forensisch': ['portal.forensisch.tools', 'portal.forensisch.rapporten', 'portal.forensisch.aanvragen', 'portal.forensisch.doorverwijzingen'],
      'portal.spoed-ambu': ['portal.spoed-ambu.tools', 'portal.spoed-ambu.rapporten', 'portal.spoed-ambu.aanvragen', 'portal.spoed-ambu.doorverwijzingen'],
      'portal.spoed-ambulance': ['portal.spoed-ambu.tools', 'portal.spoed-ambu.rapporten', 'portal.spoed-ambu.aanvragen', 'portal.spoed-ambu.doorverwijzingen'],
      'portal.ortho-revalidatie': ['portal.ortho-revalidatie.tools', 'portal.ortho-revalidatie.rapporten', 'portal.ortho-revalidatie.aanvragen', 'portal.ortho-revalidatie.doorverwijzingen']
    };

    return aliases[cleaned] || [cleaned];
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
      return value.split('|').map((part) => part.trim()).filter(Boolean);
    }
    return [];
  }

  function getSiteRoot() {
    if (global.EMS_STORE_CONFIG?.siteRoot) return global.EMS_STORE_CONFIG.siteRoot;
    return new URL('./', document.baseURI).href;
  }

  function resolveModuleUrl(url) {
    const raw = String(url || '').trim();
    if (!raw) return '#';

    const alias = URL_ALIASES[raw] || raw;

    if (/^(?:https?:)?\/\//i.test(alias) || alias.startsWith('data:') || alias.startsWith('#')) {
      return alias;
    }

    const cleaned = alias.replace(/^\.\//, '').replace(/^\/+/, '');
    try {
      return new URL(cleaned, getSiteRoot()).toString();
    } catch (error) {
      console.warn('Kon module URL niet omzetten:', alias, error);
      return alias;
    }
  }

  function normalizeModuleRow(item) {
    const rawContexts = asArray(item?.contexts);
    const normalizedContexts = rawContexts.flatMap(normalizeContext);

    return {
      ...item,
      url: resolveModuleUrl(item?.url),
      keywords: Array.isArray(item?.keywords) ? item.keywords.join(' ') : String(item?.keywords || ''),
      contexts: normalizedContexts,
      enabled: item?.enabled !== false && String(item?.enabled).toLowerCase() !== 'false',
      order: Number(item?.order) || 9999
    };
  }

  async function fetchDefaultModules() {
    const path = global.EMS_STORE_CONFIG?.configTypes?.modules?.defaultPath
      || new URL('data/admin/default-modules.json', getSiteRoot()).toString();
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Default modules niet gevonden (${response.status}).`);
    }
    return response.json();
  }

  async function loadModuleData() {
    if (!global.EMSAdminStore) {
      throw new Error('EMSAdminStore ontbreekt.');
    }

    const [remoteRaw, fallbackRaw] = await Promise.all([
      global.EMSAdminStore.get('modules').catch(() => null),
      fetchDefaultModules().catch((error) => {
        console.warn('Fallback modules konden niet geladen worden.', error);
        return null;
      })
    ]);

    const remoteItems = Array.isArray(remoteRaw)
      ? remoteRaw
      : Array.isArray(remoteRaw?.items)
        ? remoteRaw.items
        : [];

    const fallbackItems = Array.isArray(fallbackRaw)
      ? fallbackRaw
      : Array.isArray(fallbackRaw?.items)
        ? fallbackRaw.items
        : [];

    const merged = new Map();
    [...fallbackItems, ...remoteItems].forEach((item, index) => {
      const key = String(item?.id || item?.name || `module-${index}`);
      merged.set(key, normalizeModuleRow(item));
    });

    return { items: Array.from(merged.values()) };
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
    const targetContext = normalize(context);
    const contexts = asArray(item.contexts).flatMap(normalizeContext);
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
        const visibleChildren = Array.from(section.querySelectorAll(cardSelector)).filter((card) => !card.hidden).length;
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
    regions.forEach((container) => renderRegion(container.dataset.moduleContext, container));
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
