let APP_CONFIG = null;


const CENTRAL_ITEM_ALIAS_MAP = {
  morphine: ["morphine", "med_morphine"],
  epinephrine: ["epinephrine", "med_epinephrine", "adrenaline"],
  propofol: ["propofol", "med_propofol"],
  tourniquet: ["tourniquet", "tool_tourniquet"],
  field_dressing: ["field_dressing", "sup_bandage", "bandage", "verband"],
  elastic_bandage: ["elastic_bandage", "elastisch_verband"],
  quick_clot: ["quick_clot"],
  packing_bandage: ["packing_bandage"],
  sewing_kit: ["sewing_kit", "kit_suturing", "hechtset"],
  painkillers: ["painkillers", "analgesie", "painkiller"],
  morphine: ["morphine", "med_morphine"],
  blood250ml: ["blood250ml", "blood_250", "bloed_250"],
  blood500ml: ["blood500ml", "blood_500", "bloed_500"],
  saline250ml: ["saline250ml", "saline_250"],
  saline500ml: ["saline500ml", "saline_500"],
  neckbrace: ["neckbrace", "brace_nek"],
  armsplint: ["armsplint", "splint_arm"],
  legsplint: ["legsplint", "splint_leg", "splint"],
  armcast: ["armcast", "gips_arm"],
  legcast: ["legcast", "gips_leg"],
  crutch: ["crutch", "tool_krukken", "krukken"],
  cane: ["cane", "wandelstok"],
  wheelchair: ["wheelchair", "rolstoel"]
};

const NL_TO_UI_DEPARTMENT = {
  algemeen: "Spoed/Ambulance",
  spoed: "Spoed/Ambulance",
  ambulance: "Spoed/Ambulance",
  chirurgie: "Chirurgie",
  psychologie: "Psychologie",
  "ortho-revalidatie": "Ortho/Revalidatie",
  forensisch: "Forensisch",
  labo: "Labo"
};

const UI_TO_NL_DEPARTMENT = {
  "Spoed/Ambulance": "spoed",
  Chirurgie: "chirurgie",
  Psychologie: "psychologie",
  "Ortho/Revalidatie": "ortho-revalidatie",
  Forensisch: "forensisch",
  Labo: "labo"
};

const CENTRAL_SEVERITY_MAP = {
  licht: { select: "light", score: 1 },
  matig: { select: "moderate", score: 2 },
  ernstig: { select: "severe", score: 4 },
  kritiek: { select: "critical", score: 6 },
  laag: { select: "light", score: 1 },
  hoog: { select: "severe", score: 4 },
  extreem: { select: "critical", score: 6 }
};

const RULE_VALUE_TRANSLATIONS = {
  consciousness: {
    buiten_bewustzijn: "unconscious",
    verminderd: "reduced",
    bij_bewustzijn: "alert"
  },
  bloodloss: {
    laag: "light",
    matig: "moderate",
    ernstig: "high",
    extreem: "extreme",
    geen: "none"
  },
  pain: {
    licht: "light",
    matig: "moderate",
    hoog: "high",
    extreem: "extreme"
  },
  pulse: {
    zwak: "weak",
    snel: "fast",
    traag: "slow",
    normaal: "normal"
  },
  triage: {
    kritiek: "critical",
    urgent: "urgent",
    niet_urgent: "non-urgent",
    geen: "none"
  }
};



/* =========================================================
   DOM
========================================================= */

const bodypartsContainer = document.getElementById("bodypartsContainer");
const generateBtn = document.getElementById("generateBtn");
const resetBtn = document.getElementById("resetBtn");
const copyReportBtn = document.getElementById("copyReportBtn");

const alertsList = document.getElementById("alertsList");
const priorityBadge = document.getElementById("priorityBadge");
const operationBadge = document.getElementById("operationBadge");
const operationReason = document.getElementById("operationReason");
const clinicalImpressionList = document.getElementById("clinicalImpressionList");
const departmentTags = document.getElementById("departmentTags");
const stepsList = document.getElementById("stepsList");
const actionsList = document.getElementById("actionsList");
const itemsList = document.getElementById("itemsList");

const imagingNoneList = document.getElementById("imagingNoneList");
const imagingRxList = document.getElementById("imagingRxList");
const imagingCtList = document.getElementById("imagingCtList");
const imagingObserveList = document.getElementById("imagingObserveList");

const followUpList = document.getElementById("followUpList");
const closingStatusBadge = document.getElementById("closingStatusBadge");
const closingStatusText = document.getElementById("closingStatusText");
const warningsList = document.getElementById("warningsList");
const reportSummary = document.getElementById("reportSummary");

const costInjuries = document.getElementById("costInjuries");
const costItems = document.getElementById("costItems");
const costInvestigations = document.getElementById("costInvestigations");
const costTotal = document.getElementById("costTotal");
const costBreakdownList = document.getElementById("costBreakdownList");
const costExtras = document.getElementById("costExtras");
const costProfileSelect = document.getElementById("costProfile");
const costDepartmentScope = document.getElementById("costDepartmentScope");
const costProfileHelp = document.getElementById("costProfileHelp");
const extraCostGroups = document.getElementById("extraCostGroups");

let LAST_RESULT = null;

const injuryRowTemplate = document.getElementById("injuryRowTemplate");

const copyReportBtnTop = document.getElementById("copyReportBtnTop");
const resetBtnTop = document.getElementById("resetBtnTop");

/* blocks for filter/compact */
const BLOCKS = {
  alerts: document.getElementById("alertsBlock"),
  priority: document.getElementById("priorityBlock"),
  operation: document.getElementById("operationBlock"),
  clinical: document.getElementById("clinicalBlock"),
  department: document.getElementById("departmentBlock"),
  steps: document.getElementById("stepsBlock"),
  actions: document.getElementById("actionsBlock"),
  items: document.getElementById("itemsBlock"),
  imaging: document.getElementById("imagingBlock"),
  followUp: document.getElementById("followUpBlock"),
  closing: document.getElementById("closingBlock"),
  costs: document.getElementById("costBlock"),
  warnings: document.getElementById("warningsBlock"),
  report: document.getElementById("reportBlock")
};

/* =========================================================
   INIT
========================================================= */

document.addEventListener("DOMContentLoaded", initApp);

async function initApp() {
  try {
    const response = await fetch("config.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Config kon niet geladen worden (${response.status})`);
    }

    APP_CONFIG = await response.json();
    await applyCentralMedicalConfig();

    renderStaticSelects();
    renderBodyPartInputs();
    renderExtraCostGroups();
    bindEvents();
    updateCostProfileHelp();
    applyDisplayMode();
  } catch (error) {
    console.error("Fout bij laden van de behandeltool:", error);
    alert("Fout bij laden van de behandeltool. Controleer config.json en het pad.");
  }
}


async function applyCentralMedicalConfig() {
  const [medicationData, injuriesData, treatmentRulesData, pricesData] = await Promise.all([
    loadCentralType("medication"),
    loadCentralType("injuries"),
    loadCentralType("treatmentRules"),
    loadCentralType("prices")
  ]);

  if (medicationData?.items?.length) {
    mergeCentralMedication(medicationData.items);
  }

  if (injuriesData?.items?.length) {
    mergeCentralInjuries(injuriesData.items);
  }

  if (treatmentRulesData?.items?.length) {
    APP_CONFIG.centralTreatmentRules = treatmentRulesData.items.filter((item) => item.active !== false && item.visibleInOutput !== false);
  } else {
    APP_CONFIG.centralTreatmentRules = [];
  }

  if (pricesData?.items?.length) {
    mergeCentralPrices(pricesData.items);
  }
}

async function loadCentralType(type) {
  try {
    if (window.EMSAdminStore?.get) {
      return await window.EMSAdminStore.get(type);
    }
  } catch (error) {
    console.warn(`[Behandeltool] Centrale ${type}-store niet beschikbaar, fallback wordt gebruikt.`, error);
  }

  const fallbackMap = {
    medication: "../../data/admin/default-medication.json",
    injuries: "../../data/admin/default-injuries.json",
    treatmentRules: "../../data/admin/default-treatment-rules.json",
    prices: "../../data/admin/default-prices.json"
  };

  const path = fallbackMap[type];
  if (!path) return null;

  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn(`[Behandeltool] Fallbackbestand voor ${type} kon niet geladen worden.`, error);
    return null;
  }
}

function mergeCentralMedication(items) {
  const activeItems = items.filter((item) => item.active !== false);

  activeItems.forEach((item) => {
    const code = getCanonicalItemCode(item.id || item.name || item.label);
    APP_CONFIG.itemLabels[code] = item.name || item.label || code;

    if (Number(item.price) > 0) {
      APP_CONFIG.costs.items[code] = Number(item.price);
    }
  });
}

function mergeCentralInjuries(items) {
  const activeItems = items.filter((item) => item.active !== false);
  const grouped = new Map();

  activeItems.forEach((item) => {
    const category = String(item.category || item.id || "").trim().toLowerCase();
    if (!category) return;
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push(item);
  });

  const localLabels = Object.fromEntries((APP_CONFIG.woundOptions || []).map((option) => [option.value, option.label]));
  const woundOptions = [{ value: "", label: "Geen wond" }];
  const woundRules = { ...(APP_CONFIG.woundRules || {}) };

  grouped.forEach((entries, category) => {
    const sorted = entries.slice().sort((a, b) => getCentralSeverityScore(a.severity) - getCentralSeverityScore(b.severity));
    const mostSevere = sorted[sorted.length - 1];
    woundOptions.push({
      value: category,
      label: localLabels[category] || mostSevere.label || prettifyCode(category)
    });

    woundRules[category] = buildCentralWoundRule(category, entries, woundRules[category]);
  });

  APP_CONFIG.woundOptions = dedupeOptions(woundOptions);
  APP_CONFIG.woundRules = woundRules;
}

function mergeCentralPrices(items) {
  const activeItems = items
    .filter((item) => item.active !== false)
    .filter((item) => item.visibleInCalculator !== false);

  const extraGroups = [];

  activeItems.forEach((item) => {
    const amount = Number(item.defaultPrice) || 0;
    if (!amount) return;

    if (item.category === "onderzoek") {
      APP_CONFIG.costs.investigations[getInvestigationCostCode(item)] = amount;
      return;
    }

    const uiDepartment = NL_TO_UI_DEPARTMENT[String(item.department || "").trim().toLowerCase()];
    if (!uiDepartment) return;

    const groupCode = String(item.department || "algemeen").trim().toLowerCase();
    let group = extraGroups.find((entry) => entry.code === groupCode);
    if (!group) {
      group = {
        code: groupCode,
        label: prettifyDepartmentLabel(groupCode),
        departments: [uiDepartment],
        profiles: buildProfilesFromDocumentTypes(item.documentTypes),
        items: []
      };
      extraGroups.push(group);
    }

    group.items.push({
      code: item.code || item.id,
      label: item.label,
      amount
    });
  });

  if (extraGroups.length) {
    APP_CONFIG.extraCostGroups = mergeExtraCostGroups(APP_CONFIG.extraCostGroups || [], extraGroups);
  }
}

function buildCentralWoundRule(category, entries, existingRule = {}) {
  const maxSeverity = entries.reduce((maxValue, item) => Math.max(maxValue, getCentralSeverityScore(item.severity)), 1);
  const defaultTreatments = entries.flatMap((item) => splitPipe(item.defaultTreatments).map(getCanonicalItemCode));
  const bleedingImpacts = entries.map((item) => String(item.bleedingImpact || "").toLowerCase());
  const painImpacts = entries.map((item) => String(item.painImpact || "").toLowerCase());
  const suturingNeeded = entries.some((item) => item.needsSuturing === true || String(item.needsSuturing).toLowerCase() === "true");
  const highRiskFracture = entries.some((item) => ["matig", "hoog"].includes(String(item.fractureRisk || "").toLowerCase()));
  const severeCategory = ["gunshot", "avulsion", "crush"].includes(category);

  const actions = new Set(existingRule.actions || []);
  const steps = new Set(existingRule.steps || []);
  const warnings = new Set(existingRule.warnings || []);
  const followUp = new Set(existingRule.followUp || []);
  const investigations = new Set(existingRule.investigations || []);
  const items = new Set([...(existingRule.items || []), ...defaultTreatments.filter(Boolean)]);
  const departments = new Set(existingRule.departments || ["Spoed/Ambulance"]);

  steps.add("Controleer en stabiliseer het letsel");
  actions.add(`Behandel ${existingRule.label || prettifyCode(category).toLowerCase()} volgens ernst en toestand`);

  if (bleedingImpacts.includes("hoog") || bleedingImpacts.includes("extreem")) {
    steps.add("Stop actieve bloeding als prioriteit");
    warnings.add("Actieve bloeding kan snelle stabilisatie vereisen");
    items.add("quick_clot");
  }

  if (painImpacts.includes("hoog") || painImpacts.includes("extreem")) {
    actions.add("Voorzie passende pijnstilling indien toestand dit toelaat");
    items.add("morphine");
  }

  if (suturingNeeded) {
    actions.add("Beoordeel nood aan wondsluiting of hechting");
    followUp.add("Controleer wondsluiting en verdere genezing");
    items.add("sewing_kit");
  }

  if (highRiskFracture) {
    actions.add("Overweeg stabilisatie en bijkomende beeldvorming");
    investigations.add("RX van betrokken zone");
    departments.add("Spoed/Ambulance");
  }

  if (severeCategory || maxSeverity >= 4) {
    departments.add("Chirurgie");
    warnings.add("Complex letsel kan chirurgische opvolging vereisen");
  }

  return {
    severity: Math.max(Number(existingRule.severity || 0), maxSeverity),
    steps: Array.from(steps),
    actions: Array.from(actions),
    items: Array.from(items),
    warnings: Array.from(warnings),
    investigations: Array.from(investigations),
    followUp: Array.from(followUp),
    departments: Array.from(departments)
  };
}

function mergeExtraCostGroups(existingGroups, centralGroups) {
  const map = new Map();

  [...existingGroups, ...centralGroups].forEach((group) => {
    if (!group?.code) return;
    if (!map.has(group.code)) {
      map.set(group.code, {
        code: group.code,
        label: group.label,
        departments: Array.from(new Set(group.departments || [])),
        profiles: Array.from(new Set(group.profiles || [])),
        items: []
      });
    }

    const current = map.get(group.code);
    current.label = current.label || group.label;
    current.departments = Array.from(new Set([...(current.departments || []), ...(group.departments || [])]));
    current.profiles = Array.from(new Set([...(current.profiles || []), ...(group.profiles || [])]));

    (group.items || []).forEach((item) => {
      if (!current.items.find((entry) => entry.code === item.code)) {
        current.items.push(item);
      }
    });
  });

  return Array.from(map.values());
}

function applyCentralTreatmentRules(formData, ctx) {
  const rules = Array.isArray(APP_CONFIG.centralTreatmentRules) ? APP_CONFIG.centralTreatmentRules : [];
  if (!rules.length) return;

  const selectedDepartment = formData.filter.department;
  rules.forEach((rule) => {
    const uiDepartment = NL_TO_UI_DEPARTMENT[String(rule.department || "").trim().toLowerCase()] || "Spoed/Ambulance";
    if (selectedDepartment !== "all" && uiDepartment !== selectedDepartment) return;
    if (!ruleMatchesForm(rule, formData)) return;

    const departments = [uiDepartment];
    const adviceType = String(rule.adviceType || "").trim().toLowerCase();
    const adviceValue = String(rule.adviceValue || "").trim();

    if (adviceType === "medication" || adviceType === "tool" || adviceType === "treatment") {
      const code = getCanonicalItemCode(adviceValue);
      addTaggedItems(ctx.uniqueItems, [code], departments);
    } else if (adviceType === "step") {
      addTaggedText(ctx.uniqueSteps, "", [humanizeRuleAdvice(adviceValue)], departments);
    } else if (adviceType === "warning") {
      addTaggedText(ctx.uniqueWarnings, "", [humanizeRuleAdvice(adviceValue)], departments);
    } else if (adviceType === "triage") {
      ctx.priorityAlerts.add(`Centrale regel: ${humanizeRuleAdvice(adviceValue)}`);
    }
  });
}

function ruleMatchesForm(rule, formData) {
  const group = String(rule.conditionGroup || "").trim().toLowerCase();
  const field = String(rule.conditionField || "").trim().toLowerCase();
  const operator = String(rule.operator || "equals").trim().toLowerCase();
  const ruleValueRaw = String(rule.conditionValue || "").trim().toLowerCase();

  let currentValue = "";
  let translatedRuleValue = ruleValueRaw;

  if (group === "bloodloss" || field === "bloodloss") {
    currentValue = formData.condition.bleedingLevel;
    translatedRuleValue = RULE_VALUE_TRANSLATIONS.bloodloss[ruleValueRaw] || ruleValueRaw;
  } else if (group === "pain" || field === "pain") {
    currentValue = formData.condition.painLevel;
    translatedRuleValue = RULE_VALUE_TRANSLATIONS.pain[ruleValueRaw] || ruleValueRaw;
  } else if (group === "consciousness" || field === "consciousness") {
    currentValue = formData.condition.consciousness;
    translatedRuleValue = RULE_VALUE_TRANSLATIONS.consciousness[ruleValueRaw] || ruleValueRaw;
  } else if (field === "pulse") {
    currentValue = formData.condition.pulse;
    translatedRuleValue = RULE_VALUE_TRANSLATIONS.pulse[ruleValueRaw] || ruleValueRaw;
  } else if (field === "triage") {
    currentValue = formData.condition.triage;
    translatedRuleValue = RULE_VALUE_TRANSLATIONS.triage[ruleValueRaw] || ruleValueRaw;
  } else {
    return false;
  }

  if (operator === "equals") {
    return currentValue === translatedRuleValue;
  }

  if (operator === "gte") {
    return compareSeverityValue(field || group, currentValue, translatedRuleValue) >= 0;
  }

  return false;
}

function compareSeverityValue(kind, currentValue, ruleValue) {
  const maps = {
    pain: { light: 1, moderate: 2, high: 3, extreme: 4 },
    bloodloss: { none: 0, light: 1, moderate: 2, high: 3, extreme: 4 }
  };

  const map = maps[kind] || maps.pain;
  return Number(map[currentValue] || 0) - Number(map[ruleValue] || 0);
}

function buildProfilesFromDocumentTypes(documentTypes) {
  const values = Array.isArray(documentTypes) ? documentTypes : [];
  const profiles = [];

  values.forEach((value) => {
    if (value === "rapport-operatie") profiles.push("operation_report");
    else if (value === "rapport-forensisch") profiles.push("forensic_report");
    else if (value === "rapport-trauma") profiles.push("trauma_report");
    else if (value === "rapport-opname") profiles.push("admission_report");
    else if (value === "rapport-coma") profiles.push("coma_report");
    else profiles.push("all");
  });

  return Array.from(new Set(profiles.length ? profiles : ["all"]));
}

function getInvestigationCostCode(item) {
  const base = String(item.code || item.label || item.id || "onderzoek")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (base.includes("ct")) return "ct";
  if (base.includes("rx") || base.includes("rontgen") || base.includes("röntgen")) return "rx";
  if (base.includes("observ")) return "observatie";
  if (base.includes("beeld")) return "beeldvorming";
  if (base.includes("circul")) return "circulatie";
  return base;
}

function getCanonicalItemCode(rawValue) {
  const normalized = String(rawValue || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const match = Object.entries(CENTRAL_ITEM_ALIAS_MAP).find(([, aliases]) => aliases.includes(normalized));
  if (match) return match[0];
  return normalized || "item_onbekend";
}

function prettifyCode(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function prettifyDepartmentLabel(value) {
  return prettifyCode(String(value || "").replace("-", " "));
}

function getCentralSeverityScore(value) {
  return CENTRAL_SEVERITY_MAP[String(value || "").trim().toLowerCase()]?.score || 1;
}

function splitPipe(value) {
  return String(value || "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

function dedupeOptions(options) {
  const map = new Map();
  options.forEach((option) => {
    if (!option?.value && option?.value !== "") return;
    map.set(option.value, option);
  });
  return Array.from(map.values());
}

function humanizeRuleAdvice(value) {
  const normalized = String(value || "").trim();
  if (APP_CONFIG.itemLabels?.[getCanonicalItemCode(normalized)]) {
    return APP_CONFIG.itemLabels[getCanonicalItemCode(normalized)];
  }
  return prettifyCode(normalized);
}


/* =========================================================
   RENDER STATIC SELECTS
========================================================= */

function renderStaticSelects() {
  renderOptions("departmentFilter", APP_CONFIG.selectOptions.departmentFilter);
  renderOptions("displayFilter", APP_CONFIG.selectOptions.displayFilter);
  renderOptions("viewMode", APP_CONFIG.selectOptions.viewMode);
  renderOptions("consciousness", APP_CONFIG.selectOptions.consciousness);
  renderOptions("triage", APP_CONFIG.selectOptions.triage);
  renderOptions("pulse", APP_CONFIG.selectOptions.pulse);
  renderOptions("temperature", APP_CONFIG.selectOptions.temperature);
  renderOptions("painLevel", APP_CONFIG.selectOptions.painLevel);
  renderOptions("bleedingLevel", APP_CONFIG.selectOptions.bleedingLevel);
  renderOptions("airwayRisk", APP_CONFIG.selectOptions.airwayRisk);
  renderOptions("breathingStatus", APP_CONFIG.selectOptions.breathingStatus);
  renderOptions("costProfile", APP_CONFIG.selectOptions.costProfile || []);
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
            <input type="checkbox" id="fracture-${escapeAttr(part.key)}" />
            Vermoeden van breuk / fractuur
          </label>

          <label class="checkbox-inline">
            <input type="checkbox" id="needsImaging-${escapeAttr(part.key)}" />
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
    btn.addEventListener("click", () => addInjuryRow(btn.dataset.bodypart));
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

  row.querySelector('[data-field="woundType"]').innerHTML = APP_CONFIG.woundOptions
    .map((option) => `<option value="${escapeAttr(option.value)}">${escapeHtml(option.label)}</option>`)
    .join("");

  row.querySelector('[data-field="severity"]').innerHTML = APP_CONFIG.selectOptions.injurySeverity
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

  if (resetBtnTop) {
    resetBtnTop.addEventListener("click", handleReset);
  }

  if (copyReportBtnTop) {
    copyReportBtnTop.addEventListener("click", handleCopySummary);
  }

  document.getElementById("displayFilter").addEventListener("change", applyDisplayMode);
  document.getElementById("viewMode").addEventListener("change", applyDisplayMode);

  if (costProfileSelect) {
    costProfileSelect.addEventListener("change", handleCostFilterChange);
  }

  if (costDepartmentScope) {
    costDepartmentScope.addEventListener("change", handleCostFilterChange);
  }

  if (extraCostGroups) {
    extraCostGroups.addEventListener("change", handleCostFilterChange);
  }
}

/* =========================================================
   DATA COLLECTION
========================================================= */

function getFormData() {
  return {
    filter: {
      department: valueOf("departmentFilter"),
      display: valueOf("displayFilter"),
      viewMode: valueOf("viewMode"),
      costProfile: valueOf("costProfile") || "all",
      costDepartmentScope: valueOf("costDepartmentScope") || "auto"
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
  LAST_RESULT = result;
  renderResult(result);
  applyDisplayMode();
}

function buildTreatmentAdvice(formData) {
  const uniqueSteps = new Set();
  const uniqueActions = new Set();
  const uniqueItems = new Set();
  const uniqueWarnings = new Set();
  const uniqueFollowUp = new Set();
  const departments = new Set();
  const priorityAlerts = new Set();
  const clinicalImpressions = new Set();

  const imaging = {
    none: new Set(),
    rx: new Set(),
    ct: new Set(),
    observe: new Set()
  };

  const costEntries = [];

  let severityScore = 0;
  let hasAnyInjury = false;

  severityScore += getGeneralSeverityScore(formData.condition);

  const centralRuleContext = {
    uniqueSteps,
    uniqueActions,
    uniqueItems,
    uniqueWarnings,
    uniqueFollowUp,
    departments,
    priorityAlerts,
    clinicalImpressions,
    imaging
  };

  applyGeneralConditionLogic(formData.condition, centralRuleContext);
  applyCentralTreatmentRules(formData, centralRuleContext);

  formData.injuries.forEach((part) => {
    const hasPartInjury = part.injuries.length > 0 || part.fracture || part.needsImaging;
    if (hasPartInjury) hasAnyInjury = true;

    part.injuries.forEach((injury) => {
      if (!injury.wound) return;

      const rule = APP_CONFIG.woundRules[injury.wound];
      if (!rule) return;

      const multiplier = getSeverityMultiplier(injury.severity);
      severityScore += Number(rule.severity || 0) * multiplier;

      addTaggedText(uniqueSteps, part.label, rule.steps || [], rule.departments || []);
      addTaggedText(uniqueActions, part.label, rule.actions || [], rule.departments || []);
      addTaggedItems(uniqueItems, rule.items || [], rule.departments || []);
      addTaggedText(uniqueWarnings, part.label, rule.warnings || [], rule.departments || []);
      addTaggedText(uniqueFollowUp, part.label, rule.followUp || [], rule.departments || []);
      (rule.departments || []).forEach((d) => departments.add(d));

      addImagingRules(imaging, part.label, rule.investigations || [], rule.departments || []);
      applySeveritySpecificLogic(part, injury, {
        uniqueSteps,
        uniqueActions,
        uniqueWarnings,
        uniqueFollowUp,
        departments,
        priorityAlerts,
        clinicalImpressions,
        imaging
      });

      addInjuryCost(injury.wound, injury.severity, costEntries, rule.departments || []);
      addClinicalFromInjury(part, injury, clinicalImpressions);
      addOperationFromInjury(part, injury, priorityAlerts);
    });

    if (part.fracture) {
      severityScore += 2.5;
      addFractureAdvice(part, {
        uniqueSteps,
        uniqueActions,
        uniqueItems,
        uniqueWarnings,
        uniqueFollowUp,
        departments,
        imaging,
        priorityAlerts
      });
      addCostLine(costEntries, "injuries", `Fractuurverdenking ${part.label}`, APP_CONFIG.costs.fractureSurcharge || 0, inferFractureDepartments(part));
    }

    if (part.needsImaging) {
      addTaggedImaging(imaging.observe, `${part.label}: beeldvorming overwegen op basis van klinisch beeld`, ["Spoed/Ambulance"]);
    }
  });

  if (!hasAnyInjury) {
    addTaggedText(uniqueSteps, "", ["Start met algemene evaluatie van patiënt en letsels"], ["Spoed/Ambulance"]);
    addTaggedText(uniqueActions, "", ["Voer klinische beoordeling uit en vul letsels aan indien nodig"], ["Spoed/Ambulance"]);
    addTaggedText(uniqueWarnings, "", ["Geen specifieke letsels geselecteerd"], ["Spoed/Ambulance"]);
    clinicalImpressions.add("Er zijn momenteel geen specifieke letsels geregistreerd.");
  }

  if (clinicalImpressions.size === 0) {
    clinicalImpressions.add("Huidige gegevens geven nog geen duidelijke klinische indruk.");
  }

  const filteredDepartments = filterDepartments(Array.from(departments), formData.filter.department);
  const filteredSteps = filterTaggedSet(uniqueSteps, formData.filter.department);
  const filteredActions = filterTaggedSet(uniqueActions, formData.filter.department);
  const filteredItems = filterItemsSet(uniqueItems, formData.filter.department);
  const filteredWarnings = filterTaggedSet(uniqueWarnings, formData.filter.department);
  const filteredFollowUp = filterTaggedSet(uniqueFollowUp, formData.filter.department);

  const filteredImaging = {
    none: filterImagingSet(imaging.none, formData.filter.department),
    rx: filterImagingSet(imaging.rx, formData.filter.department),
    ct: filterImagingSet(imaging.ct, formData.filter.department),
    observe: filterImagingSet(imaging.observe, formData.filter.department)
  };

  addItemCosts(filteredItems, costEntries);
  addInvestigationCosts(filteredImaging, costEntries);

  const priority = determinePriority(severityScore, formData.condition);
  const operation = determineOperationIndication(formData);
  const closing = determineClosingStatus(formData, priority, operation, filteredImaging, hasAnyInjury);
  const summary = buildReportSummary(
    formData,
    priority,
    operation,
    closing,
    filteredDepartments,
    filteredSteps,
    filteredActions,
    filteredItems,
    filteredImaging,
    filteredFollowUp,
    Array.from(clinicalImpressions)
  );

  return {
    formData,
    priority,
    operation,
    closing,
    priorityAlerts: normalizePriorityAlerts(Array.from(priorityAlerts)),
    clinicalImpressions: Array.from(clinicalImpressions),
    departments: filteredDepartments,
    steps: filteredSteps,
    actions: filteredActions,
    items: filteredItems.map((item) => APP_CONFIG.itemLabels[item.code] || item.code),
    imaging: filteredImaging,
    followUp: filteredFollowUp,
    warnings: filteredWarnings,
    summary,
    costEntries
  };
}


function handleCostFilterChange() {
  updateCostProfileHelp();
  renderExtraCostGroups();

  if (LAST_RESULT) {
    renderCosts(buildVisibleCosts(LAST_RESULT.costEntries, LAST_RESULT.formData));
  }
}

function updateCostProfileHelp() {
  if (!costProfileHelp) return;

  const profileKey = valueOf("costProfile") || "all";
  const profile = APP_CONFIG.costProfiles?.[profileKey];

  costProfileHelp.textContent = profile?.description || "Kies een documenttype om alleen de passende kosten aan te rekenen.";
}

function renderExtraCostGroups() {
  if (!extraCostGroups) return;

  const profileKey = valueOf("costProfile") || "all";
  const departmentScope = valueOf("costDepartmentScope") || "auto";
  const activeDepartment = departmentScope === "auto" ? (valueOf("departmentFilter") || "all") : departmentScope;

  const groups = (APP_CONFIG.extraCostGroups || []).filter((group) => {
    const profileMatch = !group.allowedProfiles || group.allowedProfiles.includes(profileKey);
    const departmentMatch = activeDepartment === "all" || (group.departments || []).includes(activeDepartment);
    return profileMatch && departmentMatch;
  });

  if (!groups.length) {
    extraCostGroups.innerHTML = '<p class="help-text">Voor dit documenttype zijn momenteel geen extra afdelingskosten beschikbaar.</p>';
    return;
  }

  extraCostGroups.innerHTML = groups.map((group) => `
    <div class="extra-cost-group">
      <h4>${escapeHtml(group.label)}</h4>
      <div class="extra-cost-options">
        ${(group.items || []).map((item) => `
          <label class="checkbox-inline extra-cost-option">
            <input type="checkbox"
                   class="extra-cost-checkbox"
                   data-group-code="${escapeAttr(group.code)}"
                   data-item-code="${escapeAttr(item.code)}"
                   data-label="${escapeAttr(item.label)}"
                   data-amount="${escapeAttr(item.amount)}"
                   data-departments="${escapeAttr((group.departments || []).join("|"))}" />
            <span>${escapeHtml(item.label)} <strong>(${formatCurrency(item.amount)})</strong></span>
          </label>
        `).join("")}
      </div>
    </div>
  `).join("");
}

function buildVisibleCosts(costEntries, formData) {
  const profileKey = valueOf("costProfile") || formData.filter.costProfile || "all";
  const departmentScope = valueOf("costDepartmentScope") || formData.filter.costDepartmentScope || "auto";
  const allowedDepartments = getAllowedDepartments(profileKey, formData.filter.department, departmentScope);
  const visibleEntries = (costEntries || []).filter((entry) => entryMatchesCostFilter(entry, allowedDepartments, profileKey));
  const extraEntries = getSelectedExtraCostEntries(profileKey, allowedDepartments);

  return summarizeCostEntries([...visibleEntries, ...extraEntries]);
}

function getAllowedDepartments(profileKey, selectedDepartment, departmentScope) {
  const profileDepartments = APP_CONFIG.costProfiles?.[profileKey]?.allowedDepartments || ["Spoed/Ambulance", "Chirurgie"];
  const scopeDepartment = departmentScope === "auto" ? selectedDepartment : departmentScope;

  if (!scopeDepartment || scopeDepartment === "all") {
    return profileDepartments;
  }

  return profileDepartments.includes(scopeDepartment) ? [scopeDepartment] : [];
}

function entryMatchesCostFilter(entry, allowedDepartments, profileKey) {
  if (!allowedDepartments.length) return false;

  const departments = entry.departments && entry.departments.length ? entry.departments : ["Spoed/Ambulance", "Chirurgie"];
  const departmentMatch = departments.some((department) => allowedDepartments.includes(department));

  if (!departmentMatch) return false;

  if (profileKey === "operation_report" && !departments.includes("Chirurgie")) return false;
  if (profileKey === "forensic_report" && entry.kind === "extra" && entry.groupCode !== "forensic") return false;
  if (profileKey === "coma_report" && entry.bucket === "items" && ["field_dressing", "elastic_bandage"].includes(entry.code)) return false;

  return true;
}

function getSelectedExtraCostEntries(profileKey, allowedDepartments) {
  return Array.from(document.querySelectorAll(".extra-cost-checkbox:checked")).map((checkbox) => ({
    bucket: "extras",
    kind: "extra",
    groupCode: checkbox.dataset.groupCode || "",
    code: checkbox.dataset.itemCode || "",
    label: checkbox.dataset.label || "",
    amount: Number(checkbox.dataset.amount || 0),
    departments: (checkbox.dataset.departments || "").split("|").filter(Boolean),
    profiles: [profileKey]
  })).filter((entry) => entryMatchesCostFilter(entry, allowedDepartments, profileKey));
}

function summarizeCostEntries(entries) {
  const state = {
    injuries: 0,
    items: 0,
    investigations: 0,
    extras: 0,
    total: 0,
    breakdown: []
  };

  entries.forEach((entry) => {
    const amount = Number(entry.amount || 0);
    if (!amount) return;

    if (entry.bucket === "injuries") state.injuries += amount;
    else if (entry.bucket === "items") state.items += amount;
    else if (entry.bucket === "investigations") state.investigations += amount;
    else if (entry.bucket === "extras") state.extras += amount;

    state.total += amount;
    state.breakdown.push({ label: entry.label, amount, bucket: entry.bucket });
  });

  return state;
}

function inferFractureDepartments(part) {
  if (part.fractureZone === "torso") return ["Spoed/Ambulance", "Chirurgie"];
  return ["Spoed/Ambulance"];
}


/* =========================================================
   GENERAL LOGIC
========================================================= */

function applyGeneralConditionLogic(condition, ctx) {
  const {
    uniqueSteps,
    uniqueActions,
    uniqueItems,
    uniqueWarnings,
    uniqueFollowUp,
    departments,
    priorityAlerts,
    clinicalImpressions,
    imaging
  } = ctx;

  departments.add("Spoed/Ambulance");

  if (condition.airwayRisk === "at-risk" || condition.airwayRisk === "critical") {
    addTaggedText(uniqueSteps, "", ["Beoordeel en beveilig de luchtweg"], ["Spoed/Ambulance"]);
    addTaggedText(uniqueActions, "", ["Voer onmiddellijke controle van de luchtweg uit"], ["Spoed/Ambulance"]);
    addTaggedText(uniqueWarnings, "", ["Luchtweg kan bedreigd zijn"], ["Spoed/Ambulance"]);
    priorityAlerts.add("Bedreigde luchtweg");
    clinicalImpressions.add("Bewustzijn en luchtweg vragen verhoogde waakzaamheid.");
  }

  if (condition.airwayRisk === "critical") {
    priorityAlerts.add("Kritisch luchtwegprobleem");
  }

  if (condition.breathingStatus === "disturbed" || condition.breathingStatus === "severe") {
    addTaggedText(uniqueSteps, "", ["Beoordeel ademhaling en zuurstofstatus"], ["Spoed/Ambulance"]);
    addTaggedText(uniqueActions, "", ["Controleer ademhaling en ondersteun waar nodig"], ["Spoed/Ambulance"]);
    addTaggedText(uniqueWarnings, "", ["Verstoorde ademhaling aanwezig"], ["Spoed/Ambulance"]);
    clinicalImpressions.add("Ademhaling vraagt verhoogde aandacht.");
  }

  if (condition.breathingStatus === "severe") {
    priorityAlerts.add("Ernstig verstoorde ademhaling");
  }

  if (condition.consciousness === "unconscious") {
    addTaggedText(uniqueSteps, "", ["Start ABC-beoordeling met prioriteit"], ["Spoed/Ambulance"]);
    addTaggedText(uniqueActions, "", ["Beveilig de luchtweg en voer onmiddellijke vitale beoordeling uit"], ["Spoed/Ambulance"]);
    addTaggedText(uniqueWarnings, "", ["Bewusteloze patiënt vereist onmiddellijke opvolging"], ["Spoed/Ambulance"]);
    addTaggedText(uniqueFollowUp, "", ["Blijf patiënt continu monitoren tijdens verdere zorg"], ["Spoed/Ambulance"]);
    priorityAlerts.add("Bewusteloze patiënt");
    clinicalImpressions.add("Patiënt vertoont ernstige instabiliteit op basis van bewustzijn.");
  }

  if (["high", "extreme"].includes(condition.bleedingLevel)) {
    addTaggedText(uniqueSteps, "", ["Stop actieve bloeding als eerste behandelstap"], ["Spoed/Ambulance"]);
    addTaggedText(uniqueActions, "", ["Controleer en stop actieve bloeding als prioriteit"], ["Spoed/Ambulance"]);
    addTaggedItems(uniqueItems, ["tourniquet", "quick_clot"], ["Spoed/Ambulance"]);
    addTaggedText(uniqueWarnings, "", ["Ernstig bloedverlies vereist snelle stabilisatie"], ["Spoed/Ambulance"]);
    priorityAlerts.add(condition.bleedingLevel === "extreme" ? "Extreem bloedverlies" : "Ernstig bloedverlies");
    clinicalImpressions.add("Patroon past bij mogelijk relevant bloedverlies.");
  }

  if (condition.bleedingLevel === "extreme") {
    addTaggedText(uniqueSteps, "", ["Start volume- of bloedresuscitatie indien klinisch nodig"], ["Spoed/Ambulance"]);
    addTaggedItems(uniqueItems, ["blood500ml", "saline500ml"], ["Spoed/Ambulance"]);
    addTaggedText(uniqueActions, "", ["Voorzie volume- of bloedresuscitatie indien nodig"], ["Spoed/Ambulance"]);
    addTaggedImaging(imaging.observe, "Controle van circulatie en bloedverlies", ["Spoed/Ambulance"]);
  }

  if (["high", "extreme"].includes(condition.painLevel)) {
    addTaggedText(uniqueActions, "", ["Voorzie adequate pijnstilling"], ["Spoed/Ambulance"]);
    addTaggedItems(uniqueItems, ["painkillers", "morphine"], ["Spoed/Ambulance"]);
  }

  if (condition.pulse === "weak") {
    clinicalImpressions.add("Patiënt vertoont tekenen van mogelijke circulatoire instabiliteit.");
  }

  if (condition.triage === "critical") {
    priorityAlerts.add("Kritieke triage-inschatting");
  }

  if (
    condition.consciousness === "alert" &&
    condition.airwayRisk === "stable" &&
    condition.breathingStatus === "normal" &&
    condition.bleedingLevel === "none"
  ) {
    clinicalImpressions.add("Huidige parameters ogen relatief stabiel.");
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
   INJURY / FRACTURE / CLINICAL
========================================================= */

function getSeverityMultiplier(severity) {
  switch (severity) {
    case "light": return 0.8;
    case "moderate": return 1;
    case "severe": return 1.35;
    case "critical": return 1.75;
    default: return 1;
  }
}

function applySeveritySpecificLogic(part, injury, ctx) {
  const {
    uniqueSteps,
    uniqueActions,
    uniqueWarnings,
    uniqueFollowUp,
    departments,
    priorityAlerts,
    clinicalImpressions,
    imaging
  } = ctx;

  const urgentDept = ["Spoed/Ambulance"];

  if (injury.severity === "severe" || injury.severity === "critical") {
    addTaggedText(uniqueWarnings, part.label, ["ernstig letsel vraagt verhoogde opvolging"], urgentDept);
    addTaggedText(uniqueActions, part.label, ["monitor evolutie van het letsel nauwgezet"], urgentDept);
    addTaggedText(uniqueFollowUp, part.label, ["plan hercontrole van pijn, bloeding en functie"], urgentDept);
  }

  if (injury.severity === "critical") {
    addTaggedText(uniqueSteps, part.label, ["behandel dit letsel als prioritaire interventie"], urgentDept);
    priorityAlerts.add(`${part.label}: kritiek letsel`);
  }

  if (part.fractureZone === "leg" && ["crush", "mediumvelocitywound", "highvelocitywound", "velocitywound"].includes(injury.wound)) {
    addTaggedText(uniqueFollowUp, part.label, ["gebruik krukken of rolstoel afhankelijk van mobiliteit"], ["Spoed/Ambulance"]);
  }

  if (part.key === "head" && ["burn", "crush", "highvelocitywound", "velocitywound"].includes(injury.wound)) {
    addTaggedImaging(imaging.ct, `${part.label}: CT aanbevolen of sterk overwegen`, ["Spoed/Ambulance", "Chirurgie"]);
    clinicalImpressions.add("Hoofd/nekletsel vraagt verhoogde neurologische waakzaamheid.");
    priorityAlerts.add("Ernstig hoofd- of nektrauma");
  }

  if (part.key === "torso" && ["puncturewound", "velocitywound", "highvelocitywound", "crush", "mediumvelocitywound"].includes(injury.wound)) {
    addTaggedText(uniqueWarnings, part.label, ["risico op intern letsel"], ["Chirurgie"]);
    addTaggedImaging(imaging.observe, `${part.label}: beeldvorming overwegen bij romptrauma`, ["Chirurgie"]);
    clinicalImpressions.add("Romptrauma met penetrerend of zwaar letsel: intern letsel niet uit te sluiten.");
    priorityAlerts.add("Mogelijk intern letsel");
    departments.add("Chirurgie");
  }
}

function addFractureAdvice(part, ctx) {
  const {
    uniqueSteps,
    uniqueActions,
    uniqueItems,
    uniqueWarnings,
    uniqueFollowUp,
    departments,
    imaging,
    priorityAlerts
  } = ctx;

  addTaggedText(uniqueSteps, part.label, ["immobiliseer het getroffen lichaamsdeel"], ["Spoed/Ambulance"]);
  addTaggedText(uniqueActions, part.label, ["immobiliseer en beperk beweging"], ["Spoed/Ambulance"]);
  addTaggedText(uniqueWarnings, part.label, ["vermoeden van fractuur, verdere evaluatie aanbevolen"], ["Spoed/Ambulance"]);
  addTaggedText(uniqueFollowUp, part.label, ["mobiliteit herbeoordelen na stabilisatie"], ["Spoed/Ambulance"]);
  addTaggedImaging(imaging.rx, `${part.label}: RX aanbevolen bij vermoeden van fractuur`, ["Spoed/Ambulance"]);
  departments.add("Spoed/Ambulance");

  switch (part.fractureZone) {
    case "neck":
      addTaggedItems(uniqueItems, ["neckbrace"], ["Spoed/Ambulance"]);
      addTaggedText(uniqueActions, part.label, ["stabiliseer hoofd/nek en beperk beweging"], ["Spoed/Ambulance"]);
      addTaggedImaging(imaging.ct, `${part.label}: CT of RX overwegen afhankelijk van context`, ["Spoed/Ambulance", "Chirurgie"]);
      priorityAlerts.add("Nekletsel stabiliseren");
      break;

    case "arm":
      addTaggedItems(uniqueItems, ["armsplint"], ["Spoed/Ambulance"]);
      addTaggedText(uniqueActions, part.label, ["voorzie armspalk"], ["Spoed/Ambulance"]);
      break;

    case "leg":
      addTaggedItems(uniqueItems, ["legsplint"], ["Spoed/Ambulance"]);
      addTaggedText(uniqueActions, part.label, ["voorzie beenspalk"], ["Spoed/Ambulance"]);
      addTaggedText(uniqueFollowUp, part.label, ["overweeg krukken, wandelstok of rolstoel bij ontslag/verdere opvolging"], ["Spoed/Ambulance"]);
      break;

    case "torso":
      addTaggedImaging(imaging.observe, `${part.label}: verdere beeldvorming overwegen`, ["Chirurgie"]);
      departments.add("Chirurgie");
      break;
  }
}

function addClinicalFromInjury(part, injury, clinicalImpressions) {
  const severe = injury.severity === "severe" || injury.severity === "critical";

  if (["lowvelocitywound", "mediumvelocitywound", "highvelocitywound", "velocitywound"].includes(injury.wound)) {
    clinicalImpressions.add("Schotwonde aanwezig met verhoogd risico op diepe weefselschade.");
  }

  if (injury.wound === "puncturewound" && severe) {
    clinicalImpressions.add("Ernstige penetrerende wonde: interne schade niet uit te sluiten.");
  }

  if (injury.wound === "crush") {
    clinicalImpressions.add("Verpletteringsletsel kan gepaard gaan met bijkomende interne schade.");
  }

  if (["cut", "laceration"].includes(injury.wound) && !severe) {
    clinicalImpressions.add("Letsel lijkt mogelijk geschikt voor basis wondzorg of eenvoudige wondsluiting.");
  }

  if (part.fractureZone === "leg" && severe) {
    clinicalImpressions.add("Mobiliteit van de patiënt kan relevant beperkt zijn.");
  }
}

function addOperationFromInjury(part, injury, priorityAlerts) {
  if (
    ["lowvelocitywound", "mediumvelocitywound", "highvelocitywound", "velocitywound"].includes(injury.wound) ||
    (injury.wound === "puncturewound" && ["severe", "critical"].includes(injury.severity)) ||
    (injury.wound === "avulsion" && ["severe", "critical"].includes(injury.severity)) ||
    injury.wound === "crush" ||
    (part.key === "torso" && ["puncturewound", "mediumvelocitywound", "highvelocitywound", "velocitywound", "crush"].includes(injury.wound))
  ) {
    priorityAlerts.add("Chirurgische evaluatie aanbevolen");
  }
}

/* =========================================================
   OPERATION / CLOSING
========================================================= */

function determineOperationIndication(formData) {
  let level = "none";
  const reasons = [];

  formData.injuries.forEach((part) => {
    part.injuries.forEach((injury) => {
      const severe = ["severe", "critical"].includes(injury.severity);

      if (["cut", "laceration"].includes(injury.wound) && !severe) {
        // basis wondsluiting, geen operatie-indicatie
      }

      if (injury.wound === "avulsion" && severe) {
        level = maxOpLevel(level, "possible");
        reasons.push(`${part.label}: ernstige avulsiewonde met kans op complexe wondzorg`);
      }

      if (injury.wound === "puncturewound" && severe) {
        level = maxOpLevel(level, "recommended");
        reasons.push(`${part.label}: ernstige penetrerende wonde met risico op diepe schade`);
      }

      if (injury.wound === "crush") {
        level = maxOpLevel(level, "recommended");
        reasons.push(`${part.label}: verpletteringsletsel met risico op bijkomende schade`);
      }

      if (["lowvelocitywound", "velocitywound"].includes(injury.wound)) {
        level = maxOpLevel(level, "recommended");
        reasons.push(`${part.label}: schotwonde vraagt meestal chirurgische beoordeling`);
      }

      if (["mediumvelocitywound", "highvelocitywound"].includes(injury.wound)) {
        level = maxOpLevel(level, "urgent");
        reasons.push(`${part.label}: ernstige schotwonde met grote kans op diepe weefselschade`);
      }

      if (part.key === "torso" && ["puncturewound", "crush", "velocitywound", "mediumvelocitywound", "highvelocitywound"].includes(injury.wound)) {
        level = maxOpLevel(level, "urgent");
        reasons.push(`${part.label}: romptrauma met vermoeden van intern letsel`);
      }
    });
  });

  const textMap = {
    none: { label: "Geen indicatie", className: "neutral" },
    possible: { label: "Mogelijk operatief", className: "medium" },
    recommended: { label: "Operatief aangewezen", className: "high" },
    urgent: { label: "Dringend operatief", className: "critical" }
  };

  return {
    level,
    label: textMap[level].label,
    className: textMap[level].className,
    reason: reasons.length ? reasons[0] : "Geen duidelijke operatie-indicatie op basis van huidige input."
  };
}

function maxOpLevel(current, next) {
  const order = ["none", "possible", "recommended", "urgent"];
  return order.indexOf(next) > order.indexOf(current) ? next : current;
}

function determineClosingStatus(formData, priority, operation, imaging, hasAnyInjury) {
  if (
    formData.condition.consciousness === "unconscious" ||
    formData.condition.airwayRisk === "critical" ||
    formData.condition.breathingStatus === "severe"
  ) {
    return {
      label: "Verdere observatie nodig",
      className: "high",
      text: "Patiënt vereist verdere observatie en intensieve opvolging."
    };
  }

  if (operation.level === "urgent" || operation.level === "recommended") {
    return {
      label: "Chirurgische evaluatie nodig",
      className: "critical",
      text: "Patiënt moet verder beoordeeld worden door chirurgie."
    };
  }

  if (imaging.rx.length || imaging.ct.length || imaging.observe.length) {
    return {
      label: "Beeldvorming nodig",
      className: "medium",
      text: "Patiënt heeft verdere beeldvorming of observatie nodig."
    };
  }

  if (priority.label === "Hoog") {
    return {
      label: "Opname aanbevolen",
      className: "high",
      text: "Opname of langere observatie is aangewezen op basis van huidige toestand."
    };
  }

  if (hasAnyInjury) {
    return {
      label: "Gestabiliseerd",
      className: "low",
      text: "Patiënt lijkt voorlopig gestabiliseerd, met verdere nazorg volgens advies."
    };
  }

  return {
    label: "Klaar voor ontslag",
    className: "low",
    text: "Er zijn geen duidelijke aanwijzingen voor verdere intensieve opvolging op basis van de ingegeven gegevens."
  };
}

/* =========================================================
   IMAGING
========================================================= */

function addImagingRules(imaging, label, investigations, departments) {
  if (!investigations.length) {
    addTaggedImaging(imaging.none, `${label}: geen specifieke beeldvorming vanuit wondregel`, departments);
    return;
  }

  investigations.forEach((investigation) => {
    const lower = investigation.toLowerCase();

    if (lower.includes("ct")) {
      addTaggedImaging(imaging.ct, `${label}: ${investigation}`, departments);
    } else if (lower.includes("rx")) {
      addTaggedImaging(imaging.rx, `${label}: ${investigation}`, departments);
    } else {
      addTaggedImaging(imaging.observe, `${label}: ${investigation}`, departments);
    }
  });
}

function addTaggedImaging(targetSet, text, departments) {
  targetSet.add(JSON.stringify({
    text,
    departments: departments && departments.length ? departments : ["Spoed/Ambulance"]
  }));
}

/* =========================================================
   TAGGED HELPERS / FILTERS
========================================================= */

function addTaggedText(targetSet, labelPrefix, items, departments) {
  items.forEach((item) => {
    const text = labelPrefix ? `${labelPrefix}: ${item}` : item;
    targetSet.add(JSON.stringify({
      text,
      departments: departments && departments.length ? departments : ["Spoed/Ambulance"]
    }));
  });
}

function addTaggedItems(targetSet, itemCodes, departments) {
  itemCodes.forEach((code) => {
    targetSet.add(JSON.stringify({
      code,
      departments: departments && departments.length ? departments : ["Spoed/Ambulance"]
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
        map.set(entry.code, { code: entry.code, departments: entry.departments || [] });
      } else {
        const existing = map.get(entry.code);
        existing.departments = Array.from(new Set([...(existing.departments || []), ...(entry.departments || [])]));
      }
    });

  return Array.from(map.values());
}

function filterImagingSet(taggedSet, selectedDepartment) {
  const seen = new Set();
  return Array.from(taggedSet)
    .map((value) => JSON.parse(value))
    .filter((entry) => matchesDepartment(entry.departments, selectedDepartment))
    .map((entry) => entry.text)
    .filter((text) => {
      if (seen.has(text)) return false;
      seen.add(text);
      return true;
    });
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

function addInjuryCost(woundCode, severity, costEntries, departments) {
  const woundBaseCost = APP_CONFIG.costs.wounds[woundCode] ?? APP_CONFIG.costs.defaultWound ?? 0;
  const multiplier = APP_CONFIG.costs.severityMultipliers[severity] ?? 1;
  const cost = Math.round(woundBaseCost * multiplier);

  addCostLine(
    costEntries,
    "injuries",
    `${getWoundLabel(woundCode)} (${getSeverityLabel(severity)})`,
    cost,
    departments,
    woundCode,
    "wound"
  );
}

function addItemCosts(filteredItems, costEntries) {
  const seen = new Set();

  filteredItems.forEach((item) => {
    if (seen.has(item.code)) return;
    seen.add(item.code);

    const cost = APP_CONFIG.costs.items[item.code] ?? 0;
    if (cost > 0) {
      addCostLine(
        costEntries,
        "items",
        APP_CONFIG.itemLabels[item.code] || item.code,
        cost,
        item.departments || ["Spoed/Ambulance"],
        item.code,
        "item"
      );
    }
  });
}

function addInvestigationCosts(filteredImaging, costEntries) {
  const entries = [
    ...filteredImaging.rx.map((label) => ({ label, departments: ["Spoed/Ambulance", "Chirurgie"] })),
    ...filteredImaging.ct.map((label) => ({ label, departments: ["Spoed/Ambulance", "Chirurgie"] })),
    ...filteredImaging.observe.map((label) => ({ label, departments: ["Spoed/Ambulance", "Chirurgie"] }))
  ];

  entries.forEach((entry) => {
    const matchKey = Object.keys(APP_CONFIG.costs.investigations).find((key) =>
      entry.label.toLowerCase().includes(key.toLowerCase())
    );

    if (!matchKey) return;

    const cost = APP_CONFIG.costs.investigations[matchKey] ?? 0;
    if (cost > 0) {
      addCostLine(costEntries, "investigations", entry.label, cost, entry.departments, matchKey, "investigation");
    }
  });
}

function addCostLine(costEntries, bucket, label, amount, departments = ["Spoed/Ambulance", "Chirurgie"], code = "", kind = "standard") {
  if (!amount) return;

  costEntries.push({
    bucket,
    label,
    amount,
    departments,
    code,
    kind
  });
}

/* =========================================================
   PRIORITY / ALERTS
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

  if (score >= 16) return { label: "Hoog", className: "high" };
  if (score >= 8) return { label: "Matig", className: "medium" };
  return { label: "Laag", className: "low" };
}

function normalizePriorityAlerts(alerts) {
  const seen = new Set();
  return alerts.filter((alert) => {
    if (seen.has(alert)) return false;
    seen.add(alert);
    return true;
  }).slice(0, 5);
}

/* =========================================================
   REPORT BUILDING
========================================================= */

function buildReportSummary(formData, priority, operation, closing, departments, steps, actions, items, imaging, followUp, clinicalImpressions) {
  const patientName = formData.patient.name || "Onbekende patiënt";
  const locationText = formData.patient.location ? ` ter hoogte van ${formData.patient.location}` : "";
  const medicText = formData.patient.treatingMedic
    ? `De behandeling werd opgestart door ${formData.patient.treatingMedic}.`
    : "";

  const filterLabel = getSelectLabel("departmentFilter", formData.filter.department);
  const viewModeLabel = getSelectLabel("viewMode", formData.filter.viewMode);

  const injuryLines = [];

  formData.injuries.forEach((part) => {
    const detailParts = [];

    part.injuries.forEach((injury) => {
      const sub = [];
      if (injury.wound) sub.push(getWoundLabel(injury.wound).toLowerCase());
      if (injury.severity) sub.push(`ernst: ${getSeverityLabel(injury.severity).toLowerCase()}`);
      if (injury.note) sub.push(injury.note);
      if (sub.length) detailParts.push(sub.join(", "));
    });

    if (part.fracture) detailParts.push("vermoeden van fractuur");
    if (part.needsImaging) detailParts.push("beeldvorming te overwegen");

    if (detailParts.length) {
      injuryLines.push(`${part.label}: ${detailParts.join(" | ")}`);
    }
  });

  const imagingFlat = [
    ...imaging.rx.map((x) => `RX: ${x}`),
    ...imaging.ct.map((x) => `CT: ${x}`),
    ...imaging.observe.map((x) => `Observatie/evaluatie: ${x}`)
  ];

  return [
    `Prioriteit van zorg: ${priority.label}.`,
    `Actieve afdelingsview: ${filterLabel}.`,
    `Weergavemodus: ${viewModeLabel}.`,
    `${patientName} werd beoordeeld${locationText}.`,
    `Patiënt was ${APP_CONFIG.textMap.consciousness[formData.condition.consciousness]}, had ${APP_CONFIG.textMap.pulse[formData.condition.pulse]}, ${APP_CONFIG.textMap.temperature[formData.condition.temperature]}, ${APP_CONFIG.textMap.painLevel[formData.condition.painLevel]} en ${APP_CONFIG.textMap.bleedingLevel[formData.condition.bleedingLevel]}.`,
    `Luchtweg: ${APP_CONFIG.textMap.airwayRisk[formData.condition.airwayRisk]}. Ademhaling: ${APP_CONFIG.textMap.breathingStatus[formData.condition.breathingStatus]}. Triage: ${APP_CONFIG.textMap.triage[formData.condition.triage]}.`,
    injuryLines.length ? `Vastgestelde letsels: ${injuryLines.join(" || ")}.` : "Er werden geen specifieke letsels geregistreerd in de tool.",
    clinicalImpressions.length ? `Klinische indruk: ${clinicalImpressions.join("; ")}.` : "",
    departments.length ? `Betrokken afdelingen: ${departments.join(", ")}.` : "",
    `Operatie-indicatie: ${operation.label}. Reden: ${operation.reason}`,
    steps.length ? `Stappenplan: ${steps.join("; ")}.` : "",
    actions.length ? `Aanbevolen handelingen: ${actions.join("; ")}.` : "",
    items.length ? `Aanbevolen items: ${items.join(", ")}.` : "",
    imagingFlat.length ? `Beeldvorming/onderzoek: ${imagingFlat.join("; ")}.` : "",
    followUp.length ? `Nazorg patiënt: ${followUp.join("; ")}.` : "",
    `Afsluitstatus: ${closing.label}. ${closing.text}`,
    formData.condition.generalNotes ? `Algemene observaties: ${formData.condition.generalNotes}.` : "",
    medicText
  ].filter(Boolean).join("\n\n");
}

function getWoundLabel(woundValue) {
  const found = APP_CONFIG.woundOptions.find((option) => option.value === woundValue);
  return found ? found.label : woundValue;
}

function getSeverityLabel(severityValue) {
  return getSelectLabel("injurySeverity", severityValue);
}

function getSelectLabel(group, value) {
  const found = APP_CONFIG.selectOptions[group].find((option) => option.value === value);
  return found ? found.label : value;
}

/* =========================================================
   RENDER
========================================================= */

function renderResult(result) {
  updateCostProfileHelp();
  renderExtraCostGroups();
  priorityBadge.className = `priority-badge ${result.priority.className}`;
  priorityBadge.textContent = result.priority.label;

  operationBadge.className = `operation-badge ${result.operation.className}`;
  operationBadge.textContent = result.operation.label;
  operationReason.textContent = result.operation.reason;

  closingStatusBadge.className = `closing-badge ${result.closing.className}`;
  closingStatusBadge.textContent = result.closing.label;
  closingStatusText.textContent = result.closing.text;

  renderList(alertsList, result.priorityAlerts, "Nog geen prioritaire waarschuwingen.");
  renderList(clinicalImpressionList, result.clinicalImpressions, "Nog geen klinische indruk.");
  renderTagList(departmentTags, result.departments, "Nog geen advies");
  renderList(stepsList, result.steps, "Geen stappenplan gegenereerd.");
  renderList(actionsList, result.actions, "Geen specifieke handelingen.");
  renderList(itemsList, result.items, "Geen specifieke items.");

  renderList(imagingNoneList, result.imaging.none, "Geen specifieke beoordeling.");
  renderList(imagingRxList, result.imaging.rx, "Nog geen RX-advies.");
  renderList(imagingCtList, result.imaging.ct, "Nog geen CT-advies.");
  renderList(imagingObserveList, result.imaging.observe, "Nog geen observatie-advies.");

  renderList(followUpList, result.followUp, "Geen nazorg voorgesteld.");
  renderList(warningsList, result.warnings, "Geen extra aandachtspunten.");
  renderCosts(buildVisibleCosts(result.costEntries, result.formData));

  reportSummary.value = result.summary;
}

function renderCosts(costs) {
  costInjuries.textContent = formatCurrency(costs.injuries);
  costItems.textContent = formatCurrency(costs.items);
  costInvestigations.textContent = formatCurrency(costs.investigations);
  if (costExtras) costExtras.textContent = formatCurrency(costs.extras);
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
   DISPLAY MODE / FILTER
========================================================= */

function applyDisplayMode() {
  const displayFilter = valueOf("displayFilter") || "all";
  const viewMode = valueOf("viewMode") || "full";

  Object.values(BLOCKS).forEach((block) => {
    block.classList.remove("is-hidden");
  });

  if (viewMode === "compact") {
    hideBlocks(["department", "steps", "costs", "warnings", "report"]);
  }

  switch (displayFilter) {
    case "acute":
      hideBlocks(["clinical", "department", "followUp", "costs", "warnings", "report"]);
      break;
    case "imaging":
      hideBlocks(["clinical", "department", "steps", "actions", "items", "followUp", "costs", "warnings", "report"]);
      break;
    case "followup":
      hideBlocks(["clinical", "department", "steps", "actions", "items", "imaging", "costs", "warnings", "report"]);
      break;
    case "surgery":
      hideBlocks(["department", "costs", "report"]);
      break;
    case "warnings":
      hideBlocks(["clinical", "department", "steps", "actions", "items", "imaging", "followUp", "costs", "warnings", "report"]);
      BLOCKS.alerts.classList.remove("is-hidden");
      BLOCKS.priority.classList.remove("is-hidden");
      BLOCKS.operation.classList.remove("is-hidden");
      break;
    default:
      break;
  }
}

function hideBlocks(keys) {
  keys.forEach((key) => {
    if (BLOCKS[key]) BLOCKS[key].classList.add("is-hidden");
  });
}

/* =========================================================
   RESET / COPY
========================================================= */

function handleReset() {
  LAST_RESULT = null;
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

  operationBadge.className = "operation-badge neutral";
  operationBadge.textContent = "Nog niet berekend";
  operationReason.textContent = "Nog geen reden bepaald.";

  closingStatusBadge.className = "closing-badge neutral";
  closingStatusBadge.textContent = "Nog niet bepaald";
  closingStatusText.textContent = "Nog geen afsluitstatus voorgesteld.";

  renderList(alertsList, [], "Nog geen prioritaire waarschuwingen.");
  renderList(clinicalImpressionList, [], "Nog geen klinische indruk.");
  renderTagList(departmentTags, [], "Nog geen advies");
  renderList(stepsList, [], "Vul de gegevens in en genereer het behandeladvies.");
  renderList(actionsList, [], "Vul de gegevens in en genereer het behandeladvies.");
  renderList(itemsList, [], "Nog geen items geselecteerd.");
  renderList(imagingNoneList, [], "Nog geen beoordeling.");
  renderList(imagingRxList, [], "Nog geen RX-advies.");
  renderList(imagingCtList, [], "Nog geen CT-advies.");
  renderList(imagingObserveList, [], "Nog geen observatie-advies.");
  renderList(followUpList, [], "Nog geen nazorg voorgesteld.");
  renderList(warningsList, [], "Nog geen aandachtspunten.");
  renderExtraCostGroups();
  updateCostProfileHelp();
  renderCosts({ injuries: 0, items: 0, investigations: 0, extras: 0, total: 0, breakdown: [] });

  reportSummary.value = "";
  applyDisplayMode();
}

function handleCopySummary() {
  const text = reportSummary.value.trim();

  if (!text) {
    alert("Er is nog geen samenvatting om te kopiëren.");
    return;
  }

  navigator.clipboard.writeText(text)
    .then(() => alert("Samenvatting gekopieerd."))
    .catch(() => alert("Kopiëren is niet gelukt."));
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