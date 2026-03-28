const CONFIG_URL = "./config.json";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

let config = null;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch(CONFIG_URL);
    config = await response.json();
  } catch {
    config = getFallbackConfig();
  }

  populateSelects();
  buildChecklist();
  buildCostGrid();
  bindEvents();
  updateDerivedState();
});

function getFallbackConfig() {
  return {
    selects: {},
    checklist: [],
    costs: []
  };
}

function populateSelect(id, options) {
  const element = document.getElementById(id);
  if (!element) return;

  element.innerHTML = ["<option value=''>Maak een keuze</option>"]
    .concat((options || []).map((option) => `<option>${option}</option>`))
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
  const stability = valueOf("stability");
  const bloodLoss = valueOf("bloodLoss");
  const consciousness = valueOf("consciousness");

  if (
    urgency === "Onmiddellijk" ||
    stability === "Kritiek" ||
    bloodLoss === "Ernstig" ||
    consciousness === "Buiten bewustzijn"
  ) return "Kritiek";

  if (
    urgency === "Binnen 30 minuten" ||
    stability === "Onstabiel" ||
    bloodLoss === "Veel"
  ) return "Hoog";

  if (urgency === "Binnen 1 uur" || stability === "Matig stabiel") return "Verhoogd";
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
  const npoStatus = valueOf("npoStatus");
  const allergies = valueOf("allergies");
  const postOpStatus = valueOf("postOpStatus");

  if (priority === "Kritiek") warnings.push("Patiënt heeft kritieke prioriteit: onmiddellijke chirurgische aandacht nodig.");
  if (checklistProgress < 60) warnings.push("Checklist is nog onvolledig. Controleer pre-op stappen voor start van de ingreep.");
  if (npoStatus === "Nee" || npoStatus === "Onbekend") warnings.push("Nuchterstatus is niet ideaal of onbekend. Hou hier RP-technisch rekening mee.");
  if (allergies !== "-" && allergies.toLowerCase() !== "geen") warnings.push("Er zijn allergieën of risico's genoteerd. Verifieer medicatie en voorbereiding.");
  if (postOpStatus === "Instabiel") warnings.push("Post-op status is instabiel. Voorzie opname of intensieve opvolging.");

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
    "=== OPERATIE-ASSISTENT ===",
    `Patiënt: ${valueOf("patientName")}`,
    `Geboortedatum: ${valueOf("patientDob")}`,
    `Chirurg / verantwoordelijke: ${valueOf("treatingSurgeon")}`,
    `Operatie-assistent: ${valueOf("assistantName")}`,
    `Herkomst casus: ${valueOf("caseOrigin")}`,
    `Urgentie: ${valueOf("urgency")}`,
    `Prioriteit: ${calculatePriority()}`,
    `Type ingreep: ${valueOf("operationType")}`,
    `Complexiteit: ${valueOf("operationComplexity")}`,
    `Stabiliteit: ${valueOf("stability")}`,
    "",
    "Situatieschets / diagnose:",
    valueOf("diagnosis"),
    "",
    "Doel van de ingreep:",
    valueOf("surgicalGoal"),
    "",
    "=== PRE-OP SCREENING ===",
    `Bewustzijn: ${valueOf("consciousness")}`,
    `Pols: ${valueOf("pulse")}`,
    `Ademhaling: ${valueOf("breathing")}`,
    `Bloedverlies: ${valueOf("bloodLoss")}`,
    `Pijnniveau: ${valueOf("painLevel")}`,
    `Nuchterstatus: ${valueOf("npoStatus")}`,
    `Allergieën / risico's: ${valueOf("allergies")}`,
    `Voorbereiding reeds uitgevoerd: ${valueOf("preOpActions")}`,
    "",
    "=== CHECKLIST ===",
    checkedChecklist.length ? checkedChecklist.join(", ") : "Geen checklistpunten afgevinkt.",
    `Checklist voortgang: ${calculateChecklistProgress()}%`,
    "",
    "=== INGREEP ===",
    `Anesthesie / sedatie: ${valueOf("anesthesia")}`,
    `Benodigd materiaal: ${valueOf("requiredMaterials")}`,
    "RP-stappen:",
    valueOf("rpSteps"),
    "",
    "=== POST-OP ===",
    `Onmiddellijke post-op status: ${valueOf("postOpStatus")}`,
    `Vervolgafdeling: ${valueOf("followupDepartment")}`,
    `Post-op plan: ${valueOf("postOpPlan")}`,
    `Complicaties / aandachtspunten: ${valueOf("complications")}`,
    "",
    "=== KOSTENBLOK CHIRURGIE ===",
    checkedCosts.length ? checkedCosts.join(", ") : "Geen chirurgische kosten geselecteerd.",
    `Geschatte chirurgische kost: €${costTotal.toFixed(0)}`
  ].join("\n");
}

function handleGenerate() {
  const output = $("#summaryOutput");
  const statusBox = $("#statusBox");
  if (!output || !statusBox) return;

  output.value = buildSummary();
  statusBox.textContent = "Operatie-samenvatting gegenereerd. Deze kun je gebruiken als basis voor het operatierapport.";
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
