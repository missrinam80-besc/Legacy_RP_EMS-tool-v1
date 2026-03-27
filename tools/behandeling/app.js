/**
 * EMS Behandeltool v1
 * -------------------
 * Deze versie werkt met een externe config.json zodat:
 * - labels
 * - keuzelijsten
 * - lichaamsdelen
 * - wondtypes
 * - itemlabels
 * - behandellogica
 * centraal aanpasbaar zijn zonder de app-logica te wijzigen.
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
const actionsList = document.getElementById("actionsList");
const itemsList = document.getElementById("itemsList");
const warningsList = document.getElementById("warningsList");
const reportSummary = document.getElementById("reportSummary");

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
}

function renderOptions(selectId, options) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = options
    .map((option) => `<option value="${escapeAttr(option.value)}">${escapeHtml(option.label)}</option>`)
    .join("");
}

/* =========================================================
   RENDER BODY PARTS
========================================================= */

function renderBodyPartInputs() {
  bodypartsContainer.innerHTML = "";

  APP_CONFIG.bodyParts.forEach((part) => {
    const woundOptionsHtml = APP_CONFIG.woundOptions
      .map((option) => `<option value="${escapeAttr(option.value)}">${escapeHtml(option.label)}</option>`)
      .join("");

    const html = `
      <div class="bodypart-card" data-bodypart="${escapeAttr(part.key)}">
        <h3 class="bodypart-title">${escapeHtml(part.label)}</h3>

        <div class="grid-2">
          <div class="form-group">
            <label for="wound-${escapeAttr(part.key)}">Wondtype</label>
            <select id="wound-${escapeAttr(part.key)}" data-role="wound">
              ${woundOptionsHtml}
            </select>
          </div>

          <div class="form-group">
            <label for="notes-${escapeAttr(part.key)}">Opmerking letsel</label>
            <input
              type="text"
              id="notes-${escapeAttr(part.key)}"
              data-role="notes"
              placeholder="Bijv. diepe wond, instabiele arm, zwelling..."
            />
          </div>
        </div>

        <div class="checkbox-row">
          <input type="checkbox" id="fracture-${escapeAttr(part.key)}" data-role="fracture" />
          <label for="fracture-${escapeAttr(part.key)}">Vermoeden van breuk / fractuur</label>
        </div>
      </div>
    `;

    bodypartsContainer.insertAdjacentHTML("beforeend", html);
  });
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
      generalNotes: valueOf("generalNotes")
    },
    injuries: APP_CONFIG.bodyParts.map((part) => ({
      key: part.key,
      label: part.label,
      fractureZone: part.fractureZone,
      wound: valueOf(`wound-${part.key}`),
      notes: valueOf(`notes-${part.key}`),
      fracture: checkedOf(`fracture-${part.key}`)
    }))
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
  const uniqueActions = new Set();
  const uniqueItems = new Set();
  const uniqueWarnings = new Set();

  let severityScore = 0;
  let hasAnyInjury = false;

  severityScore += getGeneralSeverityScore(formData.condition);

  if (formData.condition.consciousness === "unconscious") {
    uniqueActions.add("Beveilig de luchtweg en voer onmiddellijke vitale beoordeling uit");
    uniqueWarnings.add("Bewusteloze patiënt vereist onmiddellijke opvolging");
  }

  if (["high", "extreme"].includes(formData.condition.bleedingLevel)) {
    uniqueActions.add("Controleer en stop actieve bloeding als prioriteit");
    uniqueItems.add("tourniquet");
    uniqueItems.add("quick_clot");
    uniqueWarnings.add("Ernstig bloedverlies vereist snelle stabilisatie");
  }

  if (formData.condition.bleedingLevel === "extreme") {
    uniqueItems.add("blood500ml");
    uniqueItems.add("saline500ml");
    uniqueActions.add("Voorzie volume- of bloedresuscitatie indien nodig");
  }

  if (["high", "extreme"].includes(formData.condition.painLevel)) {
    uniqueActions.add("Voorzie adequate pijnstilling");
    uniqueItems.add("painkillers");
    uniqueItems.add("morphine");
  }

  if (formData.condition.temperature === "elevated") {
    uniqueWarnings.add("Controleer oorzaak van verhoogde temperatuur");
  }

  if (formData.condition.pulse === "weak") {
    uniqueWarnings.add("Zwakke pols kan wijzen op instabiliteit of bloedverlies");
  }

  if (formData.condition.triage === "critical") {
    uniqueWarnings.add("Patiënt is als kritiek ingeschat");
    uniqueActions.add("Prioriteer spoedzorg en snelle overdracht");
  }

  formData.injuries.forEach((injury) => {
    if (injury.wound) {
      hasAnyInjury = true;

      const rule = APP_CONFIG.woundRules[injury.wound];
      if (rule) {
        severityScore += Number(rule.severity || 0);

        (rule.actions || []).forEach((action) => {
          uniqueActions.add(`${injury.label}: ${action}`);
        });

        (rule.items || []).forEach((item) => {
          uniqueItems.add(item);
        });

        (rule.warnings || []).forEach((warning) => {
          uniqueWarnings.add(`${injury.label}: ${warning}`);
        });
      }
    }

    if (injury.fracture) {
      hasAnyInjury = true;
      severityScore += 2;
      addFractureAdvice(injury, uniqueActions, uniqueItems, uniqueWarnings);
    }

    if (injury.notes) {
      uniqueWarnings.add(`${injury.label}: extra observatie - ${injury.notes}`);
    }
  });

  if (!hasAnyInjury) {
    uniqueWarnings.add("Geen specifieke letsels geselecteerd");
    uniqueActions.add("Voer klinische beoordeling uit en vul letsels aan indien nodig");
  }

  const priority = determinePriority(severityScore, formData.condition);
  const summary = buildReportSummary(formData, priority, uniqueActions, uniqueItems);

  return {
    priority,
    actions: Array.from(uniqueActions),
    items: Array.from(uniqueItems).map((item) => APP_CONFIG.itemLabels[item] || item),
    warnings: Array.from(uniqueWarnings),
    summary
  };
}

function getGeneralSeverityScore(condition) {
  let score = 0;

  if (condition.consciousness === "reduced") score += 2;
  if (condition.consciousness === "unconscious") score += 5;

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

function addFractureAdvice(injury, actionsSet, itemsSet, warningsSet) {
  actionsSet.add(`${injury.label}: immobiliseer het getroffen lichaamsdeel`);
  warningsSet.add(`${injury.label}: vermoeden van fractuur, verdere evaluatie aanbevolen`);

  switch (injury.fractureZone) {
    case "neck":
      itemsSet.add("neckbrace");
      actionsSet.add(`${injury.label}: stabiliseer hoofd/nek en beperk beweging`);
      warningsSet.add(`${injury.label}: overweeg beeldvorming bij nek- of hoofdletsel`);
      break;

    case "arm":
      itemsSet.add("armsplint");
      actionsSet.add(`${injury.label}: voorzie armspalk`);
      warningsSet.add(`${injury.label}: armfractuur kan mobiliteit en functie beperken`);
      break;

    case "leg":
      itemsSet.add("legsplint");
      actionsSet.add(`${injury.label}: voorzie beenspalk`);
      warningsSet.add(`${injury.label}: beenfractuur kan instabiliteit en manken veroorzaken`);
      break;

    case "torso":
      actionsSet.add(`${injury.label}: observeer nauw op intern letsel of bijkomende schade`);
      warningsSet.add(`${injury.label}: romptrauma vraagt extra waakzaamheid`);
      break;
  }
}

function determinePriority(score, condition) {
  if (
    condition.consciousness === "unconscious" ||
    condition.bleedingLevel === "extreme" ||
    condition.triage === "critical"
  ) {
    return { label: "Kritiek", className: "critical" };
  }

  if (score >= 12) {
    return { label: "Hoog", className: "high" };
  }

  if (score >= 6) {
    return { label: "Matig", className: "medium" };
  }

  return { label: "Laag", className: "low" };
}

/* =========================================================
   REPORT BUILDING
========================================================= */

function buildReportSummary(formData, priority, actionsSet, itemsSet) {
  const patientName = formData.patient.name || "Onbekende patiënt";
  const locationText = formData.patient.location ? ` ter hoogte van ${formData.patient.location}` : "";
  const medicText = formData.patient.treatingMedic
    ? `De behandeling werd opgestart door ${formData.patient.treatingMedic}.`
    : "";

  const selectedInjuries = formData.injuries
    .filter((injury) => injury.wound || injury.fracture)
    .map((injury) => {
      const parts = [];

      if (injury.wound) {
        parts.push(getWoundLabel(injury.wound).toLowerCase());
      }

      if (injury.fracture) {
        parts.push("vermoeden van fractuur");
      }

      if (injury.notes) {
        parts.push(injury.notes);
      }

      return `${injury.label}: ${parts.join(", ")}`;
    });

  const injuriesParagraph = selectedInjuries.length
    ? `Vastgestelde letsels: ${selectedInjuries.join(" | ")}.`
    : "Er werden geen specifieke letsels geregistreerd in de tool.";

  const conditionParagraph = [
    `${patientName} werd beoordeeld${locationText}.`,
    `Patiënt was ${APP_CONFIG.textMap.consciousness[formData.condition.consciousness]}, had ${APP_CONFIG.textMap.pulse[formData.condition.pulse]}, ${APP_CONFIG.textMap.temperature[formData.condition.temperature]}, ${APP_CONFIG.textMap.painLevel[formData.condition.painLevel]} en ${APP_CONFIG.textMap.bleedingLevel[formData.condition.bleedingLevel]}.`,
    `Triage-inschatting: ${APP_CONFIG.textMap.triage[formData.condition.triage]}.`
  ].join(" ");

  const actionsText = actionsSet.size
    ? `Aanbevolen handelingen: ${Array.from(actionsSet).join("; ")}.`
    : "Geen specifieke handelingen voorgesteld.";

  const itemsText = itemsSet.size
    ? `Aanbevolen hulpmiddelen/items: ${Array.from(itemsSet).map((item) => APP_CONFIG.itemLabels[item] || item).join(", ")}.`
    : "Geen specifieke items voorgesteld.";

  const notesText = formData.condition.generalNotes
    ? `Algemene observaties: ${formData.condition.generalNotes}.`
    : "";

  return [
    `Prioriteit van zorg: ${priority.label}.`,
    conditionParagraph,
    injuriesParagraph,
    actionsText,
    itemsText,
    notesText,
    medicText
  ].filter(Boolean).join("\n\n");
}

function getWoundLabel(woundValue) {
  const found = APP_CONFIG.woundOptions.find((option) => option.value === woundValue);
  return found ? found.label : woundValue;
}

/* =========================================================
   RENDER RESULT
========================================================= */

function renderResult(result) {
  priorityBadge.className = `priority-badge ${result.priority.className}`;
  priorityBadge.textContent = result.priority.label;

  renderList(actionsList, result.actions, "Geen specifieke handelingen.");
  renderList(itemsList, result.items, "Geen specifieke items.");
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

  priorityBadge.className = "priority-badge neutral";
  priorityBadge.textContent = "Nog niet berekend";

  renderList(actionsList, [], "Vul de gegevens in en genereer het behandeladvies.");
  renderList(itemsList, [], "Nog geen items geselecteerd.");
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