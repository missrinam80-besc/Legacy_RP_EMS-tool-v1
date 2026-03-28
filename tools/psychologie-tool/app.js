const CONFIG_URL = "./config.json";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

let config = null;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch(CONFIG_URL);
    config = await response.json();
  } catch {
    config = { selects: {}, checklist: [], costs: [] };
  }

  populateSelects();
  buildChecklist();
  buildCostGrid();
  bindEvents();
  updateDerivedState();
});

function populateSelect(id, options) {
  const element = document.getElementById(id);
  if (!element) return;
  element.innerHTML = ["<option value=''>Maak een keuze</option>"]
    .concat((options || []).map((option) => `<option>${escapeHtml(option)}</option>`))
    .join("");
}

function populateSelects() {
  Object.entries(config.selects || {}).forEach(([id, options]) => populateSelect(id, options));
}

function buildChecklist() {
  const container = document.getElementById("checklistGrid");
  if (!container) return;

  container.innerHTML = (config.checklist || []).map((item, index) => `
    <label class="check-card">
      <input type="checkbox" class="checklist-item" data-label="${escapeHtml(item)}" id="check-${index}" />
      <span>${escapeHtml(item)}</span>
    </label>
  `).join("");
}

function buildCostGrid() {
  const container = document.getElementById("costGrid");
  if (!container) return;

  container.innerHTML = (config.costs || []).map((item, index) => `
    <label class="cost-card">
      <input type="checkbox" class="cost-item" data-amount="${item.amount}" data-label="${escapeHtml(item.label)}" id="cost-${index}" />
      <span class="cost-card__title">${escapeHtml(item.label)}</span>
      <span class="cost-card__amount">€${Number(item.amount).toFixed(0)}</span>
    </label>
  `).join("");
}

function bindEvents() {
  $("#generateBtn")?.addEventListener("click", handleGenerate);
  $("#copyBtn")?.addEventListener("click", handleCopy);
  $("#resetBtn")?.addEventListener("click", handleReset);

  $$("input, select, textarea").forEach((element) => {
    element.addEventListener("input", updateDerivedState);
    element.addEventListener("change", updateDerivedState);
  });
}

function valueOf(id) {
  return document.getElementById(id)?.value.trim() || "-";
}

function checkedValues(selector) {
  return $$(selector)
    .filter((item) => item.checked)
    .map((item) => item.dataset.label || item.value || "")
    .filter(Boolean);
}

function calculatePriority() {
  const urgency = valueOf("urgency");
  const riskLevel = valueOf("riskLevel");
  const mentalState = valueOf("mentalState");
  const cooperation = valueOf("cooperation");

  if (urgency === "Onmiddellijk" || riskLevel === "Acuut" || mentalState === "Agressief") return "Kritiek";
  if (urgency === "Vandaag" || riskLevel === "Hoog" || cooperation === "Geen medewerking") return "Hoog";
  if (urgency === "Binnen 24 uur" || riskLevel === "Matig") return "Verhoogd";
  return "Gepland / standaard";
}

function calculateChecklistProgress() {
  const items = $$(".checklist-item");
  if (!items.length) return 0;
  const done = items.filter((item) => item.checked).length;
  return Math.round((done / items.length) * 100);
}

function calculateCostTotal() {
  return $$(".cost-item")
    .filter((item) => item.checked)
    .reduce((sum, item) => sum + Number(item.dataset.amount || 0), 0);
}

function buildWarnings() {
  const warnings = [];
  const priority = calculatePriority();
  const checklistProgress = calculateChecklistProgress();
  const medicationAdvice = valueOf("medicationAdvice");
  const referralDepartment = valueOf("referralDepartment");
  const outcomeStatus = valueOf("outcomeStatus");

  if (priority === "Kritiek") warnings.push("Casus heeft kritieke prioriteit: voorzie onmiddellijke crisisopvang en veiligheidskader.");
  if (checklistProgress < 60) warnings.push("Intake-checklist is nog onvolledig. Werk de basiselementen af voor je het traject vastlegt.");
  if (medicationAdvice !== "-" && medicationAdvice !== "Geen") warnings.push("Medicatie of psychiatrische opvolging werd aangevinkt. Stem dit RP-technisch af met arts / opnameflow.");
  if (referralDepartment === "Geen" && outcomeStatus !== "Gestabiliseerd") warnings.push("Er is nog geen vervolgafdeling gekozen ondanks een onstabiele uitkomst.");
  if (valueOf("riskNotes") !== "-" && valueOf("riskNotes").length > 10) warnings.push("Er zijn extra risico-opmerkingen genoteerd. Neem die expliciet mee in overdracht of verslag.");

  return warnings.length ? warnings : ["Geen directe waarschuwingen op basis van de huidige invoer."];
}

function updateDerivedState() {
  const priority = calculatePriority();
  const checklistProgress = calculateChecklistProgress();
  const costTotal = calculateCostTotal();
  const warnings = buildWarnings();

  if ($("#priorityBadge")) $("#priorityBadge").textContent = priority;
  if ($("#checklistBadge")) $("#checklistBadge").textContent = `${checklistProgress}% voltooid`;
  if ($("#costBadge")) $("#costBadge").textContent = `€${costTotal.toFixed(0)}`;
  if ($("#warningList")) {
    $("#warningList").innerHTML = warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("");
  }
}

function buildSummary() {
  const checkedChecklist = checkedValues(".checklist-item");
  const checkedCosts = checkedValues(".cost-item");
  const costTotal = calculateCostTotal();

  return [
    "=== PSYCHOLOGIE-ASSISTENT ===",
    `Patiënt: ${valueOf("patientName")}`,
    `Geboortedatum: ${valueOf("patientDob")}`,
    `Psycholoog / verantwoordelijke: ${valueOf("treatingPsychologist")}`,
    `Ondersteunende medewerker: ${valueOf("assistantName")}`,
    `Herkomst casus: ${valueOf("caseOrigin")}`,
    `Urgentie: ${valueOf("urgency")}`,
    `Prioriteit: ${calculatePriority()}`,
    `Type casus: ${valueOf("caseType")}`,
    `Risiconiveau: ${valueOf("riskLevel")}`,
    "",
    "Intake / situatieschets:",
    valueOf("intakeSummary"),
    "",
    "Doel van begeleiding:",
    valueOf("supportGoal"),
    "",
    "=== MENTALE INSCHATTING ===",
    `Mentale toestand: ${valueOf("mentalState")}`,
    `Medewerking: ${valueOf("cooperation")}`,
    `Oriëntatie: ${valueOf("orientation")}`,
    `Slaap / dagelijks functioneren: ${valueOf("sleepFunctioning")}`,
    `Risico-opmerkingen: ${valueOf("riskNotes")}`,
    `Bestaande context / trigger: ${valueOf("contextNotes")}`,
    "",
    "=== CHECKLIST ===",
    checkedChecklist.length ? checkedChecklist.join(", ") : "Geen checklistpunten afgevinkt.",
    `Checklist voortgang: ${calculateChecklistProgress()}%`,
    "",
    "=== TRAJECT ===",
    `Type traject: ${valueOf("trajectoryType")}`,
    `Frequentie: ${valueOf("sessionFrequency")}`,
    `Medicatie / psychiatrisch advies: ${valueOf("medicationAdvice")}`,
    `Aanpak / gesprekstechniek: ${valueOf("rpApproach")}`,
    "",
    "=== OPVOLGING ===",
    `Uitkomst na sessie: ${valueOf("outcomeStatus")}`,
    `Doorverwijzing / vervolgafdeling: ${valueOf("referralDepartment")}`,
    `Opvolgplan: ${valueOf("followupPlan")}`,
    `Aandachtspunten / waarschuwingen: ${valueOf("alerts")}`,
    "",
    "=== KOSTENBLOK PSYCHOLOGIE ===",
    checkedCosts.length ? checkedCosts.join(", ") : "Geen psychologische kosten geselecteerd.",
    `Geschatte kost: €${costTotal.toFixed(0)}`
  ].join("\n");
}

function handleGenerate() {
  const output = $("#summaryOutput");
  const statusBox = $("#statusBox");
  if (!output || !statusBox) return;

  output.value = buildSummary();
  statusBox.textContent = "Psychologie-samenvatting gegenereerd. Deze kun je gebruiken als basis voor een consult- of opvolgverslag.";
  updateDerivedState();
}

async function handleCopy() {
  const output = $("#summaryOutput");
  const statusBox = $("#statusBox");
  if (!output || !statusBox) return;

  if (!output.value.trim()) {
    statusBox.textContent = "Genereer eerst een samenvatting voor je kopieert.";
    return;
  }

  try {
    await navigator.clipboard.writeText(output.value);
    statusBox.textContent = "Samenvatting gekopieerd naar het klembord.";
  } catch {
    statusBox.textContent = "Kopiëren is niet gelukt.";
  }
}

function handleReset() {
  $$("input, textarea").forEach((element) => {
    if (element.type === "checkbox") {
      element.checked = false;
    } else {
      element.value = "";
    }
  });

  $$("select").forEach((select) => {
    select.selectedIndex = 0;
  });

  if ($("#summaryOutput")) $("#summaryOutput").value = "";
  if ($("#statusBox")) $("#statusBox").textContent = "Formulier gereset.";
  updateDerivedState();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}





document.addEventListener("DOMContentLoaded", () => {
  if (!window.DepartmentFlow) return;
  DepartmentFlow.init({
    departmentKey: "psychologie",
    label: "psychologie",
    stage: "tool",
    nextUrl: "../rapport-psychologie/index.html",
    autoImport: true,
    importLabel: "Importeer aanvraag",
    importMapping: {
      patientName: "patientName",
      patientDob: "patientDob",
      locatie: "caseOrigin",
      hulpvraag: "intakeSummary",
      huidigeSituatie: "intakeSummary",
      huidigeThema: "contextNotes",
      presentatie: "mentalState",
      veiligheid: "riskLevel",
      risicoIndicaties: "riskNotes",
      eersteActies: "rpApproach",
      trajectType: "trajectoryType",
      extraInfo: "alerts"
    },
    steps: [
      { id: "request", title: "1. Aanvraag", shortTitle: "aanvraag", url: "../aanvraag-psychologie-crisis/index.html" },
      { id: "tool", title: "2. Tool", shortTitle: "tool", url: window.location.pathname },
      { id: "report", title: "3. Rapport", shortTitle: "rapport", url: "../rapport-psychologie/index.html" }
    ],
    collectValues: () => ({
      patientName: document.getElementById("patientName")?.value || "",
      patientDob: document.getElementById("patientDob")?.value || "",
      caseOrigin: document.getElementById("caseOrigin")?.value || "",
      urgency: document.getElementById("urgency")?.value || "",
      caseType: document.getElementById("caseType")?.value || "",
      riskLevel: document.getElementById("riskLevel")?.value || "",
      intakeSummary: document.getElementById("intakeSummary")?.value || "",
      supportGoal: document.getElementById("supportGoal")?.value || "",
      mentalState: document.getElementById("mentalState")?.value || "",
      cooperation: document.getElementById("cooperation")?.value || "",
      orientation: document.getElementById("orientation")?.value || "",
      sleepFunctioning: document.getElementById("sleepFunctioning")?.value || "",
      riskNotes: document.getElementById("riskNotes")?.value || "",
      contextNotes: document.getElementById("contextNotes")?.value || "",
      trajectoryType: document.getElementById("trajectoryType")?.value || "",
      sessionFrequency: document.getElementById("sessionFrequency")?.value || "",
      medicationAdvice: document.getElementById("medicationAdvice")?.value || "",
      rpApproach: document.getElementById("rpApproach")?.value || "",
      outcomeStatus: document.getElementById("outcomeStatus")?.value || "",
      referralDepartment: document.getElementById("referralDepartment")?.value || "",
      followupPlan: document.getElementById("followupPlan")?.value || "",
      alerts: document.getElementById("alerts")?.value || ""
    }),
    buildSummary: () => document.getElementById("summaryOutput")?.value || "",
    saveNextLabel: "Zet klaar voor rapport"
  });
});
