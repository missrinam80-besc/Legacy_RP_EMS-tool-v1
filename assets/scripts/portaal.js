/**
 * portaal.js
 * ----------
 * Eenvoudige zoek- en filterlogica voor:
 * - afdelingsportalen
 * - infopagina's
 *
 * Ondersteunt:
 * - .portal-card
 * - .info-accordion
 * - .portal-section
 *
 * Werking:
 * - zoekt in zichtbare tekst
 * - verbergt niet-relevante kaarten en accordeons
 * - verbergt secties zonder zichtbare inhoud
 * - update statusmelding
 */

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("portalSearch");
  const statusBox = document.getElementById("portalSearchStatus");

  if (!searchInput) return;

  const portalSections = Array.from(document.querySelectorAll(".portal-section"));
  const portalCards = Array.from(document.querySelectorAll(".portal-card"));
  const infoAccordions = Array.from(document.querySelectorAll(".info-accordion"));

  /**
   * Normaliseert tekst voor consistente zoekvergelijking.
   * @param {string} value
   * @returns {string}
   */
  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  /**
   * Geeft de volledige zoektekst van een element terug.
   * @param {HTMLElement} element
   * @returns {string}
   */
  function getSearchText(element) {
    const datasetText = [
      element.dataset.name || "",
      element.dataset.category || "",
      element.dataset.tags || ""
    ].join(" ");

    return normalize(`${datasetText} ${element.textContent || ""}`);
  }

  /**
   * Toont of verbergt portal cards.
   * @param {string} query
   * @returns {number}
   */
  function filterPortalCards(query) {
    let visibleCount = 0;

    portalCards.forEach((card) => {
      const isMatch = !query || getSearchText(card).includes(query);
      card.hidden = !isMatch;

      if (isMatch) visibleCount += 1;
    });

    return visibleCount;
  }

  /**
   * Toont of verbergt info accordeons.
   * Bij match wordt een accordion automatisch opengezet.
   * @param {string} query
   * @returns {number}
   */
  function filterInfoAccordions(query) {
    let visibleCount = 0;

    infoAccordions.forEach((accordion) => {
      const isMatch = !query || getSearchText(accordion).includes(query);
      accordion.hidden = !isMatch;

      if (isMatch) {
        visibleCount += 1;
        if (query) {
          accordion.open = true;
        }
      }
    });

    return visibleCount;
  }

  /**
   * Bepaalt of een sectie nog zichtbare inhoud bevat.
   * @param {HTMLElement} section
   * @returns {boolean}
   */
  function sectionHasVisibleContent(section) {
    const visibleCards = Array.from(section.querySelectorAll(".portal-card")).some(
      (card) => !card.hidden
    );

    const visibleAccordions = Array.from(section.querySelectorAll(".info-accordion")).some(
      (accordion) => !accordion.hidden
    );

    const hasStaticContent =
      !section.querySelector(".portal-card") &&
      !section.querySelector(".info-accordion");

    return visibleCards || visibleAccordions || hasStaticContent;
  }

  /**
   * Verbergt secties zonder resultaten.
   */
  function updateSectionVisibility() {
    portalSections.forEach((section) => {
      section.hidden = !sectionHasVisibleContent(section);
    });
  }

  /**
   * Update statusmelding bovenaan.
   * @param {number} visibleCards
   * @param {number} visibleAccordions
   * @param {string} rawQuery
   */
  function updateStatus(visibleCards, visibleAccordions, rawQuery) {
    if (!statusBox) return;

    const query = rawQuery.trim();
    const totalVisible = visibleCards + visibleAccordions;

    if (!query) {
      statusBox.textContent = "Klaar om te zoeken in tools, rapporten en informatieblokken.";
      return;
    }

    if (totalVisible === 0) {
      statusBox.textContent = `Geen resultaten voor "${query}". Probeer een andere zoekterm.`;
      return;
    }

    statusBox.textContent = `${totalVisible} resultaten gevonden voor "${query}".`;
  }

  /**
   * Past de volledige filtering toe.
   */
  function applyFilter() {
    const rawQuery = searchInput.value || "";
    const query = normalize(rawQuery);

    const visibleCards = filterPortalCards(query);
    const visibleAccordions = filterInfoAccordions(query);

    updateSectionVisibility();
    updateStatus(visibleCards, visibleAccordions, rawQuery);
  }

  searchInput.addEventListener("input", applyFilter);

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      searchInput.value = "";
      applyFilter();
      searchInput.blur();
    }
  });

  applyFilter();
});