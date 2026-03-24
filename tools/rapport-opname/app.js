let config = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    config = await fetchJson("./config.json");
    qs("#toolTitle").textContent = config.toolTitle || "Opname Rapport";
    qs("#toolDescription").textContent = config.toolDescription || "";
    fillSelect("#reason", config.reasons || [], "Kies een reden");
    fillSelect("#urgency", config.urgencyLevels || [], "Kies urgentie");
    bindEvents();
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
    reason: sanitizeText(qs("#reason").value),
    urgency: sanitizeText(qs("#urgency").value),
    findings: sanitizeText(qs("#findings").value),
    plan: sanitizeText(qs("#plan").value)
  };

  qs("#reportOutput").value = [
    "OPNAME RAPPORT",
    "",
    `Patiënt: ${data.patientName || "-"}`,
    `Behandelaar: ${data.staffName || "-"}`,
    `Reden van opname: ${data.reason || "-"}`,
    `Urgentie: ${data.urgency || "-"}`,
    "",
    "Bevindingen:",
    data.findings || "-",
    "",
    "Plan / opvolging:",
    data.plan || "-",
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
  downloadTextFile("opname-rapport.txt", text);
  showStatus("#statusBox", "Download gestart.", "success");
}
