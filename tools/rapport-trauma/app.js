/**
 * Trauma rapport tool
 * -------------------
 * Basisversie voor de rapportmodules.
 * Deze structuur kan hergebruikt worden voor opname, operatie, labo en overlijden.
 */

let config = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    config = await fetchJson("./config.json");
    applyConfig();
    populateSelects();
    bindEvents();
  } catch (error) {
    showStatus("#statusBox", `Fout bij laden van tool: ${error.message}`, "danger");
  }
}

function applyConfig() {
  qs("#toolTitle").textContent = config.toolTitle || "Rapporttool";
  qs("#toolDescription").textContent = config.toolDescription || "";
}

function populateSelects() {
  fillSelect("#injuryType", config.injuryTypes || []);
  fillSelect("#severity", config.severityLevels || []);
}

function fillSelect(selector, items) {
  const select = qs(selector);
  items.forEach(item => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    select.appendChild(option);
  });
}

function bindEvents() {
  qs("#reportForm").addEventListener("submit", handleSubmit);
  qs("#resetBtn").addEventListener("click", resetForm);
  qs("#copyBtn").addEventListener("click", copyReport);
  qs("#downloadBtn").addEventListener("click", downloadReport);
}

function handleSubmit(event) {
  event.preventDefault();
  clearStatus("#statusBox");

  const data = getFormData();
  const report = buildReport(data);
  qs("#reportOutput").value = report;

  showStatus("#statusBox", "Rapport succesvol opgebouwd.", "success");
}

function getFormData() {
  return {
    patientName: sanitizeText(qs("#patientName").value),
    staffName: sanitizeText(qs("#staffName").value),
    injuryType: sanitizeText(qs("#injuryType").value),
    severity: sanitizeText(qs("#severity").value),
    treatment: sanitizeText(qs("#treatment").value),
    notes: sanitizeText(qs("#notes").value)
  };
}

function buildReport(data) {
  return [
    `TRAUMA RAPPORT`,
    ``,
    `Patiënt/slachtoffer: ${data.patientName || "-"}`,
    `Behandelaar: ${data.staffName || "-"}`,
    `Type letsel: ${data.injuryType || "-"}`,
    `Ernst: ${data.severity || "-"}`,
    ``,
    `Uitgevoerde behandeling:`,
    `${data.treatment || "-"}`,
    ``,
    `Observaties / bijzonderheden:`,
    `${data.notes || "-"}`,
    ``,
    `Opgesteld op: ${formatDateTime()}`
  ].join("\n");
}

function resetForm() {
  qs("#reportForm").reset();
  qs("#reportOutput").value = "";
  clearStatus("#statusBox");
}

async function copyReport() {
  const output = qs("#reportOutput").value.trim();
  if (!output) {
    showStatus("#statusBox", "Er is nog geen rapport om te kopiëren.", "warning");
    return;
  }

  try {
    await copyTextToClipboard(output);
    showStatus("#statusBox", "Rapport gekopieerd naar klembord.", "success");
  } catch (error) {
    showStatus("#statusBox", "Kopiëren is mislukt.", "danger");
  }
}

function downloadReport() {
  const output = qs("#reportOutput").value.trim();
  if (!output) {
    showStatus("#statusBox", "Er is nog geen rapport om te downloaden.", "warning");
    return;
  }

  downloadTextFile("trauma-rapport.txt", output);
  showStatus("#statusBox", "Download gestart.", "success");
}
