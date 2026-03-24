let config = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    config = await fetchJson("./config.json");
    qs("#toolTitle").textContent = config.toolTitle || "Afwezigheidsmelding";
    qs("#toolDescription").textContent = config.toolDescription || "";
    fillSelect("#reason", config.reasons || [], "Kies een reden");
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
  qs("#absenceForm").addEventListener("submit", handleSubmit);
  qs("#resetBtn").addEventListener("click", resetForm);
  qs("#copyBtn").addEventListener("click", copyOutput);
}

function handleSubmit(event) {
  event.preventDefault();

  const data = {
    name: sanitizeText(qs("#name").value),
    callSign: sanitizeText(qs("#callSign").value),
    startDate: sanitizeText(qs("#startDate").value),
    endDate: sanitizeText(qs("#endDate").value),
    reason: sanitizeText(qs("#reason").value),
    details: sanitizeText(qs("#details").value)
  };

  qs("#output").value = [
    "AFWEZIGHEIDSMELDING",
    `Naam: ${data.name || "-"}`,
    `Roepnummer: ${data.callSign || "-"}`,
    `Periode: ${data.startDate || "-"} t.e.m. ${data.endDate || "-"}`,
    `Reden: ${data.reason || "-"}`,
    `Toelichting: ${data.details || "-"}`
  ].join("\n");

  showStatus("#statusBox", "Melding opgebouwd.", "success");
}

function resetForm() {
  qs("#absenceForm").reset();
  qs("#output").value = "";
  clearStatus("#statusBox");
}

async function copyOutput() {
  const text = qs("#output").value.trim();
  if (!text) return showStatus("#statusBox", "Geen melding om te kopiëren.", "warning");
  await copyTextToClipboard(text);
  showStatus("#statusBox", "Melding gekopieerd.", "success");
}
