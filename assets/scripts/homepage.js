/**
 * homepage.js
 * -----------
 * Zoek- en filterlogica voor de medewerkershomepage.
 *
 * Werking:
 * - Leest de zoekterm uit #toolSearch
 * - Filtert alle .tool-card elementen met data-name en data-category
 * - Verbergt lege secties automatisch
 * - Toont feedback in #hubStatus
 */

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("toolSearch");
  const statusBox = document.getElementById("hubStatus");

  if (!searchInput) return;

  const searchableCards = Array.from(
    document.querySelectorAll(".tool-card[data-name]")
  );

  const sections = Array.from(document.querySelectorAll(".tool-section"));

  /**
   * Normaliseert tekst voor eenvoudige zoekvergelijking.
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
   * Geeft alle zoekbare tekst terug voor een kaart.
   * @param {HTMLElement} card
   * @returns {string}
   */
  function getSearchText(card) {
    const name = card.dataset.name || "";
    const category = card.dataset.category || "";
    const status = card.dataset.status || "";
    const visibleText = card.textContent || "";

    return normalize(`${name} ${category} ${status} ${visibleText}`);
  }

  /**
   * Toont of verbergt secties op basis van zichtbare kaarten.
   */
  function updateSectionVisibility() {
    sections.forEach((section) => {
      const cards = Array.from(section.querySelectorAll(".tool-card[data-name]"));
      const visibleCards = cards.filter((card) => !card.hidden);

      section.hidden = visibleCards.length === 0;
    });
  }

  /**
   * Update de statusmelding bovenaan.
   * @param {number} visibleCount
   * @param {string} query
   */
  function updateStatus(visibleCount, query) {
    const totalCount = searchableCards.length;
    const trimmedQuery = query.trim();

    if (!statusBox) return;

    if (!trimmedQuery) {
      statusBox.textContent = `Klaar om te starten. ${totalCount} links en tools beschikbaar.`;
      return;
    }

    if (visibleCount === 0) {
      statusBox.textContent = `Geen resultaten voor "${trimmedQuery}". Probeer een andere zoekterm.`;
      return;
    }

    if (visibleCount === 1) {
      statusBox.textContent = `1 resultaat gevonden voor "${trimmedQuery}".`;
      return;
    }

    statusBox.textContent = `${visibleCount} resultaten gevonden voor "${trimmedQuery}".`;
  }

  /**
   * Past de filtering toe op alle kaarten.
   */
  function applyFilter() {
    const query = normalize(searchInput.value);
    let visibleCount = 0;

    searchableCards.forEach((card) => {
      const searchText = getSearchText(card);
      const isMatch = !query || searchText.includes(query);

      card.hidden = !isMatch;

      if (isMatch) {
        visibleCount += 1;
      }
    });

    updateSectionVisibility();
    updateStatus(visibleCount, searchInput.value);
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