let config = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    config = await fetchJson("./config.json");
    qs("#toolTitle").textContent = config.toolTitle || "Evaluatieformulier";
    qs("#toolDescription").textContent = config.toolDescription || "";
    fillSelect("#category", config.categories || [], "Kies een categorie");
    fillSelect("#score", config.scores || [], "Kies een score");
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
  qs("#evaluationForm").addEventListener("submit", handleSubmit);
  qs("#resetBtn").addEventListener("click", resetForm);
  qs("#copyBtn").addEventListener("click", copyOutput);
  qs("#downloadBtn").addEventListener("click", downloadOutput);
}

function handleSubmit(event) {
  event.preventDefault();

  const data = {
    employeeName: sanitizeText(qs("#employeeName").value),
    evaluatorName: sanitizeText(qs("#evaluatorName").value),
    category: sanitizeText(qs("#category").value),
    score: sanitizeText(qs("#score").value),
    strengths: sanitizeText(qs("#strengths").value),
    improvements: sanitizeText(qs("#improvements").value)
  };

  qs("#output").value = [
    "EVALUATIEVERSLAG",
    "",
    `Medewerker: ${data.employeeName || "-"}`,
    `Evaluator: ${data.evaluatorName || "-"}`,
    `Categorie: ${data.category || "-"}`,
    `Beoordeling: ${data.score || "-"}`,
    "",
    "Sterktes:",
    data.strengths || "-",
    "",
    "Werkpunten / verbeterpunten:",
    data.improvements || "-",
    "",
    `Opgesteld op: ${formatDateTime()}`
  ].join("\n");

  showStatus("#statusBox", "Verslag succesvol opgebouwd.", "success");
}

function resetForm() {
  qs("#evaluationForm").reset();
  qs("#output").value = "";
  clearStatus("#statusBox");
}

async function copyOutput() {
  const text = qs("#output").value.trim();
  if (!text) return showStatus("#statusBox", "Geen verslag om te kopiëren.", "warning");
  await copyTextToClipboard(text);
  showStatus("#statusBox", "Verslag gekopieerd.", "success");
}

function downloadOutput() {
  const text = qs("#output").value.trim();
  if (!text) return showStatus("#statusBox", "Geen verslag om te downloaden.", "warning");
  downloadTextFile("evaluatieverslag.txt", text);
  showStatus("#statusBox", "Download gestart.", "success");
}
