let config = {};

document.addEventListener("DOMContentLoaded", init);

/**
 * =========================================================
 * Afwezigheidstool - app.js
 * ---------------------------------------------------------
 * Compatibele versie voor:
 * - oude Engelstalige ids
 * - nieuwe Nederlandstalige ids
 *
 * Deze versie:
 * - gebruikt geen afdeling meer
 * - vult read-only velden in
 * - crasht niet als een selector ontbreekt
 * =========================================================
 */

async function init() {
  try {
    await loadConfig();
    bindEvents();
    await loadStaffOptions();
  } catch (error) {
    showStatusSafe(`Fout bij laden: ${error.message}`, "danger");
    console.error(error);
  }
}

/* =========================
   Helpers
========================= */

function getEl(...selectors) {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return null;
}

function getValue(...selectors) {
  const el = getEl(...selectors);
  return el ? sanitizeText(el.value) : "";
}

function setValue(value, ...selectors) {
  const el = getEl(...selectors);
  if (el) el.value = value ?? "";
}

function setText(value, ...selectors) {
  const el = getEl(...selectors);
  if (el) el.textContent = value ?? "";
}

function clearValue(...selectors) {
  const el = getEl(...selectors);
  if (el) el.value = "";
}

function showStatusSafe(message, type = "info") {
  const statusBox = getEl("#statusBox");
  if (!statusBox) {
    console.warn("StatusBox niet gevonden:", message);
    return;
  }
  showStatus("#statusBox", message, type);
}

function clearStatusSafe() {
  const statusBox = getEl("#statusBox");
  if (!statusBox) return;
  clearStatus("#statusBox");
}

function getReasonSelect() {
  return getEl("#reason", "#reden");
}

function getStaffSelect() {
  return getEl("#staffSelect", "#medewerker");
}

function getForm() {
  return getEl("#absenceForm", "#afwezigheidsForm");
}

function getOutputField() {
  return getEl("#output", "#bericht");
}

function isOtherReason(reason) {
  return reason.trim().toLowerCase() === "andere";
}

/* =========================
   Config
========================= */

async function loadConfig() {
  config = await fetchJson("./config.json");

  setText(config.toolTitle || "Afwezigheidsmelding", "#toolTitle");
  setText(config.toolDescription || "", "#toolDescription");

  fillReasonSelect(config.reasons || [], "Kies een reden");
}

function fillReasonSelect(items, placeholder) {
  const select = getReasonSelect();

  if (!select) {
    console.warn("Reden-select niet gevonden (#reason of #reden).");
    return;
  }

  select.innerHTML = `<option value="">${placeholder}</option>`;

  items.forEach((item) => {
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

/* =========================
   Events
========================= */

function bindEvents() {
  const form = getForm();
  const resetBtn = getEl("#resetBtn");
  const copyBtn = getEl("#copyBtn");
  const staffSelect = getStaffSelect();

  if (form) form.addEventListener("submit", handleSubmit);
  if (resetBtn) resetBtn.addEventListener("click", resetForm);
  if (copyBtn) copyBtn.addEventListener("click", copyOutput);
  if (staffSelect) staffSelect.addEventListener("change", handleStaffChange);
}

/* =========================
   Staff loading
========================= */

async function loadStaffOptions() {
  const staffSelect = getStaffSelect();

  if (!staffSelect) {
    console.warn("Medewerker-select niet gevonden (#staffSelect of #medewerker).");
    return;
  }

  if (!window.EmsStaffService) {
    showStatusSafe("Personeelsservice niet beschikbaar.", "danger");
    return;
  }

  try {
    const activeVisibleStaff = await window.EmsStaffService.getByStatus("actief", true);

    window.EmsStaffService.populateSelect(staffSelect, activeVisibleStaff, {
      includeEmpty: true,
      emptyLabel: "Selecteer een medewerker",
      labelFormat: "naam-roepnummer-rang",
      valueField: "roepnummer"
    });

    showStatusSafe("Medewerkers geladen.", "success");
  } catch (error) {
    staffSelect.innerHTML = `<option value="">Laden mislukt</option>`;
    showStatusSafe(`Fout bij laden van medewerkers: ${error.message}`, "danger");
  }
}

async function handleStaffChange(event) {
  const roepnummer = sanitizeText(event.target.value);

  if (!roepnummer) {
    clearStaffFields();
    return;
  }

  if (!window.EmsStaffService) {
    showStatusSafe("Personeelsservice niet beschikbaar.", "danger");
    return;
  }

  try {
    const row = await window.EmsStaffService.getByCallSign(roepnummer, true);

    if (!row) {
      clearStaffFields();
      showStatusSafe("Medewerker niet gevonden.", "warning");
      return;
    }

    setValue(row.naam || "", "#name", "#naam");
    setValue(row.roepnummer || "", "#callSign", "#roepnummer");
    setValue(row.rang || "", "#role", "#rang");

    clearStatusSafe();
  } catch (error) {
    clearStaffFields();
    showStatusSafe(`Fout bij ophalen medewerker: ${error.message}`, "danger");
  }
}

function clearStaffFields() {
  clearValue("#name", "#naam");
  clearValue("#callSign", "#roepnummer");
  clearValue("#role", "#rang");
}

/* =========================
   Form handling
========================= */

function getFormData() {
  return {
    staffSelect: getValue("#staffSelect", "#medewerker"),
    name: getValue("#name", "#naam"),
    callSign: getValue("#callSign", "#roepnummer"),
    role: getValue("#role", "#rang"),
    startDate: getValue("#startDate", "#begindatum"),
    endDate: getValue("#endDate", "#einddatum"),
    reason: getValue("#reason", "#reden"),
    details: getValue("#details", "#toelichting")
  };
}

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

function formatPeriod(startDate, endDate) {
  return `${startDate} t.e.m. ${endDate}`;
}

function handleSubmit(event) {
  event.preventDefault();

  const data = getFormData();
  const validationError = validateForm(data);

  if (validationError) {
    showStatusSafe(validationError, "warning");
    return;
  }

  const outputField = getOutputField();
  if (outputField) {
    outputField.value = buildOutput(data);
  }

  showStatusSafe("Melding opgebouwd.", "success");
}

function resetForm() {
  const form = getForm();
  const outputField = getOutputField();

  if (form) form.reset();
  if (outputField) outputField.value = "";

  clearStaffFields();
  clearStatusSafe();
}

/* =========================
   Copy
========================= */

async function copyOutput() {
  const outputField = getOutputField();
  const text = outputField ? outputField.value.trim() : "";

  if (!text) {
    showStatusSafe("Geen melding om te kopiëren.", "warning");
    return;
  }

  try {
    await copyTextToClipboard(text);
    showStatusSafe("Melding gekopieerd.", "success");
  } catch (error) {
    showStatusSafe(`Kopiëren mislukt: ${error.message}`, "danger");
  }
}
