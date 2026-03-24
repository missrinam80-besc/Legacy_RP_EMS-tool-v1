let config = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    config = await fetchJson("./config.json");
    qs("#toolTitle").textContent = config.toolTitle || "Behandelingsadviseur";
    qs("#toolDescription").textContent = config.toolDescription || "";
    fillSelect("#bodyPart", config.bodyParts || [], "Kies een lichaamsdeel");
    fillSelect("#injuryType", config.injuryTypes || [], "Kies een letsel");
    fillSelect("#painLevel", config.painLevels || [], "Kies een pijnlevel");
    fillSelect("#bloodLoss", config.bloodLossLevels || [], "Kies bloedverlies");
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
  qs("#treatmentForm").addEventListener("submit", handleSubmit);
  qs("#resetBtn").addEventListener("click", resetForm);
  qs("#copyBtn").addEventListener("click", copyOutput);
}

function handleSubmit(event) {
  event.preventDefault();

  const data = {
    bodyPart: sanitizeText(qs("#bodyPart").value),
    injuryType: sanitizeText(qs("#injuryType").value),
    painLevel: sanitizeText(qs("#painLevel").value),
    bloodLoss: sanitizeText(qs("#bloodLoss").value),
    heartRate: sanitizeText(qs("#heartRate").value),
    bloodPressure: sanitizeText(qs("#bloodPressure").value)
  };

  const advice = buildAdvice(data);
  qs("#output").value = advice;
  showStatus("#statusBox", "Behandeladvies gegenereerd.", "success");
}

function buildAdvice(data) {
  const lines = [
    "BEHANDELADVIES",
    "",
    `Lichaamsdeel: ${data.bodyPart || "-"}`,
    `Type letsel: ${data.injuryType || "-"}`,
    `Pijnlevel: ${data.painLevel || "-"}`,
    `Bloedverlies: ${data.bloodLoss || "-"}`,
    `Hartslag / pols: ${data.heartRate || "-"}`,
    `Bloeddruk: ${data.bloodPressure || "-"}`,
    "",
    "Voorgesteld advies:"
  ];

  lines.push("- Stabiliseer patiënt en voer basiscontrole uit.");
  lines.push("- Evalueer letsel lokaal en monitor vitale functies.");

  if (data.bloodLoss === "Hoog" || data.bloodLoss === "Extreem") {
    lines.push("- Prioriteit: bloeding stelpen en snelle verdere behandeling voorzien.");
  }

  if (data.injuryType === "Breuk") {
    lines.push("- Overweeg immobilisatie en verdere ziekenhuisbehandeling.");
  }

  if (data.injuryType === "Brandwonde") {
    lines.push("- Koelen, beoordelen van ernst en wondzorg voorzien.");
  }

  if (data.painLevel === "Hoog" || data.painLevel === "Extreem") {
    lines.push("- Overweeg aangepaste pijnstilling volgens protocol.");
  }

  lines.push("");
  lines.push(`Gegenereerd op: ${formatDateTime()}`);

  return lines.join("\n");
}

function resetForm() {
  qs("#treatmentForm").reset();
  qs("#output").value = "";
  clearStatus("#statusBox");
}

async function copyOutput() {
  const text = qs("#output").value.trim();
  if (!text) return showStatus("#statusBox", "Geen advies om te kopiëren.", "warning");
  await copyTextToClipboard(text);
  showStatus("#statusBox", "Advies gekopieerd.", "success");
}
