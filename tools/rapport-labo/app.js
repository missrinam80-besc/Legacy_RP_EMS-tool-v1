let config = {};
const CENTRAL_REPORT_OPTIONS = { documentType: 'rapport-labo', department: 'algemeen' };

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    config = await fetchJson("./config.json");
    qs("#toolTitle").textContent = config.toolTitle || "Labo Rapport";
    qs("#toolDescription").textContent = config.toolDescription || "";
    fillSelect("#testType", config.testTypes || [], "Kies een onderzoek");
    fillSelect("#priority", config.priorityLevels || [], "Kies prioriteit");
    bindEvents();
    await initCentralReportEnhancements();
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


async function initCentralReportEnhancements() {
  if (!window.EMSReportCentral?.init) return;

  try {
    await window.EMSReportCentral.init({
      storageKey: CONFIG.storageKey || config?.storageKey || 'rapport-labo',
      documentType: CENTRAL_REPORT_OPTIONS.documentType,
      department: CENTRAL_REPORT_OPTIONS.department,
      onChange: () => {
        try {
          buildReport();
        } catch (error) {
          console.warn('[EMSReportCentral] Rapport kon niet opnieuw worden opgebouwd.', error);
        }
      }
    });
  } catch (error) {
    console.warn('[EMSReportCentral] Centrale rapportlaag kon niet geladen worden.', error);
  }
}

function finalizeReportWithCentralData(reportText) {
  if (!window.EMSReportCentral?.appendSections) return reportText;
  return window.EMSReportCentral.appendSections(reportText, CENTRAL_REPORT_OPTIONS);
}

function bindEvents() {
  qs("#reportForm").addEventListener("submit", handleSubmit);
  qs("#resetBtn").addEventListener("click", resetForm);
  qs("#copyBtn").addEventListener("click", copyReport);
  qs("#downloadBtn").addEventListener("click", downloadReport);
}

function handleSubmit(event) {
  event.preventDefault();

  const data = {
    patientName: sanitizeText(qs("#patientName").value),
    staffName: sanitizeText(qs("#staffName").value),
    testType: sanitizeText(qs("#testType").value),
    priority: sanitizeText(qs("#priority").value),
    question: sanitizeText(qs("#question").value),
    result: sanitizeText(qs("#result").value)
  };

  qs("#reportOutput").value = [
    "LABO RAPPORT",
    "",
    `Patiënt: ${data.patientName || "-"}`,
    `Aanvrager / behandelaar: ${data.staffName || "-"}`,
    `Type onderzoek: ${data.testType || "-"}`,
    `Prioriteit: ${data.priority || "-"}`,
    "",
    "Onderzoeksvraag / doel:",
    data.question || "-",
    "",
    "Resultaat / interpretatie:",
    data.result || "-",
    "",
    `Opgesteld op: ${formatDateTime()}`
  ].join("\n");

  showStatus("#statusBox", "Rapport succesvol opgebouwd.", "success");
}

function resetForm() {
  qs("#reportForm").reset();
  qs("#reportOutput").value = "";
  clearStatus("#statusBox");
}

async function copyReport() {
  const text = qs("#reportOutput").value.trim();
  if (!text) return showStatus("#statusBox", "Geen rapport om te kopiëren.", "warning");
  await copyTextToClipboard(text);
  showStatus("#statusBox", "Rapport gekopieerd.", "success");
}

function downloadReport() {
  const text = qs("#reportOutput").value.trim();
  if (!text) return showStatus("#statusBox", "Geen rapport om te downloaden.", "warning");
  downloadTextFile("labo-rapport.txt", text);
  showStatus("#statusBox", "Download gestart.", "success");
}
