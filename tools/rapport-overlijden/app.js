let config = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    config = await fetchJson("./config.json");
    qs("#toolTitle").textContent = config.toolTitle || "Overlijdensrapport";
    qs("#toolDescription").textContent = config.toolDescription || "";
    fillSelect("#cause", config.causes || [], "Kies een oorzaak");
    fillSelect("#status", config.statuses || [], "Kies een context");
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
    cause: sanitizeText(qs("#cause").value),
    status: sanitizeText(qs("#status").value),
    findings: sanitizeText(qs("#findings").value),
    followUp: sanitizeText(qs("#followUp").value)
  };

  qs("#reportOutput").value = [
    "OVERLIJDENSRAPPORT",
    "",
    `Overledene: ${data.patientName || "-"}`,
    `Arts / behandelaar: ${data.staffName || "-"}`,
    `Vermoedelijke oorzaak: ${data.cause || "-"}`,
    `Context: ${data.status || "-"}`,
    "",
    "Vaststellingen:",
    data.findings || "-",
    "",
    "Verdere afhandeling:",
    data.followUp || "-",
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
  downloadTextFile("overlijdensrapport.txt", text);
  showStatus("#statusBox", "Download gestart.", "success");
}
