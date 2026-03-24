/**
 * hub.js
 * ------
 * Script voor de centrale EMS Tools Hub.
 *
 * Doel:
 * - tools op de startpagina doorzoekbaar maken
 * - dynamisch tonen hoeveel tools zichtbaar zijn
 * - secties automatisch verbergen als er geen matches zijn
 * - de hub overzichtelijk en onderhoudbaar houden
 */

document.addEventListener("DOMContentLoaded", initHub);

/**
 * Start alle logica van de hub nadat de DOM volledig geladen is.
 */
function initHub() {
  const searchInput = qs("#toolSearch");

  if (!searchInput) return;

  // Zorg bij eerste laadmoment voor correcte status en zichtbare secties.
  updateHubStatus();
  toggleEmptySections();

  // Herfilter de kaarten live terwijl de gebruiker typt.
  searchInput.addEventListener("input", handleHubSearch);
}

/**
 * Verwerkt de zoekopdracht uit het zoekveld.
 * Elke toolcard wordt gecontroleerd op basis van:
 * - data-name
 * - data-category
 * - data-status
 * - zichtbare tekst in de kaart
 */
function handleHubSearch() {
  const searchValue = sanitizeText(qs("#toolSearch").value).toLowerCase();
  const toolCards = qsa(".tool-card--hub");

  toolCards.forEach(card => {
    const searchableText = [
      card.dataset.name || "",
      card.dataset.category || "",
      card.dataset.status || "",
      card.textContent || ""
    ]
      .join(" ")
      .toLowerCase();

    const isMatch = searchableText.includes(searchValue);

    // Toon of verberg de kaart afhankelijk van de match.
    card.classList.toggle("hidden", !isMatch);
  });

  // Werk na het filteren de statusbox en secties opnieuw bij.
  updateHubStatus();
  toggleEmptySections();
}

/**
 * Telt hoeveel tools zichtbaar zijn
 * en schrijft dat weg in de statusbox boven het overzicht.
 */
function updateHubStatus() {
  const allCards = qsa(".tool-card--hub");
  const visibleCards = allCards.filter(card => !card.classList.contains("hidden"));

  if (visibleCards.length === allCards.length) {
    showStatus("#hubStatus", `${allCards.length} tools beschikbaar.`, "info");
    return;
  }

  if (visibleCards.length === 0) {
    showStatus("#hubStatus", "Geen tools gevonden voor deze zoekopdracht.", "warning");
    return;
  }

  showStatus(
    "#hubStatus",
    `${visibleCards.length} van de ${allCards.length} tools zichtbaar.`,
    "info"
  );
}

/**
 * Verbergt hele secties wanneer daarin geen zichtbare kaarten meer staan.
 * Zo blijft de hub proper en compact tijdens het filteren.
 */
function toggleEmptySections() {
  const sections = qsa(".tool-section");

  sections.forEach(section => {
    const cardsInSection = qsa(".tool-card--hub", section);
    const visibleCards = cardsInSection.filter(card => !card.classList.contains("hidden"));

    section.classList.toggle("hidden", visibleCards.length === 0);
  });
}
