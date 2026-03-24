let config = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    config = await fetchJson("./config.json");
    qs("#toolTitle").textContent = config.toolTitle || "Operatie Rapport";
    qs("#toolDescription").textContent = config.toolDescription || "";
    fillSelect("#procedureType", config.procedureTypes || [], "Kies een ingreep");
    fillSelect("#outcome", config.outcomes || [], "Kies een resultaat");
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
    surgeon: sanitizeText(qs("#surgeon").value),
    procedureType: sanitizeText(qs("#procedureType").value),
    outcome: sanitizeText(qs("#outcome").value),
    details: sanitizeText(qs("#details").value),
    aftercare: sanitizeText(qs("#aftercare").value)
  };

  qs("#reportOutput").value = [
    "OPERATIE RAPPORT",
    "",
    `Patiënt: ${data.patientName || "-"}`,
    `Chirurg / behandelaar: ${data.surgeon || "-"}`,
    `Type ingreep: ${data.procedureType || "-"}`,
    `Verloop / resultaat: ${data.outcome || "-"}`,
    "",
    "Beschrijving van de ingreep:",
    data.details || "-",
    "",
    "Nazorg / opvolging:",
    data.aftercare || "-",
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
  downloadTextFile("operatie-rapport.txt", text);
  showStatus("#statusBox", "Download gestart.", "success");
}
