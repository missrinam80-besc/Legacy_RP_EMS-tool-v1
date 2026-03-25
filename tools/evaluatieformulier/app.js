/**
 * EMS Evaluatieformulier V2
 * Volledig modulair en zonder database
 */

let config = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  config = await fetchJson("./config.json");

  qs("#toolTitle").textContent = config.toolTitle;
  qs("#toolDescription").textContent = config.toolDescription;

  createEvaluationBlocks(config.categories);
  fillSelect("#finalScore", config.scores, "Kies score");
  fillSelect("#decision", config.decisions, "Kies besluit");

  bindEvents();
}

// =========================
// UI BUILD
// =========================

function createEvaluationBlocks(categories) {
  const container = qs("#evaluationBlocks");
  container.innerHTML = "";

  categories.forEach(cat => {
    const block = document.createElement("div");
    block.className = "evaluation-block";

    block.innerHTML = `
      <h4>${cat}</h4>
      <select class="form-select" data-cat="${cat}">
        <option value="">Score</option>
        ${config.scores.map(s => `<option>${s}</option>`).join("")}
      </select>
      <textarea class="form-textarea" data-comment="${cat}" placeholder="Opmerking"></textarea>
    `;

    container.appendChild(block);
  });
}

function fillSelect(selector, items, placeholder) {
  const select = qs(selector);
  select.innerHTML = `<option value="">${placeholder}</option>`;
  items.forEach(i => {
    const o = document.createElement("option");
    o.value = i;
    o.textContent = i;
    select.appendChild(o);
  });
}

// =========================
// EVENTS
// =========================

function bindEvents() {
  qs("#evaluationForm").addEventListener("submit", handleSubmit);
  qs("#resetBtn").addEventListener("click", resetForm);
  qs("#copyBtn").addEventListener("click", copyOutput);
  qs("#downloadBtn").addEventListener("click", downloadOutput);
}

// =========================
// LOGICA
// =========================

function handleSubmit(e) {
  e.preventDefault();

  const data = {
    name: qs("#employeeName").value,
    callSign: qs("#callSign").value,
    evaluator: qs("#evaluatorName").value,
    date: qs("#date").value,
    strengths: qs("#strengths").value,
    improvements: qs("#improvements").value
  };

  const blocks = document.querySelectorAll(".evaluation-block");

  let details = "";
  let totalScore = 0;
  let count = 0;

  blocks.forEach(b => {
    const cat = b.querySelector("h4").textContent;
    const score = b.querySelector("select").value;
    const comment = b.querySelector("textarea").value;

    if (score) {
      totalScore += scoreToNumber(score);
      count++;
    }

    details += `
${cat}
Score: ${score || "-"}
Opmerking: ${comment || "-"}
`;
  });

  const avg = count ? (totalScore / count).toFixed(1) : "-";

  qs("#output").value = `
EVALUATIEVERSLAG

Medewerker: ${data.name || "-"} (${data.callSign || "-"})
Evaluator: ${data.evaluator || "-"}
Datum: ${data.date || "-"}

DETAILBEOORDELING:
${details}

GEMIDDELDE SCORE: ${avg}

ALGEMENE BEOORDELING:
${qs("#finalScore").value || "-"}

EINDBESLUIT:
${qs("#decision").value || "-"}

STERKTES:
${data.strengths || "-"}

WERKPUNTEN:
${data.improvements || "-"}

Opgesteld op: ${formatDateTime()}
`;

  showStatus("#statusBox", "Evaluatie opgebouwd.", "success");
}

// =========================
// HELPERS
// =========================

function scoreToNumber(score) {
  switch (score) {
    case "Onvoldoende": return 1;
    case "Voldoende": return 2;
    case "Goed": return 3;
    case "Zeer goed": return 4;
    default: return 0;
  }
}

// =========================
// UTIL
// =========================

function resetForm() {
  qs("#evaluationForm").reset();
  qs("#output").value = "";
  clearStatus("#statusBox");
}

async function copyOutput() {
  const text = qs("#output").value;
  if (!text) return;
  await copyTextToClipboard(text);
  showStatus("#statusBox", "Gekopieerd.", "success");
}

function downloadOutput() {
  const text = qs("#output").value;
  if (!text) return;
  downloadTextFile("evaluatie.txt", text);
}