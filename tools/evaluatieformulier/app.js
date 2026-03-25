/**
 * EMS Evaluatieformulier V9
 * -------------------------
 * Extra functies:
 * - checkmarks per afgewerkte accordion-sectie
 * - statusbalk onder de knoppen
 * - 2-kolommenlayout met live outputcanvas
 * - accordion-status onthouden via localStorage
 * - automatisch openen bij validatiefouten
 * - progress bar bovenaan
 */

let config = {};
let staffRows = [];
let evaluatorRows = [];

const ACCORDION_STORAGE_KEY = "ems-evaluation-accordion-state";

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
    initAccordionState();
    updateProgress();
    updateSectionCompletionState();
    setStatusMessage("Klaar om te starten.", "neutral");

    await loadStaffData();
  } catch (error) {
    setStatusMessage(`Fout bij laden: ${error.message}`, "danger");
  }
}

// =========================
// INITIAL UI
// =========================

function fillSelect(selector, items, placeholder) {
  const select = qs(selector);
  select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>`;

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
          <select class="form-select js-category-score" required>
            <option value="">Kies score</option>
            ${(config.scores || [])
              .map(score => `<option value="${escapeAttr(score)}">${escapeHtml(score)}</option>`)
              .join("")}
          </select>
          <div class="mt-1">
            <span class="score-badge is-empty js-score-badge">Nog niet beoordeeld</span>
          </div>
        </div>

        <div class="form-field">
          <label>Opmerking</label>
          <textarea
            class="form-textarea js-category-comment"
            placeholder="Korte motivering, observatie of voorbeeld..."
            required
          ></textarea>
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

async function loadStaffData() {
  const apiUrl = String(config.staffApiUrl || "").trim();

  if (!apiUrl || apiUrl === "PLAK_HIER_JE_APPS_SCRIPT_WEBAPP_URL") {
    qs("#staffLoadInfo").textContent = "Personeelsbron is nog niet ingesteld in config.json.";
    disableStaffSelects();
    setStatusMessage("Personeelsbron is nog niet ingesteld in config.json.", "warning");
    return;
  }

  if (!window.EmsStaffService) {
    throw new Error("ems-staff-service.js is niet geladen.");
  }

  window.EmsStaffService.setApiUrl(apiUrl);

  staffRows = await window.EmsStaffService.getVisibleStaff(true);
  evaluatorRows = await window.EmsStaffService.getByRole(
    config.allowedEvaluatorRanks || [],
    { visibleOnly: true }
  );

  populateEmployeeSelect();
  populateEvaluatorSelect();
  enableStaffSelects();

  const loadedAt = window.EmsStaffService.getLastLoadedAt();
  const infoText = loadedAt
    ? `Personeelslijst geladen op ${formatDateTimeValue(loadedAt)}.`
    : "Personeelslijst geladen.";

  qs("#staffLoadInfo").textContent = infoText;
  setStatusMessage(infoText, "info");
}

function populateEmployeeSelect() {
  const select = qs("#employeeSelect");

  window.EmsStaffService.populateSelect(select, staffRows, {
    includeEmpty: true,
    emptyLabel: "Kies medewerker",
    labelFormat: "naam-roepnummer-rang",
    valueField: "roepnummer"
  });
}

function populateEvaluatorSelect() {
  const select = qs("#evaluatorSelect");

  window.EmsStaffService.populateSelect(select, evaluatorRows, {
    includeEmpty: true,
    emptyLabel: "Kies evaluator",
    labelFormat: "naam",
    valueField: "roepnummer"
  });
}

function disableStaffSelects() {
  qs("#employeeSelect").innerHTML = `<option value="">Geen personeelsbron ingesteld</option>`;
  qs("#evaluatorSelect").innerHTML = `<option value="">Geen personeelsbron ingesteld</option>`;
  qs("#employeeSelect").disabled = true;
  qs("#evaluatorSelect").disabled = true;
}

function enableStaffSelects() {
  qs("#employeeSelect").disabled = false;
  qs("#evaluatorSelect").disabled = false;
}

function bindEvents() {
  qs("#evaluationForm").addEventListener("submit", handleSubmit);
  qs("#resetBtn").addEventListener("click", resetForm);
  qs("#copyBtn").addEventListener("click", copyOutput);
  qs("#downloadBtn").addEventListener("click", downloadOutput);
  qs("#printBtn").addEventListener("click", printOutput);
  qs("#employeeSelect").addEventListener("change", handleEmployeeSelect);
  qs("#evaluatorSelect").addEventListener("change", handleEvaluatorSelect);
  qs("#toggleAccordionBtn").addEventListener("click", toggleAllAccordionSections);

  bindCategoryScoreEvents();
  bindProgressInputs();
  bindAccordionPersistence();
}

function bindCategoryScoreEvents() {
  qsa(".js-category-score").forEach(select => {
    select.addEventListener("change", handleLiveScoreChange);
  });
}

function bindProgressInputs() {
  qsa("#evaluationForm input, #evaluationForm select, #evaluationForm textarea").forEach(el => {
    el.addEventListener("input", handleFieldChange);
    el.addEventListener("change", handleFieldChange);
  });
}

function bindAccordionPersistence() {
  getAccordionSections().forEach(section => {
    section.addEventListener("toggle", () => {
      saveAccordionState();
      updateToggleAccordionButton();
      updateProgress();
    });
  });
}

function handleFieldChange() {
  updateProgress();
  updateSectionCompletionState();
  clearValidationState();
}

// =========================
// STATUS
// =========================

function setStatusMessage(message, tone = "neutral") {
  const box = qs("#statusBox");
  box.textContent = message;
  box.className = "status-banner mt-2";
  box.classList.add(`status-banner--${tone}`);
}

// =========================
// ACCORDION
// =========================

function getAccordionSections() {
  return qsa(".accordion-section");
}

function initAccordionState() {
  const sections = getAccordionSections();
  const saved = loadAccordionState();

  if (saved && Array.isArray(saved) && saved.length === sections.length) {
    sections.forEach((section, index) => {
      section.open = Boolean(saved[index]);
    });
  } else {
    sections.forEach((section, index) => {
      section.open = index === 0;
    });
  }

  updateToggleAccordionButton();
}

function saveAccordionState() {
  const state = getAccordionSections().map(section => section.open);
  localStorage.setItem(ACCORDION_STORAGE_KEY, JSON.stringify(state));
}

function loadAccordionState() {
  try {
    const raw = localStorage.getItem(ACCORDION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function openAccordionSection(index) {
  const sections = getAccordionSections();
  if (sections[index]) {
    sections[index].open = true;
    saveAccordionState();
    updateToggleAccordionButton();
    updateProgress();
  }
}

function resetAccordionState() {
  const sections = getAccordionSections();
  sections.forEach((section, index) => {
    section.open = index === 0;
  });
  saveAccordionState();
  updateToggleAccordionButton();
  updateProgress();
}

function toggleAllAccordionSections() {
  const sections = getAccordionSections();
  const allOpen = sections.length > 0 && sections.every(section => section.open);

  sections.forEach(section => {
    section.open = !allOpen;
  });

  saveAccordionState();
  updateToggleAccordionButton();
  updateProgress();
}

function updateToggleAccordionButton() {
  const btn = qs("#toggleAccordionBtn");
  const sections = getAccordionSections();
  const allOpen = sections.length > 0 && sections.every(section => section.open);
  btn.textContent = allOpen ? "Alles sluiten" : "Alles openen";
}

// =========================
// PROGRESS + COMPLETION
// =========================

function updateProgress() {
  const steps = [
    isStepComplete(0),
    isStepComplete(1),
    isStepComplete(2),
    isStepComplete(3),
    isStepComplete(4)
  ];

  const completed = steps.filter(Boolean).length;
  const currentStep = Math.min(completed + 1, 5);
  const percent = (completed / 5) * 100;

  qs("#progressFill").style.width = `${percent}%`;
  qs("#progressLabel").textContent = `Stap ${currentStep}/5`;
  qs("#progressText").textContent = getProgressText(completed);
}

function isStepComplete(stepIndex) {
  switch (stepIndex) {
    case 0:
      return Boolean(qs("#employeeSelect").value && qs("#evaluatorSelect").value);
    case 1:
      return Boolean(
        qs("#evaluationType").value &&
        qs("#date").value &&
        qs("#decision").value &&
        qs("#context").value.trim()
      );
    case 2:
      return Boolean(
        qs("#finalScore").value &&
        qsa(".js-category-score").every(el => el.value) &&
        qsa(".js-category-comment").every(el => el.value.trim())
      );
    case 3:
      return Boolean(qs("#strengths").value.trim() && qs("#improvements").value.trim());
    case 4:
      return Boolean(qs("#agreements").value.trim());
    default:
      return false;
  }
}

function getProgressText(completed) {
  if (completed <= 0) return "Start met medewerker en evaluator.";
  if (completed === 1) return "Vul nu de algemene evaluatiegegevens in.";
  if (completed === 2) return "Werk de beoordeling per onderdeel af.";
  if (completed === 3) return "Voeg sterktes en werkpunten toe.";
  if (completed === 4) return "Werk afspraken en ondertekening af.";
  return "Formulier volledig ingevuld.";
}

function updateSectionCompletionState() {
  const sectionMap = [
    { id: "#section-staff", complete: isStepComplete(0) },
    { id: "#section-general", complete: isStepComplete(1) },
    { id: "#section-scores", complete: isStepComplete(2) },
    { id: "#section-feedback", complete: isStepComplete(3) },
    { id: "#section-signoff", complete: isStepComplete(4) }
  ];

  sectionMap.forEach(item => {
    const section = qs(item.id);
    if (!section) return;
    section.classList.toggle("is-complete", item.complete);
  });
}

// =========================
// VALIDATION
// =========================

function validateForm() {
  clearValidationState();

  const errors = [];
  const requiredFields = qsa("#evaluationForm [required]");

  requiredFields.forEach(field => {
    const isEmpty = field.tagName === "SELECT"
      ? !field.value
      : !String(field.value || "").trim();

    if (isEmpty) {
      field.classList.add("field-error");
      const section = field.closest(".accordion-section");
      if (section) {
        section.classList.add("has-error");
      }
      errors.push({ field, section });
    }
  });

  if (errors.length) {
    const uniqueSections = [...new Set(errors.map(item => item.section).filter(Boolean))];
    uniqueSections.forEach(section => {
      section.open = true;
    });

    saveAccordionState();
    updateToggleAccordionButton();
    updateProgress();
    updateSectionCompletionState();

    const firstField = errors[0].field;
    if (firstField) {
      firstField.focus();
    }

    setStatusMessage("Vul eerst alle verplichte velden in.", "warning");
    return false;
  }

  return true;
}

function clearValidationState() {
  qsa(".field-error").forEach(el => el.classList.remove("field-error"));
  qsa(".accordion-section.has-error").forEach(el => el.classList.remove("has-error"));
}

// =========================
// EVENTS
// =========================

function handleEmployeeSelect(event) {
  const option = event.target.selectedOptions[0];
  if (!option || !option.value) {
    clearEmployeeFields();
    updateProgress();
    updateSectionCompletionState();
    return;
  }

  qs("#employeeName").value = option.dataset.naam || "";
  qs("#callSign").value = option.dataset.roepnummer || "";
  qs("#rank").value = option.dataset.rang || "";
  qs("#employeeSignatureName").value = option.dataset.naam || "";

  openAccordionSection(1);
  updateProgress();
  updateSectionCompletionState();
}

function handleEvaluatorSelect(event) {
  const option = event.target.selectedOptions[0];
  if (!option || !option.value) {
    clearEvaluatorFields();
    updateProgress();
    updateSectionCompletionState();
    return;
  }

  qs("#evaluatorName").value = option.dataset.naam || "";
  qs("#evaluatorRank").value = option.dataset.rang || "";
  qs("#evaluatorSignatureName").value = option.dataset.naam || "";

  openAccordionSection(1);
  updateProgress();
  updateSectionCompletionState();
}

function handleLiveScoreChange(event) {
  updateScoreBadge(event.target);
  updateScoreSummaryPreview();
  openAccordionSection(2);
  updateProgress();
  updateSectionCompletionState();
}

function handleSubmit(event) {
  event.preventDefault();

  if (!validateForm()) {
    return;
  }

  const formData = getFormData();
  const categoryResults = getCategoryResults();
  const scoreSummary = calculateScoreSummary(categoryResults);
  const autoFeedback = buildAutoFeedback(categoryResults, scoreSummary);
  const output = buildReportText(formData, categoryResults, scoreSummary, autoFeedback);

  qs("#output").value = output;

  renderAverageScore(scoreSummary);
  renderAutoFeedback(autoFeedback);
  buildPrintSheet(formData, categoryResults, scoreSummary, autoFeedback);

  openAccordionSection(2);
  openAccordionSection(3);
  openAccordionSection(4);

  updateProgress();
  updateSectionCompletionState();
  setStatusMessage("Evaluatieverslag succesvol opgebouwd.", "success");
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
    evaluatorRank: sanitizeText(qs("#evaluatorRank").value),
    evaluationType: sanitizeText(qs("#evaluationType").value),
    date: sanitizeText(qs("#date").value),
    context: sanitizeText(qs("#context").value),
    finalScore: sanitizeText(qs("#finalScore").value),
    decision: sanitizeText(qs("#decision").value),
    strengths: sanitizeText(qs("#strengths").value),
    improvements: sanitizeText(qs("#improvements").value),
    agreements: sanitizeText(qs("#agreements").value),
    evaluatorSignatureName: sanitizeText(qs("#evaluatorSignatureName").value),
    employeeSignatureName: sanitizeText(qs("#employeeSignatureName").value)
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
    feedback.push(
      `Sterke punten komen vooral naar voren binnen: ${scoreSummary.strongestItems.map(item => item.category.toLowerCase()).join(", ")}.`
    );
  }

  if (scoreSummary.weakestItems.length) {
    feedback.push(
      `Extra aandacht en opvolging zijn aangewezen voor: ${scoreSummary.weakestItems.map(item => item.category.toLowerCase()).join(", ")}.`
    );
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
  const detailLines = categoryResults
    .map(item => {
      return [
        `${item.category}`,
        `Score: ${item.score || "-"}`,
        `Opmerking: ${item.comment || "-"}`
      ].join("\n");
    })
    .join("\n\n");

  return [
    "EVALUATIEVERSLAG",
    "",
    "ALGEMENE GEGEVENS",
    `Medewerker: ${formatEmployeeLine(formData)}`,
    `Evaluator: ${formData.evaluatorName || "-"}`,
    `Rang evaluator: ${formData.evaluatorRank || "-"}`,
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
    `Sterkste onderdelen: ${scoreSummary.strongestItems.length ? scoreSummary.strongestItems.map(item => item.category).join(", ") : "-"}`,
    `Belangrijkste aandachtspunten: ${scoreSummary.weakestItems.length ? scoreSummary.weakestItems.map(item => item.category).join(", ") : "-"}`,
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
    "ONDERTEKENING",
    `Evaluator: ${formData.evaluatorSignatureName || "-"}`,
    `Medewerker: ${formData.employeeSignatureName || "-"}`,
    "",
    `Opgesteld op: ${formatDateTime()}`
  ].join("\n");
}

function buildPrintSheet(formData, categoryResults, scoreSummary, autoFeedback) {
  const detailRows = categoryResults
    .map(item => `
      <tr>
        <td style="padding:8px;border:1px solid #ccc;">${escapeHtml(item.category)}</td>
        <td style="padding:8px;border:1px solid #ccc;">${escapeHtml(item.score || "-")}</td>
        <td style="padding:8px;border:1px solid #ccc;">${escapeHtml(item.comment || "-")}</td>
      </tr>
    `)
    .join("");

  const feedbackRows = autoFeedback.map(item => `<li>${escapeHtml(item)}</li>`).join("");

  qs("#printSheet").innerHTML = `
    <div style="display:block;color:#000;background:#fff;font-family:Arial,sans-serif;">
      <h1 style="margin-top:0;">Evaluatieverslag</h1>

      <h2>Algemene gegevens</h2>
      <p><strong>Medewerker:</strong> ${escapeHtml(formatEmployeeLine(formData))}</p>
      <p><strong>Evaluator:</strong> ${escapeHtml(formData.evaluatorName || "-")}</p>
      <p><strong>Rang evaluator:</strong> ${escapeHtml(formData.evaluatorRank || "-")}</p>
      <p><strong>Type evaluatie:</strong> ${escapeHtml(formData.evaluationType || "-")}</p>
      <p><strong>Datum evaluatie:</strong> ${escapeHtml(formatDateForReport(formData.date))}</p>

      <h2>Context / aanleiding</h2>
      <p>${nl2br(formData.context || "-")}</p>

      <h2>Detailbeoordeling</h2>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px;border:1px solid #ccc;">Onderdeel</th>
            <th style="text-align:left;padding:8px;border:1px solid #ccc;">Score</th>
            <th style="text-align:left;padding:8px;border:1px solid #ccc;">Opmerking</th>
          </tr>
        </thead>
        <tbody>
          ${detailRows}
        </tbody>
      </table>

      <h2>Scoreoverzicht</h2>
      <p><strong>Gemiddelde score:</strong> ${escapeHtml(scoreSummary.averageRounded)}</p>
      <p><strong>Algemeen scorebeeld:</strong> ${escapeHtml(scoreSummary.averageLabel)}</p>
      <p><strong>Sterkste onderdelen:</strong> ${escapeHtml(scoreSummary.strongestItems.length ? scoreSummary.strongestItems.map(item => item.category).join(", ") : "-")}</p>
      <p><strong>Aandachtspunten:</strong> ${escapeHtml(scoreSummary.weakestItems.length ? scoreSummary.weakestItems.map(item => item.category).join(", ") : "-")}</p>

      <h2>Automatische samenvatting</h2>
      <ul>${feedbackRows}</ul>

      <h2>Algemene beoordeling</h2>
      <p>${escapeHtml(formData.finalScore || "-")}</p>

      <h2>Eindbesluit</h2>
      <p>${escapeHtml(formData.decision || "-")}</p>

      <h2>Sterktes</h2>
      <p>${nl2br(formData.strengths || "-")}</p>

      <h2>Werkpunten / aandachtspunten</h2>
      <p>${nl2br(formData.improvements || "-")}</p>

      <h2>Afspraken / opvolging</h2>
      <p>${nl2br(formData.agreements || "-")}</p>

      <h2>Ondertekening</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:24px;">
        <div>
          <div style="height:60px;border-bottom:1px solid #000;margin-bottom:8px;"></div>
          <strong>Evaluator</strong><br>
          ${escapeHtml(formData.evaluatorSignatureName || "-")}
        </div>
        <div>
          <div style="height:60px;border-bottom:1px solid #000;margin-bottom:8px;"></div>
          <strong>Medewerker</strong><br>
          ${escapeHtml(formData.employeeSignatureName || "-")}
        </div>
      </div>
    </div>
  `;
}

// =========================
// ACTIONS
// =========================

function resetForm() {
  qs("#evaluationForm").reset();
  qs("#output").value = "";
  qs("#printSheet").innerHTML = "";

  clearEmployeeFields();
  clearEvaluatorFields();
  clearValidationState();

  setDefaultDate();
  createEvaluationBlocks(config.categories || []);
  bindCategoryScoreEvents();
  bindProgressInputs();
  resetAccordionState();

  if (staffRows.length) {
    populateEmployeeSelect();
  }

  if (evaluatorRows.length) {
    populateEvaluatorSelect();
  }

  renderAverageScore({
    averageRounded: "-",
    averageLabel: "Nog geen beoordeling",
    count: 0
  });

  renderAutoFeedback(["Feedback verschijnt na het opbouwen van het verslag."]);
  updateProgress();
  updateSectionCompletionState();
  setStatusMessage("Formulier leeggemaakt.", "info");
}

function clearEmployeeFields() {
  qs("#employeeName").value = "";
  qs("#callSign").value = "";
  qs("#rank").value = "";
  qs("#employeeSignatureName").value = "";
}

function clearEvaluatorFields() {
  qs("#evaluatorName").value = "";
  qs("#evaluatorRank").value = "";
  qs("#evaluatorSignatureName").value = "";
}

async function copyOutput() {
  const text = qs("#output").value.trim();

  if (!text) {
    return setStatusMessage("Geen verslag om te kopiëren.", "warning");
  }

  await copyTextToClipboard(text);
  setStatusMessage("Verslag gekopieerd.", "success");
}

function downloadOutput() {
  const text = qs("#output").value.trim();

  if (!text) {
    return setStatusMessage("Geen verslag om te downloaden.", "warning");
  }

  downloadTextFile("evaluatieverslag.txt", text);
  setStatusMessage("Download gestart.", "success");
}

function printOutput() {
  const printSheet = qs("#printSheet");

  if (!printSheet.innerHTML.trim()) {
    return setStatusMessage("Bouw eerst een verslag op voor je print.", "warning");
  }

  const originalDisplay = printSheet.style.display;
  printSheet.style.display = "block";
  window.print();
  printSheet.style.display = originalDisplay || "none";
  setStatusMessage("Printvenster geopend.", "info");
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

function formatDateTimeValue(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("nl-BE", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function nl2br(value) {
  return escapeHtml(value).replace(/\n/g, "<br>");
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