/**
 * command.js
 * ----------
 * Zoek- en filterlogica voor de commandhomepage.
 *
 * Extra:
 * - zelfde filtering als homepage.js
 * - telt ook beheerkaarten mee
 * - ondersteunt optioneel snelle focus op de beheersectie
 */

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("toolSearch");
  const statusBox = document.getElementById("hubStatus");

  if (!searchInput) return;

  const searchableCards = Array.from(
    document.querySelectorAll(".tool-card[data-name]")
  );

  const sections = Array.from(document.querySelectorAll(".tool-section"));
  const beheerSection = document.querySelector('[data-section="beheer"]');

  /**
   * Normaliseert tekst zodat zoeken consistenter werkt.
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
   * Verzamelt alle relevante tekst van een kaart.
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
   * Geeft terug hoeveel zichtbare kaarten in een sectie zitten.
   * @param {HTMLElement} section
   * @returns {number}
   */
  function countVisibleCardsInSection(section) {
    const cards = Array.from(section.querySelectorAll(".tool-card[data-name]"));
    return cards.filter((card) => !card.hidden).length;
  }

  /**
   * Toont of verbergt elke sectie afhankelijk van de filterresultaten.
   */
  function updateSectionVisibility() {
    sections.forEach((section) => {
      const visibleCount = countVisibleCardsInSection(section);
      section.hidden = visibleCount === 0;
    });
  }

  /**
   * Bepaalt hoeveel beheerresultaten zichtbaar zijn.
   * @returns {number}
   */
  function countVisibleBeheerCards() {
    if (!beheerSection) return 0;
    return countVisibleCardsInSection(beheerSection);
  }

  /**
   * Update de statusmelding.
   * @param {number} visibleCount
   * @param {string} query
   */
  function updateStatus(visibleCount, query) {
    const totalCount = searchableCards.length;
    const trimmedQuery = query.trim();
    const beheerVisible = countVisibleBeheerCards();

    if (!statusBox) return;

    if (!trimmedQuery) {
      statusBox.textContent = `Klaar om te starten. ${totalCount} links, tools en beheeritems beschikbaar.`;
      return;
    }

    if (visibleCount === 0) {
      statusBox.textContent = `Geen resultaten voor "${trimmedQuery}". Probeer een andere zoekterm.`;
      return;
    }

    if (beheerVisible > 0) {
      statusBox.textContent = `${visibleCount} resultaten gevonden voor "${trimmedQuery}", waarvan ${beheerVisible} in beheer.`;
      return;
    }

    statusBox.textContent = `${visibleCount} resultaten gevonden voor "${trimmedQuery}".`;
  }

  /**
   * Past de filter toe op alle kaarten.
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

  /**
   * Optionele helper:
   * focus op beheeritems als de query "beheer" bevat.
   */
  function maybeScrollToBeheer() {
    if (!beheerSection) return;

    const query = normalize(searchInput.value);
    if (query.includes("beheer")) {
      beheerSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }

  searchInput.addEventListener("input", () => {
    applyFilter();
    maybeScrollToBeheer();
  });

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      searchInput.value = "";
      applyFilter();
      searchInput.blur();
    }
  });

  applyFilter();
});