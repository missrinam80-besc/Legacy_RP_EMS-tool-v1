let config = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    config = await fetchJson("./config.json");

    qs("#toolTitle").textContent = config.toolTitle || "Afwezigheidsmelding";
    qs("#toolDescription").textContent = config.toolDescription || "";

    fillSelect("#reason", config.reasons || [], "Kies een reden");
    bindEvents();
    await loadStaffOptions();
  } catch (error) {
    showStatus("#statusBox", `Fout bij laden: ${error.message}`, "danger");
  }
}

function fillSelect(selector, items, placeholder) {
  const select = qs(selector);
  select.innerHTML = `<option value="">${placeholder}</option>`;

  items.forEach(item => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    select.appendChild(option);
  });
}

function bindEvents() {
  qs("#absenceForm").addEventListener("submit", handleSubmit);
  qs("#resetBtn").addEventListener("click", resetForm);
  qs("#copyBtn").addEventListener("click", copyOutput);
  qs("#staffSelect").addEventListener("change", handleStaffChange);
}

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
    qs("#department").value = row.afdeling || "";
  } catch (error) {
    clearStaffFields();
    showStatus("#statusBox", `Fout bij ophalen medewerker: ${error.message}`, "danger");
  }
}

function clearStaffFields() {
  qs("#name").value = "";
  qs("#callSign").value = "";
  qs("#role").value = "";
  qs("#department").value = "";
}

function handleSubmit(event) {
  event.preventDefault();

  const data = {
    staffSelect: sanitizeText(qs("#staffSelect").value),
    name: sanitizeText(qs("#name").value),
    callSign: sanitizeText(qs("#callSign").value),
    role: sanitizeText(qs("#role").value),
    department: sanitizeText(qs("#department").value),
    startDate: sanitizeText(qs("#startDate").value),
    endDate: sanitizeText(qs("#endDate").value),
    reason: sanitizeText(qs("#reason").value),
    details: sanitizeText(qs("#details").value)
  };

  const validationError = validateForm(data);
  if (validationError) {
    showStatus("#statusBox", validationError, "warning");
    return;
  }

  qs("#output").value = [
    "AFWEZIGHEIDSMELDING",
    `Naam: ${data.name}`,
    `Roepnummer: ${data.callSign}`,
    `Rang: ${data.role || "-"}`,
    `Afdeling: ${data.department || "-"}`,
    `Periode: ${formatPeriod(data.startDate, data.endDate)}`,
    `Reden: ${data.reason}`,
    `Toelichting: ${data.details || "-"}`
  ].join("\n");

  showStatus("#statusBox", "Melding opgebouwd.", "success");
}

function validateForm(data) {
  if (!data.staffSelect) {
    return "Selecteer eerst een medewerker.";
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

  if (data.reason === "Andere" && !data.details) {
    return "Geef extra toelichting wanneer je 'Andere' kiest.";
  }

  return "";
}

function formatPeriod(startDate, endDate) {
  return `${startDate} t.e.m. ${endDate}`;
}

function resetForm() {
  qs("#absenceForm").reset();
  qs("#output").value = "";
  clearStaffFields();
  clearStatus("#statusBox");
}

async function copyOutput() {
  const text = qs("#output").value.trim();

  if (!text) {
    showStatus("#statusBox", "Geen melding om te kopiëren.", "warning");
    return;
  }

  await copyTextToClipboard(text);
  showStatus("#statusBox", "Melding gekopieerd.", "success");
}
