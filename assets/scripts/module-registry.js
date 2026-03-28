(function (global) {
  const STORAGE_KEY = 'ems_admin_modules';
  const DEFAULT_PATH = global.__MODULES_DEFAULT_PATH__ || 'data/admin/default-modules.json';

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  async function loadModuleData() {
    if (global.AdminStore && typeof global.AdminStore.loadAdminData === 'function') {
      return global.AdminStore.loadAdminData(STORAGE_KEY, DEFAULT_PATH);
    }
    const response = await fetch(DEFAULT_PATH, { cache: 'no-store' });
    if (!response.ok) throw new Error('Kon moduleconfig niet laden.');
    return response.json();
  }

  function getStatusTone(status = '') {
    const value = normalize(status);
    if (value === 'actief' || value === 'live') return 'success';
    if (value === 'nieuw') return 'warning';
    if (value === 'in opbouw' || value === 'in-opbouw') return 'warning';
    return '';
  }

  function toSafeText(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function itemMatchesContext(item, context) {
    return Array.isArray(item.contexts) && item.contexts.includes(context) && item.enabled !== false;
  }

  function sortItems(items) {
    return [...items].sort((a, b) => (Number(a.order) || 9999) - (Number(b.order) || 9999));
  }

  function buildQuickAction(item) {
    return `<a class="quick-action-card module-card" href="${toSafeText(item.url)}" data-name="${toSafeText(item.name)}" data-category="${toSafeText(item.type)}" data-status="${toSafeText(item.status)}" data-keywords="${toSafeText(item.keywords)}"><span class="quick-action-card__icon" aria-hidden="true">${toSafeText(item.icon || '🔗')}</span><div><strong>${toSafeText(item.name)}</strong><p class="text-soft mt-1">${toSafeText(item.description)}</p></div></a>`;
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
    return `<a class="${baseClass} module-card" href="${toSafeText(item.url)}" data-name="${toSafeText(item.name)}" data-category="${toSafeText(item.type)} ${toSafeText(item.department)}" data-status="${toSafeText(item.status)}" data-keywords="${toSafeText(item.keywords)}"><div class="${topClass}"><span class="${badgeClass}">${toSafeText(item.badge || item.type)}</span><span class="${statusClass}${tone ? ` ${statusClass}--${tone}` : ''}">${toSafeText(item.status || '')}</span></div><div class="${titleClass}"><span class="${iconClass}" aria-hidden="true">${toSafeText(item.icon || '🔗')}</span>${variant === 'portal' ? `<div><h3>${toSafeText(item.name)}</h3></div>` : `<h3>${toSafeText(item.name)}</h3>`}</div><p>${toSafeText(item.description)}</p>${footer}</a>`;
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

    container.innerHTML = items.map((item) => type === 'quick' ? buildQuickAction(item) : buildToolCard(item, variant)).join('');
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
    filterCards,
    sortItems
  };
})(window);