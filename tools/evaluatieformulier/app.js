/**
 * EMS Evaluatieformulier V3
 * -------------------------
 * Client-side evaluatietool zonder database.
 *
 * Functionaliteiten:
 * - Dynamische categorieblokken op basis van config.json
 * - Automatische scoreberekening
 * - Kleurcodes per score
 * - Automatische feedbackzinnen
 * - Tekstoutput voor intern verslag
 * - Kopiëren, downloaden en printen
 */

let config = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    config = await fetchJson("./config.json");

    qs("#toolTitle").textContent = config.toolTitle || "Evaluatieformulier";
    qs("#toolDescription").textContent = config.toolDescription || "";

    fillSelect("#evaluationType", config.evaluationTypes || [], "Kies type evaluatie");
    fillSelect("#finalScore", config.scores || [], "Kies algemene beoordeling");
    fillSelect("#decision", config.decisions || [], "Kies eindbesluit");

    createEvaluationBlocks(config.categories || []);
    setDefaultDate();
    bindEvents();
  } catch (error) {
    showStatus("#statusBox", `Fout bij laden: ${error.message}`, "danger");
  }
}

// =========================
// INITIAL UI
// =========================

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

function createEvaluationBlocks(categories) {
  const container = qs("#evaluationBlocks");
  container.innerHTML = "";

  categories.forEach(category => {
    const block = document.createElement("div");
    block.className = "evaluation-block";
    block.dataset.category = category;

    block.innerHTML = `
      <h4>${escapeHtml(category)}</h4>
      <div class="evaluation-block__grid">
        <div class="form-field">
          <label>Score</label>
          <select class="form-select js-category-score">
            <option value="">Kies score</option>
            ${(config.scores || []).map(score => `<option value="${escapeAttr(score)}">${escapeHtml(score)}</option>`).join("")}
          </select>
          <div class="mt-1">
            <span class="score-badge is-empty js-score-badge">Nog niet beoordeeld</span>
          </div>
        </div>

        <div class="form-field">
          <label>Opmerking</label>
          <textarea class="form-textarea js-category-comment" placeholder="Korte motivering, observatie of voorbeeld..."></textarea>
        </div>
      </div>
    `;

    container.appendChild(block);
  });
}

function setDefaultDate() {
  const dateInput = qs("#date");
  if (!dateInput.value) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }
}

function bindEvents() {
  qs("#evaluationForm").addEventListener("submit", handleSubmit);
  qs("#resetBtn").addEventListener("click", resetForm);
  qs("#copyBtn").addEventListener("click", copyOutput);
  qs("#downloadBtn").addEventListener("click", downloadOutput);
  qs("#printBtn").addEventListener("click", printOutput);

  qsa(".js-category-score").forEach(select => {
    select.addEventListener("change", handleLiveScoreChange);
  });
}

// =========================
// EVENTS
// =========================

function handleLiveScoreChange(event) {
  updateScoreBadge(event.target);
  updateScoreSummaryPreview();
}

function handleSubmit(event) {
  event.preventDefault();

  const formData = getFormData();
  const categoryResults = getCategoryResults();
  const scoreSummary = calculateScoreSummary(categoryResults);
  const autoFeedback = buildAutoFeedback(categoryResults, scoreSummary);
  const output = buildReportText(formData, categoryResults, scoreSummary, autoFeedback);

  qs("#output").value = output;

  renderAverageScore(scoreSummary);
  renderAutoFeedback(autoFeedback);

  showStatus("#statusBox", "Evaluatieverslag succesvol opgebouwd.", "success");
}

// =========================
// DATA EXTRACTION
// =========================

function getFormData() {
  return {
    employeeName: sanitizeText(qs("#employeeName").value),
    callSign: sanitizeText(qs("#callSign").value),
    rank: sanitizeText(qs("#rank").value),
    evaluatorName: sanitizeText(qs("#evaluatorName").value),
    evaluationType: sanitizeText(qs("#evaluationType").value),
    date: sanitizeText(qs("#date").value),
    context: sanitizeText(qs("#context").value),
    finalScore: sanitizeText(qs("#finalScore").value),
    decision: sanitizeText(qs("#decision").value),
    strengths: sanitizeText(qs("#strengths").value),
    improvements: sanitizeText(qs("#improvements").value),
    agreements: sanitizeText(qs("#agreements").value)
  };
}

function getCategoryResults() {
  return qsa(".evaluation-block").map(block => {
    const category = block.dataset.category || "";
    const score = sanitizeText(block.querySelector(".js-category-score").value);
    const comment = sanitizeText(block.querySelector(".js-category-comment").value);

    return {
      category,
      score,
      comment,
      numericScore: scoreToNumber(score)
    };
  });
}

// =========================
// SCORE LOGIC
// =========================

function scoreToNumber(score) {
  const scoreMap = config.scoreMap || {};
  return Number(scoreMap[score] || 0);
}

function numberToScoreLabel(value) {
  if (!value || Number.isNaN(value)) return "Niet beoordeeld";
  if (value < 1.5) return "Onvoldoende";
  if (value < 2.5) return "Voldoende";
  if (value < 3.5) return "Goed";
  return "Zeer goed";
}

function calculateScoreSummary(categoryResults) {
  const scoredItems = categoryResults.filter(item => item.numericScore > 0);
  const total = scoredItems.reduce((sum, item) => sum + item.numericScore, 0);
  const average = scoredItems.length ? total / scoredItems.length : 0;

  const strongestItems = [...scoredItems]
    .filter(item => item.numericScore >= 3)
    .sort((a, b) => b.numericScore - a.numericScore)
    .slice(0, 3);

  const weakestItems = [...scoredItems]
    .filter(item => item.numericScore > 0 && item.numericScore <= 2)
    .sort((a, b) => a.numericScore - b.numericScore)
    .slice(0, 3);

  return {
    total,
    count: scoredItems.length,
    average,
    averageRounded: scoredItems.length ? average.toFixed(1) : "-",
    averageLabel: numberToScoreLabel(average),
    strongestItems,
    weakestItems
  };
}

function updateScoreBadge(selectElement) {
  const block = selectElement.closest(".evaluation-block");
  if (!block) return;

  const badge = block.querySelector(".js-score-badge");
  const score = sanitizeText(selectElement.value);
  const numeric = scoreToNumber(score);

  badge.className = "score-badge js-score-badge";

  if (!score) {
    badge.textContent = "Nog niet beoordeeld";
    badge.classList.add("is-empty");
    return;
  }

  badge.textContent = score;

  if (numeric >= 1 && numeric <= 4) {
    badge.classList.add(`score-${numeric}`);
  }
}

function updateScoreSummaryPreview() {
  const results = getCategoryResults();
  const summary = calculateScoreSummary(results);
  renderAverageScore(summary);
}

function renderAverageScore(scoreSummary) {
  qs("#averageScoreDisplay").textContent = scoreSummary.averageRounded;
  qs("#averageScoreLabel").textContent =
    scoreSummary.count > 0
      ? `${scoreSummary.averageLabel} op basis van ${scoreSummary.count} onderdeel${scoreSummary.count === 1 ? "" : "en"}`
      : "Nog geen beoordeling";
}

// =========================
// AUTO FEEDBACK
// =========================

function buildAutoFeedback(categoryResults, scoreSummary) {
  const feedback = [];

  if (scoreSummary.count === 0) {
    return ["Er werden nog geen scores ingevuld."];
  }

  if (scoreSummary.average >= 3.5) {
    feedback.push("De medewerker levert over het geheel genomen zeer sterke prestaties en toont een hoog niveau van zelfstandigheid.");
  } else if (scoreSummary.average >= 2.5) {
    feedback.push("De medewerker functioneert globaal goed en voldoet in ruime mate aan de verwachtingen binnen de dienst.");
  } else if (scoreSummary.average >= 1.5) {
    feedback.push("De medewerker behaalt een basisniveau, maar verdere begeleiding en opvolging blijven aangewezen.");
  } else {
    feedback.push("De evaluatie wijst op meerdere belangrijke aandachtspunten waarvoor gerichte ondersteuning nodig is.");
  }

  if (scoreSummary.strongestItems.length) {
    const strongNames = scoreSummary.strongestItems.map(item => item.category.toLowerCase()).join(", ");
    feedback.push(`Sterke punten komen vooral naar voren binnen: ${strongNames}.`);
  }

  if (scoreSummary.weakestItems.length) {
    const weakNames = scoreSummary.weakestItems.map(item => item.category.toLowerCase()).join(", ");
    feedback.push(`Extra aandacht en opvolging zijn aangewezen voor: ${weakNames}.`);
  }

  const commentedLowItems = categoryResults.filter(item => item.numericScore <= 2 && item.comment);
  if (commentedLowItems.length) {
    feedback.push("Bij enkele onderdelen werd een lagere score gemotiveerd met concrete observaties, wat gerichte opvolging mogelijk maakt.");
  }

  return feedback;
}

function renderAutoFeedback(feedbackItems) {
  const list = qs("#autoFeedbackList");
  list.innerHTML = "";

  feedbackItems.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  });
}

// =========================
// REPORT BUILDING
// =========================

function buildReportText(formData, categoryResults, scoreSummary, autoFeedback) {
  const detailLines = categoryResults.map(item => {
    return [
      `${item.category}`,
      `Score: ${item.score || "-"}`,
      `Opmerking: ${item.comment || "-"}`
    ].join("\n");
  }).join("\n\n");

  const strongPointsLine = scoreSummary.strongestItems.length
    ? scoreSummary.strongestItems.map(item => item.category).join(", ")
    : "-";

  const weakPointsLine = scoreSummary.weakestItems.length
    ? scoreSummary.weakestItems.map(item => item.category).join(", ")
    : "-";

  return [
    "EVALUATIEVERSLAG",
    "",
    "ALGEMENE GEGEVENS",
    `Medewerker: ${formatEmployeeLine(formData)}`,
    `Evaluator: ${formData.evaluatorName || "-"}`,
    `Type evaluatie: ${formData.evaluationType || "-"}`,
    `Datum evaluatie: ${formatDateForReport(formData.date)}`,
    "",
    "CONTEXT / AANLEIDING",
    formData.context || "-",
    "",
    "DETAILBEOORDELING PER ONDERDEEL",
    detailLines || "-",
    "",
    "SCOREOVERZICHT",
    `Gemiddelde score: ${scoreSummary.averageRounded}`,
    `Algemeen scorebeeld: ${scoreSummary.averageLabel}`,
    `Sterkste onderdelen: ${strongPointsLine}`,
    `Belangrijkste aandachtspunten: ${weakPointsLine}`,
    "",
    "AUTOMATISCHE SAMENVATTING",
    ...autoFeedback.map(line => `- ${line}`),
    "",
    "ALGEMENE BEOORDELING",
    formData.finalScore || "-",
    "",
    "EINDBESLUIT",
    formData.decision || "-",
    "",
    "STERKTES",
    formData.strengths || "-",
    "",
    "WERKPUNTEN / AANDACHTSPUNTEN",
    formData.improvements || "-",
    "",
    "AFSPRAKEN / OPVOLGING",
    formData.agreements || "-",
    "",
    `Opgesteld op: ${formatDateTime()}`
  ].join("\n");
}

// =========================
// ACTIONS
// =========================

function resetForm() {
  qs("#evaluationForm").reset();
  qs("#output").value = "";
  setDefaultDate();
  createEvaluationBlocks(config.categories || []);
  bindEventsAfterReset();
  renderAverageScore({
    averageRounded: "-",
    averageLabel: "Nog geen beoordeling",
    count: 0
  });
  renderAutoFeedback(["Feedback verschijnt na het opbouwen van het verslag."]);
  clearStatus("#statusBox");
}

function bindEventsAfterReset() {
  qsa(".js-category-score").forEach(select => {
    select.addEventListener("change", handleLiveScoreChange);
  });
}

async function copyOutput() {
  const text = qs("#output").value.trim();

  if (!text) {
    return showStatus("#statusBox", "Geen verslag om te kopiëren.", "warning");
  }

  await copyTextToClipboard(text);
  showStatus("#statusBox", "Verslag gekopieerd.", "success");
}

function downloadOutput() {
  const text = qs("#output").value.trim();

  if (!text) {
    return showStatus("#statusBox", "Geen verslag om te downloaden.", "warning");
  }

  downloadTextFile("evaluatieverslag.txt", text);
  showStatus("#statusBox", "Download gestart.", "success");
}

function printOutput() {
  const text = qs("#output").value.trim();

  if (!text) {
    return showStatus("#statusBox", "Geen verslag om af te drukken.", "warning");
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    return showStatus("#statusBox", "Printvenster kon niet geopend worden.", "danger");
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>Evaluatieverslag</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 24px;
            white-space: pre-wrap;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>${escapeHtml(text)}</body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

// =========================
// FORMATTERS
// =========================

function formatEmployeeLine(formData) {
  const parts = [];

  if (formData.employeeName) parts.push(formData.employeeName);
  if (formData.callSign) parts.push(`(${formData.callSign})`);
  if (formData.rank) parts.push(`- ${formData.rank}`);

  return parts.length ? parts.join(" ") : "-";
}

function formatDateForReport(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("nl-BE").format(date);
}

// =========================
// BASIC ESCAPING
// =========================

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function qsa(selector) {
  return Array.from(document.querySelectorAll(selector));
}