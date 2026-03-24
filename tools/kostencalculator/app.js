/**
 * Kostencalculator
 * ----------------
 * Deze tool laat een medewerker één of meerdere behandelingen selecteren
 * en bouwt daarna automatisch een korte kostensamenvatting op.
 *
 * Structuur:
 * - config.json bevat alle beschikbare onderdelen en prijzen
 * - app.js laadt deze config, toont de opties en berekent het totaal
 * - output kan gekopieerd of gedownload worden
 */

let config = {};

document.addEventListener("DOMContentLoaded", init);

/**
 * Startpunt van de tool.
 * Laadt de configuratie en maakt de interface klaar.
 */
async function init() {
  try {
    config = await fetchJson("./config.json");

    qs("#toolTitle").textContent = config.toolTitle || "Kostencalculator";
    qs("#toolDescription").textContent = config.toolDescription || "";

    renderItems();
    bindEvents();
  } catch (error) {
    showStatus("#statusBox", `Fout bij laden: ${error.message}`, "danger");
  }
}

/**
 * Tekent alle prijsitems uit config.json als checkboxlijst.
 */
function renderItems() {
  const container = qs("#itemsContainer");
  const items = config.items || [];

  if (!items.length) {
    container.innerHTML = "<p>Geen prijsitems gevonden.</p>";
    return;
  }

  const html = items.map(item => `
    <label class="cost-item-card">
      <span class="cost-item-card__left">
        <input
          type="checkbox"
          class="cost-checkbox"
          value="${item.id}"
          data-label="${escapeHtml(item.label)}"
          data-price="${item.price}"
        />
        <span>${item.label}</span>
      </span>
      <strong>€${Number(item.price).toFixed(0)}</strong>
    </label>
  `).join("");

  container.innerHTML = `<div class="cost-item-list">${html}</div>`;
}

/**
 * Koppelt alle knoppen en submit-events.
 */
function bindEvents() {
  qs("#costForm").addEventListener("submit", handleSubmit);
  qs("#resetBtn").addEventListener("click", resetForm);
  qs("#copyBtn").addEventListener("click", copyOutput);
  qs("#downloadBtn").addEventListener("click", downloadOutput);
}

/**
 * Verwerkt het formulier en bouwt de kostensamenvatting op.
 */
function handleSubmit(event) {
  event.preventDefault();

  clearStatus("#statusBox");

  const patientName = sanitizeText(qs("#patientName").value);
  const staffName = sanitizeText(qs("#staffName").value);

  const selectedItems = qsa(".cost-checkbox")
    .filter(input => input.checked)
    .map(input => ({
      id: input.value,
      label: input.dataset.label,
      price: Number(input.dataset.price)
    }));

  if (!selectedItems.length) {
    showStatus("#statusBox", "Selecteer minstens één behandeling.", "warning");
    qs("#output").value = "";
    return;
  }

  const total = selectedItems.reduce((sum, item) => sum + item.price, 0);

  const lines = [
    "KOSTENSAMENVATTING",
    "",
    `Patiënt: ${patientName || "-"}`,
    `Behandelaar: ${staffName || "-"}`,
    "",
    "Geselecteerde onderdelen:"
  ];

  selectedItems.forEach(item => {
    lines.push(`- ${item.label}: €${item.price.toFixed(0)}`);
  });

  lines.push("");
  lines.push(`TOTAAL: €${total.toFixed(0)}`);
  lines.push("");
  lines.push(`Opgesteld op: ${formatDateTime()}`);

  qs("#output").value = lines.join("\n");
  showStatus("#statusBox", "Totaal succesvol berekend.", "success");
}

/**
 * Zet alle velden en output terug leeg.
 */
function resetForm() {
  qs("#costForm").reset();
  qs("#output").value = "";
  clearStatus("#statusBox");
}

/**
 * Kopieert de tekstoutput naar het klembord.
 */
async function copyOutput() {
  const text = qs("#output").value.trim();

  if (!text) {
    showStatus("#statusBox", "Geen samenvatting om te kopiëren.", "warning");
    return;
  }

  try {
    await copyTextToClipboard(text);
    showStatus("#statusBox", "Samenvatting gekopieerd.", "success");
  } catch (error) {
    showStatus("#statusBox", "Kopiëren is mislukt.", "danger");
  }
}

/**
 * Downloadt de output als tekstbestand.
 */
function downloadOutput() {
  const text = qs("#output").value.trim();

  if (!text) {
    showStatus("#statusBox", "Geen samenvatting om te downloaden.", "warning");
    return;
  }

  downloadTextFile("kostensamenvatting.txt", text);
  showStatus("#statusBox", "Download gestart.", "success");
}

/**
 * Kleine helper om HTML speciale tekens veilig te tonen in data-attributen.
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
