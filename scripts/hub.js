/**
 * hub.js
 * ------
 * Script voor de centrale EMS Tools Hub.
 *
 * Doel:
 * - tools op de startpagina doorzoekbaar maken
 * - dynamisch tonen hoeveel tools zichtbaar zijn
 * - secties automatisch verbergen als er geen matches zijn
 *
 * Werking:
 * - leest alle tool-cards in
 * - filtert op basis van tekst in het zoekveld
 * - zoekt in naam + categorie-info van elke kaart
 */

document.addEventListener("DOMContentLoaded", initHub);

/**
 * Start de hublogica zodra de pagina geladen is.
 */
function initHub() {
  const searchInput = qs("#toolSearch");

  if (!searchInput) return;

  updateHubStatus();
  toggleEmptySections();

  // Elke wijziging in het zoekveld herfiltert de kaarten onmiddellijk.
  searchInput.addEventListener("input", handleHubSearch);
}

/**
 * Wordt uitgevoerd telkens de gebruiker typt in het zoekveld.
 * Filtert de toolcards en werkt daarna de status en secties bij.
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

    card.classList.toggle("hidden", !isMatch);
  });

  updateHubStatus();
  toggleEmptySections();
}

/**
 * Telt hoeveel toolcards momenteel zichtbaar zijn
 * en toont dat in de statusbox.
 */
function updateHubStatus() {
  const allCards = qsa(".tool-card--hub");
  const visibleCards = allCards.filter(card => !card.classList.contains("hidden"));
  const statusBox = qs("#hubStatus");

  if (!statusBox) return;

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
 * Verbergt een volledige sectie als daarin geen zichtbare tools meer zitten.
 * Zo blijft de hub netjes wanneer er gefilterd wordt.
 */
function toggleEmptySections() {
  const sections = qsa(".tool-section");

  sections.forEach(section => {
    const cardsInSection = qsa(".tool-card--hub", section);
    const visibleCards = cardsInSection.filter(card => !card.classList.contains("hidden"));

    section.classList.toggle("hidden", visibleCards.length === 0);
  });
}
