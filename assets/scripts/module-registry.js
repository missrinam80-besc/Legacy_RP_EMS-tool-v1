(function (global) {
  const URL_ALIASES = {
    'tools/feedback/index.html': 'tools/aanvragen-feedback/index.html',
    'tools/training-aanvraag/index.html': 'tools/aanvragen-training/index.html',
    'tools/specialisatie-aanvraag/index.html': 'tools/aanvragen-specialisatie/index.html',
    'pages/portaal-spoed-ambu.html': 'tools/portaal-spoed-ambu/index.html',
    'pages/portaal-spoed-ambulance.html': 'tools/portaal-spoed-ambu/index.html',
    'pages/portaal-chirurgie.html': 'tools/portaal-chirurgie/index.html',
    'pages/portaal-psychologie.html': 'tools/portaal-psychologie/index.html',
    'pages/portaal-ortho.html': 'tools/portaal-ortho-revalidatie/index.html',
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
      .replace(/^home\.tools$/, 'home.quick')
      .replace(/^home\.quick-actions$/, 'home.quick')
      .replace(/^command\.quick-actions$/, 'command.quick')
      .replace(/^command\.portalen$/, 'command.afdelingen')
      .replace(/algemene_info/g, 'algemene-info')
      .replace(/algemeneinfo/g, 'algemene-info')
      .replace(/quick_actions/g, 'quick')
      .replace(/quick-actions/g, 'quick')
      .replace(/^home\.tools$/, 'home.quick')
      .replace(/^home\.medewerker\.tools$/, 'home.quick')
      .replace(/^command\.tools$/, 'command.tools')
      .replace(/^home\.medewerker\.algemene-info$/, 'home.algemene-info')
      .replace(/^home\.medewerker\.aanvragen$/, 'home.aanvragen')
      .replace(/^home\.command\.algemene-info$/, 'command.algemene-info')
      .replace(/^home\.command\.aanvragen$/, 'command.aanvragen')
      .replace(/^home\.command\.tools$/, 'command.tools')
      .replace(/^home\.command\.beheer$/, 'command.beheer')
      .replace(/^home\.command\.portalen$/, 'command.afdelingen')
      .replace(/^portal\.ortho$/, 'portal.ortho-revalidatie')
      .replace(/^portal\.spoed-ambulance/, 'portal.spoed-ambu');

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
      return value.split('|').map((part) => part.trim()).filter(Boolean);
    }
    return [];
  }

  function resolveModuleUrl(url) {
    const raw = String(url || '').trim();
    if (!raw) return '#';
    return URL_ALIASES[raw] || raw;
  }

  function toEnabled(value) {
    if (value === true || value === false) return value;
    const text = normalize(value);
    if (!text) return true;
    return !['false', '0', 'nee', 'no', 'off', 'disabled', 'uit'].includes(text);
  }

  function normalizeModuleRow(item) {
    const normalized = {
      ...item,
      id: String(item?.id || '').trim(),
      name: String(item?.name || '').trim(),
      type: normalize(item?.type || 'tool') || 'tool',
      department: normalize(item?.department || ''),
      url: resolveModuleUrl(item?.url),
      keywords: Array.isArray(item?.keywords) ? item.keywords.join(' ') : String(item?.keywords || ''),
      contexts: asArray(item?.contexts).map(normalizeContext),
      enabled: toEnabled(item?.enabled),
      order: Number(item?.order) || 9999,
      badge: item?.badge || '',
      description: item?.description || '',
      status: item?.status || '',
      icon: item?.icon || '🔗'
    };

    if (!normalized.contexts.length) {
      if (normalized.type === 'portaal') {
        normalized.contexts = ['home.afdelingen', 'command.afdelingen'];
      } else if (normalized.type === 'aanvraag' || normalized.type === 'form') {
        normalized.contexts = ['home.aanvragen', 'command.aanvragen'];
      } else {
        normalized.contexts = ['home.quick', 'command.tools'];
      }
    }

    return normalized;
  }

  function dedupeContexts(contexts) {
    return [...new Set((contexts || []).map(normalizeContext).filter(Boolean))];
  }

  function mergeModuleItems(defaultItems, apiItems) {
    const merged = new Map();

    const put = (item, source) => {
      const normalized = normalizeModuleRow(item);
      const key = normalized.id || `${normalized.name}|${normalized.url}`;
      const existing = merged.get(key);

      if (!existing) {
        merged.set(key, { ...normalized, __source: source });
        return;
      }

      const next = {
        ...existing,
        ...normalized,
        contexts: dedupeContexts([...(existing.contexts || []), ...(normalized.contexts || [])])
      };

      if (source === 'api') {
        next.order = Number(normalized.order) || existing.order;
        next.enabled = normalized.enabled;
      }

      merged.set(key, next);
    };

    (defaultItems || []).forEach((item) => put(item, 'default'));
    (apiItems || []).forEach((item) => put(item, 'api'));

    return Array.from(merged.values()).map((item) => {
      delete item.__source;
      return item;
    });
  }

  async function loadDefaultModules() {
    const defaultPath = global.EMS_STORE_CONFIG?.configTypes?.modules?.defaultPath;
    if (!defaultPath) return [];

    const response = await fetch(defaultPath, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Kon default modules niet laden (${response.status}).`);
    }

    const json = await response.json();
    if (Array.isArray(json)) return json;
    if (Array.isArray(json?.items)) return json.items;
    return [];
  }

  async function loadModuleData() {
    const defaults = await loadDefaultModules().catch(() => []);

    let apiItems = [];
    if (global.EMSAdminStore?.get) {
      try {
        const raw = await global.EMSAdminStore.get('modules');
        apiItems = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
      } catch (error) {
        console.warn('[ModuleRegistry] Centrale modules konden niet geladen worden, defaults worden gebruikt.', error);
      }
    }

    return {
      items: mergeModuleItems(defaults, apiItems)
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

  function mapLegacyPortalSection(item, targetContext) {
    const contexts = dedupeContexts(item.contexts || []);
    const target = normalizeContext(targetContext);
    if (!target.startsWith('portal.')) return false;

    const parts = target.split('.');
    const base = parts.slice(0, 2).join('.');
    const section = parts.slice(2).join('.');

    if (!contexts.includes(base)) return false;

    const type = normalize(item.type);
    if (section === 'tools') return ['tool', 'calculator', 'behandeling'].includes(type);
    if (section === 'rapporten') return ['rapport', 'report'].includes(type);
    if (section === 'aanvragen') return ['aanvraag', 'form', 'formulier'].includes(type);
    if (section === 'doorverwijzingen') return ['portaal', 'portal', 'doorverwijzing', 'link'].includes(type);
    return true;
  }

  function itemMatchesContext(item, context) {
    const targetContext = normalizeContext(context);
    if (item.enabled === false) return false;

    const contexts = dedupeContexts(asArray(item.contexts));
    if (contexts.includes(targetContext)) return true;

    if (targetContext === 'home.quick' && contexts.includes('home.quick')) return true;
    if (targetContext === 'command.quick' && (contexts.includes('command.quick') || contexts.includes('command.tools') || contexts.includes('command.beheer'))) return true;
    if (targetContext === 'home.afdelingen' && (normalize(item.type) === 'portaal' || contexts.includes('command.afdelingen'))) return true;
    if (targetContext === 'command.afdelingen' && (contexts.includes('command.afdelingen') || normalize(item.type) === 'portaal')) return true;

    return mapLegacyPortalSection(item, targetContext);
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
    const footer = variant === 'portal' ? '<div class="portal-card__footer"><span class="portal-card__link">Openen →</span></div>' : '';

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
          ${variant === 'portal' ? `<div><h3>${toSafeText(item.name)}</h3></div>` : `<h3>${toSafeText(item.name)}</h3>`}
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
