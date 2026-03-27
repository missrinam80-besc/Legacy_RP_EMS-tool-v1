/**
 * EMS Behandeltool v2
 * -------------------
 * Uitbreidingen t.o.v. v1:
 * - meerdere letsels per lichaamsdeel
 * - ernst per letsel
 * - onderzoeken / beeldvorming
 * - afdelingen-tags
 * - stappenplan
 * - uitgebreidere samenvatting
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
const warningsList = document.getElementById("warningsList");
const reportSummary = document.getElementById("reportSummary");

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
  const departments = new Set();

  let severityScore = 0;
  let hasAnyInjury = false;

  severityScore += getGeneralSeverityScore(formData.condition);

  applyGeneralConditionLogic(formData.condition, {
    uniqueSteps,
    uniqueActions,
    uniqueItems,
    uniqueWarnings,
    uniqueInvestigations,
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
      severityScore += (Number(rule.severity || 0) * severityMultiplier);

      (rule.steps || []).forEach((step) => uniqueSteps.add(`${part.label}: ${step}`));
      (rule.actions || []).forEach((action) => uniqueActions.add(`${part.label}: ${action}`));
      (rule.items || []).forEach((item) => uniqueItems.add(item));
      (rule.warnings || []).forEach((warning) => uniqueWarnings.add(`${part.label}: ${warning}`));
      (rule.investigations || []).forEach((investigation) => uniqueInvestigations.add(`${part.label}: ${investigation}`));
      (rule.departments || []).forEach((department) => departments.add(department));

      applySeveritySpecificLogic(part, injury, {
        uniqueSteps,
        uniqueActions,
        uniqueItems,
        uniqueWarnings,
        uniqueInvestigations,
        departments
      });
    });

    if (part.fracture) {
      severityScore += 2.5;
      addFractureAdvice(part, {
        uniqueSteps,
        uniqueActions,
        uniqueItems,
        uniqueWarnings,
        uniqueInvestigations,
        departments
      });
    }

    if (part.needsImaging) {
      addImagingAdvice(part, uniqueInvestigations, departments);
    }
  });

  if (!hasAnyInjury) {
    uniqueWarnings.add("Geen specifieke letsels geselecteerd");
    uniqueActions.add("Voer klinische beoordeling uit en vul letsels aan indien nodig");
    uniqueSteps.add("Start met algemene evaluatie van patiënt en letsels");
  }

  const priority = determinePriority(severityScore, formData.condition);
  const summary = buildReportSummary(
    formData,
    priority,
    uniqueSteps,
    uniqueActions,
    uniqueItems,
    uniqueInvestigations,
    departments
  );

  return {
    priority,
    departments: Array.from(departments),
    steps: Array.from(uniqueSteps),
    actions: Array.from(uniqueActions),
    items: Array.from(uniqueItems).map((item) => APP_CONFIG.itemLabels[item] || item),
    investigations: Array.from(uniqueInvestigations),
    warnings: Array.from(uniqueWarnings),
    summary
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
    departments
  } = ctx;

  departments.add("Spoed");

  if (condition.airwayRisk === "at-risk" || condition.airwayRisk === "critical") {
    uniqueSteps.add("Beoordeel en beveilig de luchtweg");
    uniqueActions.add("Voer onmiddellijke controle van de luchtweg uit");
    uniqueWarnings.add("Luchtweg kan bedreigd zijn");
    departments.add("Ambulance");
    departments.add("Spoed");
  }

  if (condition.airwayRisk === "critical") {
    uniqueWarnings.add("Kritisch luchtwegprobleem vraagt onmiddellijke interventie");
  }

  if (condition.breathingStatus === "disturbed" || condition.breathingStatus === "severe") {
    uniqueSteps.add("Beoordeel ademhaling en zuurstofstatus");
    uniqueActions.add("Controleer ademhaling en ondersteun waar nodig");
    uniqueWarnings.add("Verstoorde ademhaling aanwezig");
    departments.add("Ambulance");
    departments.add("Spoed");
  }

  if (condition.breathingStatus === "severe") {
    uniqueWarnings.add("Ernstige ademhalingsproblemen vereisen snelle stabilisatie");
  }

  if (condition.consciousness === "unconscious") {
    uniqueSteps.add("Start ABC-beoordeling met prioriteit");
    uniqueActions.add("Beveilig de luchtweg en voer onmiddellijke vitale beoordeling uit");
    uniqueWarnings.add("Bewusteloze patiënt vereist onmiddellijke opvolging");
    departments.add("Ambulance");
    departments.add("Spoed");
  }

  if (["high", "extreme"].includes(condition.bleedingLevel)) {
    uniqueSteps.add("Stop actieve bloeding als eerste behandelstap");
    uniqueActions.add("Controleer en stop actieve bloeding als prioriteit");
    uniqueItems.add("tourniquet");
    uniqueItems.add("quick_clot");
    uniqueWarnings.add("Ernstig bloedverlies vereist snelle stabilisatie");
    departments.add("Ambulance");
    departments.add("Spoed");
  }

  if (condition.bleedingLevel === "extreme") {
    uniqueSteps.add("Start volume- of bloedresuscitatie indien klinisch nodig");
    uniqueItems.add("blood500ml");
    uniqueItems.add("saline500ml");
    uniqueActions.add("Voorzie volume- of bloedresuscitatie indien nodig");
    uniqueInvestigations.add("Controle van circulatie en bloedverlies");
    departments.add("Spoed");
  }

  if (["high", "extreme"].includes(condition.painLevel)) {
    uniqueActions.add("Voorzie adequate pijnstilling");
    uniqueItems.add("painkillers");
    uniqueItems.add("morphine");
    departments.add("Spoed");
  }

  if (condition.temperature === "elevated") {
    uniqueWarnings.add("Controleer oorzaak van verhoogde temperatuur");
  }

  if (condition.pulse === "weak") {
    uniqueWarnings.add("Zwakke pols kan wijzen op instabiliteit of bloedverlies");
  }

  if (condition.triage === "critical") {
    uniqueWarnings.add("Patiënt is als kritiek ingeschat");
    uniqueActions.add("Prioriteer spoedzorg en snelle overdracht");
    uniqueSteps.add("Bereid snelle overdracht of verdere interventie voor");
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
    uniqueItems,
    uniqueWarnings,
    uniqueInvestigations,
    departments
  } = ctx;

  if (injury.severity === "severe" || injury.severity === "critical") {
    uniqueWarnings.add(`${part.label}: ernstig letsel vraagt verhoogde opvolging`);
    uniqueActions.add(`${part.label}: monitor evolutie van het letsel nauwgezet`);
    departments.add("Spoed");
  }

  if (injury.severity === "critical") {
    uniqueSteps.add(`${part.label}: behandel dit letsel als prioritaire interventie`);
  }

  if (part.fractureZone === "leg" && ["mediumvelocitywound", "highvelocitywound", "velocitywound", "crush"].includes(injury.wound)) {
    uniqueWarnings.add(`${part.label}: verhoogd risico op mobiliteitsproblemen of instabiliteit`);
  }

  if (part.fractureZone === "arm" && ["cut", "laceration", "puncturewound", "velocitywound"].includes(injury.wound)) {
    uniqueWarnings.add(`${part.label}: controleer functie en bewegingsbeperking van de arm`);
  }

  if (part.key === "head" && ["burn", "crush", "highvelocitywound", "velocitywound"].includes(injury.wound)) {
    uniqueInvestigations.add(`${part.label}: overweeg CT of neurologische evaluatie`);
    departments.add("Spoed");
  }

  if (part.key === "torso" && ["puncturewound", "velocitywound", "highvelocitywound", "crush"].includes(injury.wound)) {
    uniqueWarnings.add(`${part.label}: risico op intern letsel`);
    uniqueInvestigations.add(`${part.label}: overweeg beeldvorming bij romptrauma`);
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
    departments
  } = ctx;

  uniqueSteps.add(`${part.label}: immobiliseer het getroffen lichaamsdeel`);
  uniqueActions.add(`${part.label}: immobiliseer en beperk beweging`);
  uniqueWarnings.add(`${part.label}: vermoeden van fractuur, verdere evaluatie aanbevolen`);
  uniqueInvestigations.add(`${part.label}: RX aanbevolen bij vermoeden van fractuur`);

  departments.add("Spoed");

  switch (part.fractureZone) {
    case "neck":
      uniqueItems.add("neckbrace");
      uniqueActions.add(`${part.label}: stabiliseer hoofd/nek en beperk beweging`);
      uniqueWarnings.add(`${part.label}: overweeg beeldvorming bij nek- of hoofdletsel`);
      uniqueInvestigations.add(`${part.label}: CT of RX overwegen afhankelijk van context`);
      departments.add("Ambulance");
      break;

    case "arm":
      uniqueItems.add("armsplint");
      uniqueActions.add(`${part.label}: voorzie armspalk`);
      uniqueWarnings.add(`${part.label}: armfractuur kan mobiliteit en functie beperken`);
      break;

    case "leg":
      uniqueItems.add("legsplint");
      uniqueActions.add(`${part.label}: voorzie beenspalk`);
      uniqueWarnings.add(`${part.label}: beenfractuur kan instabiliteit en manken veroorzaken`);
      break;

    case "torso":
      uniqueActions.add(`${part.label}: observeer nauw op intern letsel of bijkomende schade`);
      uniqueWarnings.add(`${part.label}: romptrauma vraagt extra waakzaamheid`);
      uniqueInvestigations.add(`${part.label}: overweeg verdere beeldvorming`);
      departments.add("Chirurgie");
      break;
  }
}

function addImagingAdvice(part, investigationsSet, departments) {
  investigationsSet.add(`${part.label}: beeldvorming overwegen op basis van klinisch beeld`);
  departments.add("Spoed");

  if (part.key === "head" || part.key === "torso") {
    departments.add("Chirurgie");
  }
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

function buildReportSummary(formData, priority, stepsSet, actionsSet, itemsSet, investigationsSet, departmentsSet) {
  const patientName = formData.patient.name || "Onbekende patiënt";
  const locationText = formData.patient.location ? ` ter hoogte van ${formData.patient.location}` : "";
  const medicText = formData.patient.treatingMedic
    ? `De behandeling werd opgestart door ${formData.patient.treatingMedic}.`
    : "";

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

  const departmentText = departmentsSet.size
    ? `Betrokken afdelingen: ${Array.from(departmentsSet).join(", ")}.`
    : "";

  const stepsText = stepsSet.size
    ? `Voorstel stappenplan: ${Array.from(stepsSet).join("; ")}.`
    : "";

  const actionsText = actionsSet.size
    ? `Aanbevolen handelingen: ${Array.from(actionsSet).join("; ")}.`
    : "";

  const itemsText = itemsSet.size
    ? `Aanbevolen hulpmiddelen/items: ${Array.from(itemsSet).map((item) => APP_CONFIG.itemLabels[item] || item).join(", ")}.`
    : "";

  const investigationsText = investigationsSet.size
    ? `Aanbevolen onderzoeken/beeldvorming: ${Array.from(investigationsSet).join("; ")}.`
    : "";

  const notesText = formData.condition.generalNotes
    ? `Algemene observaties: ${formData.condition.generalNotes}.`
    : "";

  return [
    `Prioriteit van zorg: ${priority.label}.`,
    conditionParagraph,
    injuriesParagraph,
    departmentText,
    stepsText,
    actionsText,
    itemsText,
    investigationsText,
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
  renderList(warningsList, result.warnings, "Geen extra aandachtspunten.");

  reportSummary.value = result.summary;
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
  renderList(warningsList, [], "Nog geen aandachtspunten.");

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