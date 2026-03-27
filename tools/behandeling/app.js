/**
 * EMS Behandeltool v3
 * -------------------
 * Uitbreidingen:
 * - afdelingsfilter
 * - kostenraming
 * - nazorg / opvolging
 * - afdeling-specifieke filtering van resultaten
 */

let APP_CONFIG = null;

/* =========================================================
   DOM
========================================================= */

const bodypartsContainer = document.getElementById("bodypartsContainer");
const generateBtn = document.getElementById("generateBtn");
const resetBtn = document.getElementById("resetBtn");
const copyReportBtn = document.getElementById("copyReportBtn");

const priorityBadge = document.getElementById("priorityBadge");
const departmentTags = document.getElementById("departmentTags");
const stepsList = document.getElementById("stepsList");
const actionsList = document.getElementById("actionsList");
const itemsList = document.getElementById("itemsList");
const investigationsList = document.getElementById("investigationsList");
const followUpList = document.getElementById("followUpList");
const warningsList = document.getElementById("warningsList");
const reportSummary = document.getElementById("reportSummary");

const costInjuries = document.getElementById("costInjuries");
const costItems = document.getElementById("costItems");
const costInvestigations = document.getElementById("costInvestigations");
const costTotal = document.getElementById("costTotal");
const costBreakdownList = document.getElementById("costBreakdownList");

const injuryRowTemplate = document.getElementById("injuryRowTemplate");

/* =========================================================
   INIT
========================================================= */

document.addEventListener("DOMContentLoaded", initApp);

async function initApp() {
  try {
    const response = await fetch("config.json");
    if (!response.ok) {
      throw new Error(`Config kon niet geladen worden (${response.status})`);
    }

    APP_CONFIG = await response.json();

    renderStaticSelects();
    renderBodyPartInputs();
    bindEvents();
  } catch (error) {
    console.error("Fout bij laden van de behandeltool:", error);
    alert("Fout bij laden van de behandeltool. Controleer config.json en het pad.");
  }
}

/* =========================================================
   RENDER STATIC SELECTS
========================================================= */

function renderStaticSelects() {
  renderOptions("departmentFilter", APP_CONFIG.selectOptions.departmentFilter);
  renderOptions("consciousness", APP_CONFIG.selectOptions.consciousness);
  renderOptions("triage", APP_CONFIG.selectOptions.triage);
  renderOptions("pulse", APP_CONFIG.selectOptions.pulse);
  renderOptions("temperature", APP_CONFIG.selectOptions.temperature);
  renderOptions("painLevel", APP_CONFIG.selectOptions.painLevel);
  renderOptions("bleedingLevel", APP_CONFIG.selectOptions.bleedingLevel);
  renderOptions("airwayRisk", APP_CONFIG.selectOptions.airwayRisk);
  renderOptions("breathingStatus", APP_CONFIG.selectOptions.breathingStatus);
}

function renderOptions(selectId, options) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = options
    .map((option) => `<option value="${escapeAttr(option.value)}">${escapeHtml(option.label)}</option>`)
    .join("");
}

/* =========================================================
   BODY PART RENDERING
========================================================= */

function renderBodyPartInputs() {
  bodypartsContainer.innerHTML = "";

  APP_CONFIG.bodyParts.forEach((part) => {
    const html = `
      <div class="bodypart-card" data-bodypart="${escapeAttr(part.key)}">
        <div class="bodypart-card-header">
          <h3 class="bodypart-title">${escapeHtml(part.label)}</h3>
          <button type="button" class="btn btn-primary btn-add-injury" data-bodypart="${escapeAttr(part.key)}">
            Voeg letsel toe
          </button>
        </div>

        <div class="checkbox-row bodypart-checkboxes">
          <label class="checkbox-inline">
            <input type="checkbox" id="fracture-${escapeAttr(part.key)}" data-role="fracture" />
            Vermoeden van breuk / fractuur
          </label>

          <label class="checkbox-inline">
            <input type="checkbox" id="needsImaging-${escapeAttr(part.key)}" data-role="needsImaging" />
            Beeldvorming overwegen
          </label>
        </div>

        <div class="injuries-container" id="injuries-${escapeAttr(part.key)}"></div>
      </div>
    `;

    bodypartsContainer.insertAdjacentHTML("beforeend", html);
    addInjuryRow(part.key);
  });

  bindDynamicEvents();
}

function bindDynamicEvents() {
  document.querySelectorAll(".btn-add-injury").forEach((btn) => {
    btn.addEventListener("click", () => {
      addInjuryRow(btn.dataset.bodypart);
    });
  });

  bodypartsContainer.addEventListener("click", (event) => {
    const removeBtn = event.target.closest(".btn-remove-injury");
    if (!removeBtn) return;

    const row = removeBtn.closest(".injury-row");
    const container = row?.parentElement;
    if (!row || !container) return;

    const rows = container.querySelectorAll(".injury-row");
    if (rows.length <= 1) {
      clearInjuryRow(row);
      return;
    }

    row.remove();
  });
}

function addInjuryRow(bodyPartKey) {
  const container = document.getElementById(`injuries-${bodyPartKey}`);
  if (!container || !injuryRowTemplate) return;

  const clone = injuryRowTemplate.content.cloneNode(true);
  const row = clone.querySelector(".injury-row");

  const woundSelect = row.querySelector('[data-field="woundType"]');
  const severitySelect = row.querySelector('[data-field="severity"]');

  woundSelect.innerHTML = APP_CONFIG.woundOptions
    .map((option) => `<option value="${escapeAttr(option.value)}">${escapeHtml(option.label)}</option>`)
    .join("");

  severitySelect.innerHTML = APP_CONFIG.selectOptions.injurySeverity
    .map((option) => `<option value="${escapeAttr(option.value)}">${escapeHtml(option.label)}</option>`)
    .join("");

  container.appendChild(clone);
}

function clearInjuryRow(row) {
  const woundSelect = row.querySelector('[data-field="woundType"]');
  const severitySelect = row.querySelector('[data-field="severity"]');
  const noteInput = row.querySelector('[data-field="note"]');

  if (woundSelect) woundSelect.selectedIndex = 0;
  if (severitySelect) severitySelect.selectedIndex = 0;
  if (noteInput) noteInput.value = "";
}

/* =========================================================
   EVENTS
========================================================= */

function bindEvents() {
  generateBtn.addEventListener("click", handleGenerateAdvice);
  resetBtn.addEventListener("click", handleReset);
  copyReportBtn.addEventListener("click", handleCopySummary);
}

/* =========================================================
   DATA COLLECTION
========================================================= */

function getFormData() {
  return {
    filter: {
      department: valueOf("departmentFilter")
    },
    patient: {
      name: valueOf("patientName"),
      dob: valueOf("patientDob"),
      location: valueOf("incidentLocation"),
      treatingMedic: valueOf("treatingMedic")
    },
    condition: {
      consciousness: valueOf("consciousness"),
      triage: valueOf("triage"),
      pulse: valueOf("pulse"),
      temperature: valueOf("temperature"),
      painLevel: valueOf("painLevel"),
      bleedingLevel: valueOf("bleedingLevel"),
      airwayRisk: valueOf("airwayRisk"),
      breathingStatus: valueOf("breathingStatus"),
      generalNotes: valueOf("generalNotes")
    },
    injuries: APP_CONFIG.bodyParts.map((part) => {
      const injuriesContainer = document.getElementById(`injuries-${part.key}`);
      const rows = injuriesContainer ? Array.from(injuriesContainer.querySelectorAll(".injury-row")) : [];

      const injuries = rows.map((row) => ({
        wound: row.querySelector('[data-field="woundType"]')?.value?.trim() || "",
        severity: row.querySelector('[data-field="severity"]')?.value?.trim() || "moderate",
        note: row.querySelector('[data-field="note"]')?.value?.trim() || ""
      })).filter((injury) => injury.wound || injury.note);

      return {
        key: part.key,
        label: part.label,
        fractureZone: part.fractureZone,
        fracture: checkedOf(`fracture-${part.key}`),
        needsImaging: checkedOf(`needsImaging-${part.key}`),
        injuries
      };
    })
  };
}

function valueOf(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function checkedOf(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}

/* =========================================================
   MAIN ENGINE
========================================================= */

function handleGenerateAdvice() {
  const formData = getFormData();
  const result = buildTreatmentAdvice(formData);
  renderResult(result);
}

function buildTreatmentAdvice(formData) {
  const uniqueSteps = new Set();
  const uniqueActions = new Set();
  const uniqueItems = new Set();
  const uniqueWarnings = new Set();
  const uniqueInvestigations = new Set();
  const uniqueFollowUp = new Set();
  const departments = new Set();

  const costState = {
    injuries: 0,
    items: 0,
    investigations: 0,
    breakdown: []
  };

  let severityScore = 0;
  let hasAnyInjury = false;

  severityScore += getGeneralSeverityScore(formData.condition);

  applyGeneralConditionLogic(formData.condition, {
    uniqueSteps,
    uniqueActions,
    uniqueItems,
    uniqueWarnings,
    uniqueInvestigations,
    uniqueFollowUp,
    departments
  });

  formData.injuries.forEach((part) => {
    const hasPartInjury = part.injuries.length > 0 || part.fracture || part.needsImaging;

    if (hasPartInjury) {
      hasAnyInjury = true;
    }

    part.injuries.forEach((injury) => {
      if (!injury.wound) return;

      const rule = APP_CONFIG.woundRules[injury.wound];
      if (!rule) return;

      const severityMultiplier = getSeverityMultiplier(injury.severity);
      severityScore += Number(rule.severity || 0) * severityMultiplier;

      addTaggedItems(uniqueSteps, part.label, rule.steps || [], rule.departments || [], "step");
      addTaggedItems(uniqueActions, part.label, rule.actions || [], rule.departments || [], "action");
      addSimpleTaggedItems(uniqueItems, rule.items || [], rule.departments || []);
      addTaggedItems(uniqueWarnings, part.label, rule.warnings || [], rule.departments || [], "warning");
      addTaggedItems(uniqueInvestigations, part.label, rule.investigations || [], rule.departments || [], "investigation");
      addTaggedItems(uniqueFollowUp, part.label, rule.followUp || [], rule.departments || [], "followup");

      (rule.departments || []).forEach((department) => departments.add(department));

      applySeveritySpecificLogic(part, injury, {
        uniqueSteps,
        uniqueActions,
        uniqueItems,
        uniqueWarnings,
        uniqueInvestigations,
        uniqueFollowUp,
        departments
      });

      addInjuryCost(injury.wound, injury.severity, costState);
    });

    if (part.fracture) {
      severityScore += 2.5;
      addFractureAdvice(part, {
        uniqueSteps,
        uniqueActions,
        uniqueItems,
        uniqueWarnings,
        uniqueInvestigations,
        uniqueFollowUp,
        departments
      });
      addCostLine(costState, "injuries", `Fractuurverdenking ${part.label}`, APP_CONFIG.costs.fractureSurcharge || 0);
    }

    if (part.needsImaging) {
      addImagingAdvice(part, uniqueInvestigations, departments);
    }
  });

  if (!hasAnyInjury) {
    addTaggedItems(uniqueSteps, "", ["Start met algemene evaluatie van patiënt en letsels"], ["Spoed"], "step");
    addTaggedItems(uniqueActions, "", ["Voer klinische beoordeling uit en vul letsels aan indien nodig"], ["Spoed"], "action");
    addTaggedItems(uniqueWarnings, "", ["Geen specifieke letsels geselecteerd"], ["Spoed"], "warning");
  }

  const filteredDepartments = filterDepartments(Array.from(departments), formData.filter.department);
  const filteredSteps = filterTaggedSet(uniqueSteps, formData.filter.department);
  const filteredActions = filterTaggedSet(uniqueActions, formData.filter.department);
  const filteredItems = filterItemsSet(uniqueItems, formData.filter.department);
  const filteredInvestigations = filterTaggedSet(uniqueInvestigations, formData.filter.department);
  const filteredFollowUp = filterTaggedSet(uniqueFollowUp, formData.filter.department);
  const filteredWarnings = filterTaggedSet(uniqueWarnings, formData.filter.department);

  addItemCosts(filteredItems, costState);
  addInvestigationCosts(filteredInvestigations, costState);

  const priority = determinePriority(severityScore, formData.condition);
  const summary = buildReportSummary(
    formData,
    priority,
    filteredDepartments,
    filteredSteps,
    filteredActions,
    filteredItems,
    filteredInvestigations,
    filteredFollowUp
  );

  return {
    priority,
    departments: filteredDepartments,
    steps: filteredSteps,
    actions: filteredActions,
    items: filteredItems.map((item) => APP_CONFIG.itemLabels[item.code] || item.code),
    investigations: filteredInvestigations,
    followUp: filteredFollowUp,
    warnings: filteredWarnings,
    summary,
    costs: {
      injuries: costState.injuries,
      items: costState.items,
      investigations: costState.investigations,
      total: costState.injuries + costState.items + costState.investigations,
      breakdown: costState.breakdown
    }
  };
}

/* =========================================================
   GENERAL CONDITION LOGIC
========================================================= */

function applyGeneralConditionLogic(condition, ctx) {
  const {
    uniqueSteps,
    uniqueActions,
    uniqueItems,
    uniqueWarnings,
    uniqueInvestigations,
    uniqueFollowUp,
    departments
  } = ctx;

  departments.add("Spoed");

  if (condition.airwayRisk === "at-risk" || condition.airwayRisk === "critical") {
    addTaggedItems(uniqueSteps, "", ["Beoordeel en beveilig de luchtweg"], ["Ambulance", "Spoed"], "step");
    addTaggedItems(uniqueActions, "", ["Voer onmiddellijke controle van de luchtweg uit"], ["Ambulance", "Spoed"], "action");
    addTaggedItems(uniqueWarnings, "", ["Luchtweg kan bedreigd zijn"], ["Ambulance", "Spoed"], "warning");
    departments.add("Ambulance");
    departments.add("Spoed");
  }

  if (condition.airwayRisk === "critical") {
    addTaggedItems(uniqueWarnings, "", ["Kritisch luchtwegprobleem vraagt onmiddellijke interventie"], ["Ambulance", "Spoed"], "warning");
  }

  if (condition.breathingStatus === "disturbed" || condition.breathingStatus === "severe") {
    addTaggedItems(uniqueSteps, "", ["Beoordeel ademhaling en zuurstofstatus"], ["Ambulance", "Spoed"], "step");
    addTaggedItems(uniqueActions, "", ["Controleer ademhaling en ondersteun waar nodig"], ["Ambulance", "Spoed"], "action");
    addTaggedItems(uniqueWarnings, "", ["Verstoorde ademhaling aanwezig"], ["Ambulance", "Spoed"], "warning");
    departments.add("Ambulance");
    departments.add("Spoed");
  }

  if (condition.breathingStatus === "severe") {
    addTaggedItems(uniqueWarnings, "", ["Ernstige ademhalingsproblemen vereisen snelle stabilisatie"], ["Ambulance", "Spoed"], "warning");
  }

  if (condition.consciousness === "unconscious") {
    addTaggedItems(uniqueSteps, "", ["Start ABC-beoordeling met prioriteit"], ["Ambulance", "Spoed"], "step");
    addTaggedItems(uniqueActions, "", ["Beveilig de luchtweg en voer onmiddellijke vitale beoordeling uit"], ["Ambulance", "Spoed"], "action");
    addTaggedItems(uniqueWarnings, "", ["Bewusteloze patiënt vereist onmiddellijke opvolging"], ["Ambulance", "Spoed"], "warning");
    addTaggedItems(uniqueFollowUp, "", ["Blijf patiënt continu monitoren tijdens verdere zorg"], ["Ambulance", "Spoed"], "followup");
    departments.add("Ambulance");
    departments.add("Spoed");
  }

  if (["high", "extreme"].includes(condition.bleedingLevel)) {
    addTaggedItems(uniqueSteps, "", ["Stop actieve bloeding als eerste behandelstap"], ["Ambulance", "Spoed"], "step");
    addTaggedItems(uniqueActions, "", ["Controleer en stop actieve bloeding als prioriteit"], ["Ambulance", "Spoed"], "action");
    addSimpleTaggedItems(uniqueItems, ["tourniquet", "quick_clot"], ["Ambulance", "Spoed"]);
    addTaggedItems(uniqueWarnings, "", ["Ernstig bloedverlies vereist snelle stabilisatie"], ["Ambulance", "Spoed"], "warning");
    departments.add("Ambulance");
    departments.add("Spoed");
  }

  if (condition.bleedingLevel === "extreme") {
    addTaggedItems(uniqueSteps, "", ["Start volume- of bloedresuscitatie indien klinisch nodig"], ["Spoed"], "step");
    addSimpleTaggedItems(uniqueItems, ["blood500ml", "saline500ml"], ["Spoed"]);
    addTaggedItems(uniqueActions, "", ["Voorzie volume- of bloedresuscitatie indien nodig"], ["Spoed"], "action");
    addTaggedItems(uniqueInvestigations, "", ["Controle van circulatie en bloedverlies"], ["Spoed"], "investigation");
    departments.add("Spoed");
  }

  if (["high", "extreme"].includes(condition.painLevel)) {
    addTaggedItems(uniqueActions, "", ["Voorzie adequate pijnstilling"], ["Spoed"], "action");
    addSimpleTaggedItems(uniqueItems, ["painkillers", "morphine"], ["Spoed"]);
    departments.add("Spoed");
  }

  if (condition.temperature === "elevated") {
    addTaggedItems(uniqueWarnings, "", ["Controleer oorzaak van verhoogde temperatuur"], ["Spoed"], "warning");
  }

  if (condition.pulse === "weak") {
    addTaggedItems(uniqueWarnings, "", ["Zwakke pols kan wijzen op instabiliteit of bloedverlies"], ["Spoed"], "warning");
  }

  if (condition.triage === "critical") {
    addTaggedItems(uniqueWarnings, "", ["Patiënt is als kritiek ingeschat"], ["Spoed"], "warning");
    addTaggedItems(uniqueActions, "", ["Prioriteer spoedzorg en snelle overdracht"], ["Spoed"], "action");
    addTaggedItems(uniqueSteps, "", ["Bereid snelle overdracht of verdere interventie voor"], ["Spoed"], "step");
    departments.add("Spoed");
  }
}

function getGeneralSeverityScore(condition) {
  let score = 0;

  if (condition.consciousness === "reduced") score += 2;
  if (condition.consciousness === "unconscious") score += 5;

  if (condition.airwayRisk === "at-risk") score += 3;
  if (condition.airwayRisk === "critical") score += 6;

  if (condition.breathingStatus === "disturbed") score += 2;
  if (condition.breathingStatus === "severe") score += 5;

  if (condition.bleedingLevel === "light") score += 1;
  if (condition.bleedingLevel === "moderate") score += 2;
  if (condition.bleedingLevel === "high") score += 4;
  if (condition.bleedingLevel === "extreme") score += 6;

  if (condition.painLevel === "moderate") score += 1;
  if (condition.painLevel === "high") score += 2;
  if (condition.painLevel === "extreme") score += 3;

  if (condition.pulse === "weak") score += 2;
  if (condition.pulse === "fast") score += 1;
  if (condition.pulse === "slow") score += 1;

  if (condition.triage === "urgent") score += 2;
  if (condition.triage === "critical") score += 4;

  return score;
}

/* =========================================================
   INJURY LOGIC
========================================================= */

function getSeverityMultiplier(severity) {
  switch (severity) {
    case "light":
      return 0.8;
    case "moderate":
      return 1;
    case "severe":
      return 1.35;
    case "critical":
      return 1.75;
    default:
      return 1;
  }
}

function applySeveritySpecificLogic(part, injury, ctx) {
  const {
    uniqueSteps,
    uniqueActions,
    uniqueWarnings,
    uniqueInvestigations,
    uniqueFollowUp,
    departments
  } = ctx;

  const severeDepartments = ["Spoed"];

  if (injury.severity === "severe" || injury.severity === "critical") {
    addTaggedItems(uniqueWarnings, part.label, ["ernstig letsel vraagt verhoogde opvolging"], severeDepartments, "warning");
    addTaggedItems(uniqueActions, part.label, ["monitor evolutie van het letsel nauwgezet"], severeDepartments, "action");
    addTaggedItems(uniqueFollowUp, part.label, ["plan hercontrole van pijn, bloeding en functie"], severeDepartments, "followup");
    departments.add("Spoed");
  }

  if (injury.severity === "critical") {
    addTaggedItems(uniqueSteps, part.label, ["behandel dit letsel als prioritaire interventie"], severeDepartments, "step");
  }

  if (part.fractureZone === "leg" && ["mediumvelocitywound", "highvelocitywound", "velocitywound", "crush"].includes(injury.wound)) {
    addTaggedItems(uniqueWarnings, part.label, ["verhoogd risico op mobiliteitsproblemen of instabiliteit"], ["Spoed"], "warning");
    addTaggedItems(uniqueFollowUp, part.label, ["beperk belasting en evalueer mobiliteit opnieuw"], ["Spoed"], "followup");
  }

  if (part.fractureZone === "arm" && ["cut", "laceration", "puncturewound", "velocitywound"].includes(injury.wound)) {
    addTaggedItems(uniqueWarnings, part.label, ["controleer functie en bewegingsbeperking van de arm"], ["Spoed"], "warning");
    addTaggedItems(uniqueFollowUp, part.label, ["hercontroleer functie van arm en hand"], ["Spoed"], "followup");
  }

  if (part.key === "head" && ["burn", "crush", "highvelocitywound", "velocitywound"].includes(injury.wound)) {
    addTaggedItems(uniqueInvestigations, part.label, ["overweeg CT of neurologische evaluatie"], ["Spoed"], "investigation");
    addTaggedItems(uniqueFollowUp, part.label, ["neuro-observatie en hercontrole bewustzijn"], ["Spoed"], "followup");
    departments.add("Spoed");
  }

  if (part.key === "torso" && ["puncturewound", "velocitywound", "highvelocitywound", "crush"].includes(injury.wound)) {
    addTaggedItems(uniqueWarnings, part.label, ["risico op intern letsel"], ["Chirurgie"], "warning");
    addTaggedItems(uniqueInvestigations, part.label, ["overweeg beeldvorming bij romptrauma"], ["Chirurgie"], "investigation");
    addTaggedItems(uniqueFollowUp, part.label, ["observeer op verslechtering of interne complicaties"], ["Chirurgie"], "followup");
    departments.add("Chirurgie");
  }

  if (["mediumvelocitywound", "highvelocitywound", "velocitywound", "puncturewound"].includes(injury.wound)) {
    departments.add("Chirurgie");
  }
}

/* =========================================================
   FRACTURES / IMAGING
========================================================= */

function addFractureAdvice(part, ctx) {
  const {
    uniqueSteps,
    uniqueActions,
    uniqueItems,
    uniqueWarnings,
    uniqueInvestigations,
    uniqueFollowUp,
    departments
  } = ctx;

  addTaggedItems(uniqueSteps, part.label, ["immobiliseer het getroffen lichaamsdeel"], ["Spoed"], "step");
  addTaggedItems(uniqueActions, part.label, ["immobiliseer en beperk beweging"], ["Spoed"], "action");
  addTaggedItems(uniqueWarnings, part.label, ["vermoeden van fractuur, verdere evaluatie aanbevolen"], ["Spoed"], "warning");
  addTaggedItems(uniqueInvestigations, part.label, ["RX aanbevolen bij vermoeden van fractuur"], ["Spoed"], "investigation");
  addTaggedItems(uniqueFollowUp, part.label, ["hercontroleer pijn, stand en functie na immobilisatie"], ["Spoed"], "followup");

  departments.add("Spoed");

  switch (part.fractureZone) {
    case "neck":
      addSimpleTaggedItems(uniqueItems, ["neckbrace"], ["Ambulance", "Spoed"]);
      addTaggedItems(uniqueActions, part.label, ["stabiliseer hoofd/nek en beperk beweging"], ["Ambulance", "Spoed"], "action");
      addTaggedItems(uniqueWarnings, part.label, ["overweeg beeldvorming bij nek- of hoofdletsel"], ["Ambulance", "Spoed"], "warning");
      addTaggedItems(uniqueInvestigations, part.label, ["CT of RX overwegen afhankelijk van context"], ["Ambulance", "Spoed"], "investigation");
      departments.add("Ambulance");
      break;

    case "arm":
      addSimpleTaggedItems(uniqueItems, ["armsplint"], ["Spoed"]);
      addTaggedItems(uniqueActions, part.label, ["voorzie armspalk"], ["Spoed"], "action");
      addTaggedItems(uniqueWarnings, part.label, ["armfractuur kan mobiliteit en functie beperken"], ["Spoed"], "warning");
      break;

    case "leg":
      addSimpleTaggedItems(uniqueItems, ["legsplint"], ["Spoed"]);
      addTaggedItems(uniqueActions, part.label, ["voorzie beenspalk"], ["Spoed"], "action");
      addTaggedItems(uniqueWarnings, part.label, ["beenfractuur kan instabiliteit en manken veroorzaken"], ["Spoed"], "warning");
      break;

    case "torso":
      addTaggedItems(uniqueActions, part.label, ["observeer nauw op intern letsel of bijkomende schade"], ["Chirurgie"], "action");
      addTaggedItems(uniqueWarnings, part.label, ["romptrauma vraagt extra waakzaamheid"], ["Chirurgie"], "warning");
      addTaggedItems(uniqueInvestigations, part.label, ["overweeg verdere beeldvorming"], ["Chirurgie"], "investigation");
      departments.add("Chirurgie");
      break;
  }
}

function addImagingAdvice(part, investigationsSet, departments) {
  addTaggedItems(investigationsSet, part.label, ["beeldvorming overwegen op basis van klinisch beeld"], ["Spoed"], "investigation");
  departments.add("Spoed");

  if (part.key === "head" || part.key === "torso") {
    departments.add("Chirurgie");
  }
}

/* =========================================================
   FILTERING HELPERS
========================================================= */

function addTaggedItems(targetSet, labelPrefix, items, departments, type) {
  items.forEach((item) => {
    const text = labelPrefix ? `${labelPrefix}: ${item}` : item;
    targetSet.add(JSON.stringify({
      text,
      departments: departments && departments.length ? departments : ["Spoed"],
      type
    }));
  });
}

function addSimpleTaggedItems(targetSet, itemCodes, departments) {
  itemCodes.forEach((code) => {
    targetSet.add(JSON.stringify({
      code,
      departments: departments && departments.length ? departments : ["Spoed"]
    }));
  });
}

function filterTaggedSet(taggedSet, selectedDepartment) {
  return Array.from(taggedSet)
    .map((value) => JSON.parse(value))
    .filter((entry) => matchesDepartment(entry.departments, selectedDepartment))
    .map((entry) => entry.text);
}

function filterItemsSet(taggedSet, selectedDepartment) {
  const map = new Map();

  Array.from(taggedSet)
    .map((value) => JSON.parse(value))
    .filter((entry) => matchesDepartment(entry.departments, selectedDepartment))
    .forEach((entry) => {
      if (!map.has(entry.code)) {
        map.set(entry.code, entry);
      }
    });

  return Array.from(map.values());
}

function filterDepartments(departments, selectedDepartment) {
  if (!selectedDepartment || selectedDepartment === "all") {
    return departments.sort();
  }

  return departments.filter((department) => department === selectedDepartment);
}

function matchesDepartment(entryDepartments, selectedDepartment) {
  if (!selectedDepartment || selectedDepartment === "all") {
    return true;
  }

  return entryDepartments.includes(selectedDepartment);
}

/* =========================================================
   COSTS
========================================================= */

function addInjuryCost(woundCode, severity, costState) {
  const woundBaseCost = APP_CONFIG.costs.wounds[woundCode] ?? APP_CONFIG.costs.defaultWound ?? 0;
  const multiplier = APP_CONFIG.costs.severityMultipliers[severity] ?? 1;
  const cost = Math.round(woundBaseCost * multiplier);

  addCostLine(costState, "injuries", `${getWoundLabel(woundCode)} (${getSeverityLabel(severity)})`, cost);
}

function addItemCosts(filteredItems, costState) {
  const seen = new Set();

  filteredItems.forEach((item) => {
    if (seen.has(item.code)) return;
    seen.add(item.code);

    const cost = APP_CONFIG.costs.items[item.code] ?? 0;
    if (cost > 0) {
      addCostLine(costState, "items", APP_CONFIG.itemLabels[item.code] || item.code, cost);
    }
  });
}

function addInvestigationCosts(filteredInvestigations, costState) {
  filteredInvestigations.forEach((investigation) => {
    const matchKey = Object.keys(APP_CONFIG.costs.investigations).find((key) =>
      investigation.toLowerCase().includes(key.toLowerCase())
    );

    if (!matchKey) return;

    const cost = APP_CONFIG.costs.investigations[matchKey] ?? 0;
    if (cost > 0) {
      addCostLine(costState, "investigations", investigation, cost);
    }
  });
}

function addCostLine(costState, bucket, label, amount) {
  if (!amount) return;

  costState[bucket] += amount;
  costState.breakdown.push({
    bucket,
    label,
    amount
  });
}

/* =========================================================
   PRIORITY
========================================================= */

function determinePriority(score, condition) {
  if (
    condition.consciousness === "unconscious" ||
    condition.bleedingLevel === "extreme" ||
    condition.triage === "critical" ||
    condition.airwayRisk === "critical" ||
    condition.breathingStatus === "severe"
  ) {
    return { label: "Kritiek", className: "critical" };
  }

  if (score >= 16) {
    return { label: "Hoog", className: "high" };
  }

  if (score >= 8) {
    return { label: "Matig", className: "medium" };
  }

  return { label: "Laag", className: "low" };
}

/* =========================================================
   REPORT BUILDING
========================================================= */

function buildReportSummary(formData, priority, departments, steps, actions, items, investigations, followUp) {
  const patientName = formData.patient.name || "Onbekende patiënt";
  const locationText = formData.patient.location ? ` ter hoogte van ${formData.patient.location}` : "";
  const medicText = formData.patient.treatingMedic
    ? `De behandeling werd opgestart door ${formData.patient.treatingMedic}.`
    : "";

  const departmentFilterText = getDepartmentFilterLabel(formData.filter.department);

  const injuryLines = [];

  formData.injuries.forEach((part) => {
    const detailParts = [];

    part.injuries.forEach((injury) => {
      const subParts = [];

      if (injury.wound) {
        subParts.push(getWoundLabel(injury.wound).toLowerCase());
      }

      if (injury.severity) {
        subParts.push(`ernst: ${getSeverityLabel(injury.severity).toLowerCase()}`);
      }

      if (injury.note) {
        subParts.push(injury.note);
      }

      if (subParts.length) {
        detailParts.push(subParts.join(", "));
      }
    });

    if (part.fracture) {
      detailParts.push("vermoeden van fractuur");
    }

    if (part.needsImaging) {
      detailParts.push("beeldvorming te overwegen");
    }

    if (detailParts.length) {
      injuryLines.push(`${part.label}: ${detailParts.join(" | ")}`);
    }
  });

  const injuriesParagraph = injuryLines.length
    ? `Vastgestelde letsels: ${injuryLines.join(" || ")}.`
    : "Er werden geen specifieke letsels geregistreerd in de tool.";

  const conditionParagraph = [
    `${patientName} werd beoordeeld${locationText}.`,
    `Patiënt was ${APP_CONFIG.textMap.consciousness[formData.condition.consciousness]}, had ${APP_CONFIG.textMap.pulse[formData.condition.pulse]}, ${APP_CONFIG.textMap.temperature[formData.condition.temperature]}, ${APP_CONFIG.textMap.painLevel[formData.condition.painLevel]} en ${APP_CONFIG.textMap.bleedingLevel[formData.condition.bleedingLevel]}.`,
    `Luchtweg: ${APP_CONFIG.textMap.airwayRisk[formData.condition.airwayRisk]}.`,
    `Ademhaling: ${APP_CONFIG.textMap.breathingStatus[formData.condition.breathingStatus]}.`,
    `Triage-inschatting: ${APP_CONFIG.textMap.triage[formData.condition.triage]}.`
  ].join(" ");

  const filterParagraph = `Actieve weergave/filter: ${departmentFilterText}.`;

  const departmentText = departments.length
    ? `Betrokken afdelingen: ${departments.join(", ")}.`
    : "";

  const stepsText = steps.length
    ? `Voorstel stappenplan: ${steps.join("; ")}.`
    : "";

  const actionsText = actions.length
    ? `Aanbevolen handelingen: ${actions.join("; ")}.`
    : "";

  const itemsText = items.length
    ? `Aanbevolen hulpmiddelen/items: ${items.map((item) => APP_CONFIG.itemLabels[item.code] || item.code).join(", ")}.`
    : "";

  const investigationsText = investigations.length
    ? `Aanbevolen onderzoeken/beeldvorming: ${investigations.join("; ")}.`
    : "";

  const followUpText = followUp.length
    ? `Nazorg/opvolging: ${followUp.join("; ")}.`
    : "";

  const notesText = formData.condition.generalNotes
    ? `Algemene observaties: ${formData.condition.generalNotes}.`
    : "";

  return [
    `Prioriteit van zorg: ${priority.label}.`,
    filterParagraph,
    conditionParagraph,
    injuriesParagraph,
    departmentText,
    stepsText,
    actionsText,
    itemsText,
    investigationsText,
    followUpText,
    notesText,
    medicText
  ].filter(Boolean).join("\n\n");
}

function getWoundLabel(woundValue) {
  const found = APP_CONFIG.woundOptions.find((option) => option.value === woundValue);
  return found ? found.label : woundValue;
}

function getSeverityLabel(severityValue) {
  const found = APP_CONFIG.selectOptions.injurySeverity.find((option) => option.value === severityValue);
  return found ? found.label : severityValue;
}

function getDepartmentFilterLabel(filterValue) {
  const found = APP_CONFIG.selectOptions.departmentFilter.find((option) => option.value === filterValue);
  return found ? found.label : filterValue;
}

/* =========================================================
   RENDER RESULT
========================================================= */

function renderResult(result) {
  priorityBadge.className = `priority-badge ${result.priority.className}`;
  priorityBadge.textContent = result.priority.label;

  renderTagList(departmentTags, result.departments, "Nog geen advies");
  renderList(stepsList, result.steps, "Geen stappenplan gegenereerd.");
  renderList(actionsList, result.actions, "Geen specifieke handelingen.");
  renderList(itemsList, result.items, "Geen specifieke items.");
  renderList(investigationsList, result.investigations, "Geen onderzoeken voorgesteld.");
  renderList(followUpList, result.followUp, "Geen nazorg voorgesteld.");
  renderList(warningsList, result.warnings, "Geen extra aandachtspunten.");

  renderCosts(result.costs);
  reportSummary.value = result.summary;
}

function renderCosts(costs) {
  costInjuries.textContent = formatCurrency(costs.injuries);
  costItems.textContent = formatCurrency(costs.items);
  costInvestigations.textContent = formatCurrency(costs.investigations);
  costTotal.textContent = formatCurrency(costs.total);

  costBreakdownList.innerHTML = "";

  if (!costs.breakdown.length) {
    const li = document.createElement("li");
    li.textContent = "Nog geen kostenraming.";
    costBreakdownList.appendChild(li);
    return;
  }

  costs.breakdown.forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = `${entry.label}: ${formatCurrency(entry.amount)}`;
    costBreakdownList.appendChild(li);
  });
}

function formatCurrency(amount) {
  return `€ ${Number(amount || 0).toLocaleString("nl-BE")}`;
}

function renderList(target, items, emptyText) {
  target.innerHTML = "";

  if (!items || items.length === 0) {
    const li = document.createElement("li");
    li.textContent = emptyText;
    target.appendChild(li);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    target.appendChild(li);
  });
}

function renderTagList(target, tags, emptyText) {
  target.innerHTML = "";

  if (!tags || tags.length === 0) {
    const span = document.createElement("span");
    span.className = "tag";
    span.textContent = emptyText;
    target.appendChild(span);
    return;
  }

  tags.forEach((tagText) => {
    const span = document.createElement("span");
    span.className = "tag";
    span.textContent = tagText;
    target.appendChild(span);
  });
}

/* =========================================================
   RESET / COPY
========================================================= */

function handleReset() {
  document.querySelectorAll("input, select, textarea").forEach((el) => {
    if (el.type === "checkbox") {
      el.checked = false;
    } else if (el.tagName === "SELECT") {
      el.selectedIndex = 0;
    } else if (!el.readOnly) {
      el.value = "";
    }
  });

  renderBodyPartInputs();

  priorityBadge.className = "priority-badge neutral";
  priorityBadge.textContent = "Nog niet berekend";

  renderTagList(departmentTags, [], "Nog geen advies");
  renderList(stepsList, [], "Vul de gegevens in en genereer het behandeladvies.");
  renderList(actionsList, [], "Vul de gegevens in en genereer het behandeladvies.");
  renderList(itemsList, [], "Nog geen items geselecteerd.");
  renderList(investigationsList, [], "Nog geen onderzoeken voorgesteld.");
  renderList(followUpList, [], "Nog geen nazorg voorgesteld.");
  renderList(warningsList, [], "Nog geen aandachtspunten.");
  renderCosts({ injuries: 0, items: 0, investigations: 0, total: 0, breakdown: [] });

  reportSummary.value = "";
}

function handleCopySummary() {
  const text = reportSummary.value.trim();

  if (!text) {
    alert("Er is nog geen samenvatting om te kopiëren.");
    return;
  }

  navigator.clipboard.writeText(text)
    .then(() => {
      alert("Samenvatting gekopieerd.");
    })
    .catch(() => {
      alert("Kopiëren is niet gelukt.");
    });
}

/* =========================================================
   HELPERS
========================================================= */

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}