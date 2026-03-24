let config = {};

document.addEventListener("DOMContentLoaded", init);

/**
 * =========================================================
 * Afwezigheidstool - app.js
 * ---------------------------------------------------------
 * Doel:
 * - Config laden
 * - Redenen vullen vanuit config
 * - Medewerkers laden vanuit de personeelsservice
 * - Bij selectie van een medewerker automatisch:
 *   naam, roepnummer en rang invullen
 * - Afwezigheidsmelding valideren en opbouwen
 * - Bericht tonen in outputveld
 * - Bericht kunnen kopiëren
 *
 * Opmerking:
 * - Afdeling werd bewust verwijderd uit deze versie
 * - Naam, roepnummer en rang zijn read-only velden
 * =========================================================
 */

async function init() {
  try {
    await loadConfig();
    bindEvents();
    await loadStaffOptions();
  } catch (error) {
    showStatus("#statusBox", `Fout bij laden: ${error.message}`, "danger");
  }
}

/**
 * Laadt de configuratie van de tool.
 */
async function loadConfig() {
  config = await fetchJson("./config.json");

  qs("#toolTitle").textContent = config.toolTitle || "Afwezigheidsmelding";
  qs("#toolDescription").textContent = config.toolDescription || "";

  fillReasonSelect("#reason", config.reasons || [], "Kies een reden");
}

/**
 * Vult de reden-select met waarden uit config.
 *
 * Ondersteunt:
 * - array van strings
 * - array van objecten { value, label }
 */
function fillReasonSelect(selector, items, placeholder) {
  const select = qs(selector);
  select.innerHTML = `<option value="">${placeholder}</option>`;

  items.forEach(item => {
    const option = document.createElement("option");

    if (typeof item === "string") {
      option.value = item;
      option.textContent = item;
    } else {
      option.value = item.value || item.label || "";
      option.textContent = item.label || item.value || "";
    }

    select.appendChild(option);
  });
}

/**
 * Koppelt alle events van het formulier.
 */
function bindEvents() {
  qs("#absenceForm").addEventListener("submit", handleSubmit);
  qs("#resetBtn").addEventListener("click", resetForm);
  qs("#copyBtn").addEventListener("click", copyOutput);
  qs("#staffSelect").addEventListener("change", handleStaffChange);
}

/**
 * Laadt actieve en zichtbare medewerkers in de dropdown.
 */
async function loadStaffOptions() {
  const staffSelect = qs("#staffSelect");

  try {
    const activeVisibleStaff = await window.EmsStaffService.getByStatus("actief", true);

    window.EmsStaffService.populateSelect(staffSelect, activeVisibleStaff, {
      includeEmpty: true,
      emptyLabel: "Selecteer een medewerker",
      labelFormat: "naam-roepnummer-rang",
      valueField: "roepnummer"
    });

    showStatus("#statusBox", "Medewerkers geladen.", "success");
  } catch (error) {
    staffSelect.innerHTML = `<option value="">Laden mislukt</option>`;
    showStatus("#statusBox", `Fout bij laden van medewerkers: ${error.message}`, "danger");
  }
}

/**
 * Wanneer een medewerker gekozen wordt, halen we de data op
 * en vullen we de read-only velden.
 */
async function handleStaffChange(event) {
  const roepnummer = sanitizeText(event.target.value);

  if (!roepnummer) {
    clearStaffFields();
    return;
  }

  try {
    const row = await window.EmsStaffService.getByCallSign(roepnummer, true);

    if (!row) {
      clearStaffFields();
      showStatus("#statusBox", "Medewerker niet gevonden.", "warning");
      return;
    }

    qs("#name").value = row.naam || "";
    qs("#callSign").value = row.roepnummer || "";
    qs("#role").value = row.rang || "";

    clearStatus("#statusBox");
  } catch (error) {
    clearStaffFields();
    showStatus("#statusBox", `Fout bij ophalen medewerker: ${error.message}`, "danger");
  }
}

/**
 * Leegt de read-only medewerkervelden.
 */
function clearStaffFields() {
  qs("#name").value = "";
  qs("#callSign").value = "";
  qs("#role").value = "";
}

/**
 * Verwerkt het formulier en bouwt de afwezigheidsmelding op.
 */
function handleSubmit(event) {
  event.preventDefault();

  const data = getFormData();
  const validationError = validateForm(data);

  if (validationError) {
    showStatus("#statusBox", validationError, "warning");
    return;
  }

  qs("#output").value = buildOutput(data);
  showStatus("#statusBox", "Melding opgebouwd.", "success");
}

/**
 * Leest en normaliseert alle formulierdata.
 */
function getFormData() {
  return {
    staffSelect: sanitizeText(qs("#staffSelect").value),
    name: sanitizeText(qs("#name").value),
    callSign: sanitizeText(qs("#callSign").value),
    role: sanitizeText(qs("#role").value),
    startDate: sanitizeText(qs("#startDate").value),
    endDate: sanitizeText(qs("#endDate").value),
    reason: sanitizeText(qs("#reason").value),
    details: sanitizeText(qs("#details").value)
  };
}

/**
 * Valideert de formulierdata.
 */
function validateForm(data) {
  if (!data.staffSelect) {
    return "Selecteer eerst een medewerker.";
  }

  if (!data.name || !data.callSign) {
    return "De medewerkergegevens konden niet correct geladen worden.";
  }

  if (!data.startDate) {
    return "Vul een begindatum in.";
  }

  if (!data.endDate) {
    return "Vul een einddatum in.";
  }

  if (data.endDate < data.startDate) {
    return "De einddatum mag niet vóór de begindatum liggen.";
  }

  if (!data.reason) {
    return "Kies een reden.";
  }

  if (isOtherReason(data.reason) && !data.details) {
    return "Geef extra toelichting wanneer je 'Andere' kiest.";
  }

  return "";
}

/**
 * Bepaalt of de gekozen reden neerkomt op "Andere".
 * Ondersteunt zowel "Andere" als "andere".
 */
function isOtherReason(reason) {
  return reason.trim().toLowerCase() === "andere";
}

/**
 * Bouwt de uiteindelijke outputtekst op.
 */
function buildOutput(data) {
  return [
    "AFWEZIGHEIDSMELDING",
    `Naam: ${data.name}`,
    `Roepnummer: ${data.callSign}`,
    `Rang: ${data.role || "-"}`,
    `Periode: ${formatPeriod(data.startDate, data.endDate)}`,
    `Reden: ${data.reason}`,
    `Toelichting: ${data.details || "-"}`
  ].join("\n");
}

/**
 * Formatteert de periode.
 */
function formatPeriod(startDate, endDate) {
  return `${startDate} t.e.m. ${endDate}`;
}

/**
 * Reset het volledige formulier.
 */
function resetForm() {
  qs("#absenceForm").reset();
  qs("#output").value = "";
  clearStaffFields();
  clearStatus("#statusBox");
}

/**
 * Kopieert de output naar het klembord.
 */
async function copyOutput() {
  const text = qs("#output").value.trim();

  if (!text) {
    showStatus("#statusBox", "Geen melding om te kopiëren.", "warning");
    return;
  }

  try {
    await copyTextToClipboard(text);
    showStatus("#statusBox", "Melding gekopieerd.", "success");
  } catch (error) {
    showStatus("#statusBox", `Kopiëren mislukt: ${error.message}`, "danger");
  }
}
