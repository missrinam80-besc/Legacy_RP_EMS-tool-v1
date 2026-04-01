
let APP_CONFIG = null;

const injuryRows = document.getElementById("injuryRows");
const customRows = document.getElementById("customRows");
const departmentSelect = document.getElementById("departmentSelect");
const departmentExtras = document.getElementById("departmentExtras");
const itemOptions = document.getElementById("itemOptions");
const investigationOptions = document.getElementById("investigationOptions");

const addInjuryBtn = document.getElementById("addInjuryBtn");
const addCustomBtn = document.getElementById("addCustomBtn");
const calculateBtn = document.getElementById("calculateBtn");
const resetBtn = document.getElementById("resetBtn");
const copySummaryBtn = document.getElementById("copySummaryBtn");

const costInjuries = document.getElementById("costInjuries");
const costItems = document.getElementById("costItems");
const costInvestigations = document.getElementById("costInvestigations");
const costDepartmentExtras = document.getElementById("costDepartmentExtras");
const costCustom = document.getElementById("costCustom");
const costTotal = document.getElementById("costTotal");
const costBreakdownList = document.getElementById("costBreakdownList");
const summaryOutput = document.getElementById("summaryOutput");
const statusMessage = document.querySelector(".status-message");

const injuryRowTemplate = document.getElementById("injuryRowTemplate");
const customRowTemplate = document.getElementById("customRowTemplate");

const DEPARTMENT_UI_MAP = {
  general: "algemeen",
  spoed: "spoed",
  chirurgie: "chirurgie",
  psychologie: "psychologie",
  ortho: "ortho-revalidatie"
};

const LEGACY_ITEM_ALIAS_MAP = {
  morphine: ["morphine", "med_morphine"],
  epinephrine: ["epinephrine", "med_epinephrine", "adrenaline"],
  propofol: ["propofol", "med_propofol"],
  tourniquet: ["tourniquet", "tool_tourniquet"],
  field_dressing: ["field_dressing", "sup_bandage", "verband"],
  elastic_bandage: ["elastic_bandage", "elastisch_verband"],
  quick_clot: ["quick_clot"],
  packing_bandage: ["packing_bandage"],
  sewing_kit: ["sewing_kit", "kit_suturing", "hechtset"],
  painkillers: ["painkillers", "painkiller", "analgesie"],
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

document.addEventListener("DOMContentLoaded", initApp);

async function initApp() {
  try {
    const response = await fetch("config.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Config kon niet geladen worden (${response.status})`);
    }

    APP_CONFIG = await response.json();
    await applyCentralData();

    renderDepartmentSelect();
    renderItemCheckboxes();
    renderInvestigationCheckboxes();
    renderDepartmentExtras();
    addInjuryRow();
    bindEvents();
    updateStatus("Klaar. Centrale prijs- en medicatiegegevens zijn geladen.");
  } catch (error) {
    console.error("Fout bij laden van de kostencalculator:", error);
    updateStatus("De calculator werkt met lokale fallbackgegevens.");
    alert("Fout bij laden van de kostencalculator. Controleer config.json en het pad.");
  }
}

async function applyCentralData() {
  const [pricesData, medicationData] = await Promise.all([
    loadCentralType("prices"),
    loadCentralType("medication")
  ]);

  if (pricesData?.items?.length) {
    applyCentralPriceConfig(pricesData);
  }

  if (medicationData?.items?.length) {
    applyCentralMedicationConfig(medicationData);
  }
}

async function loadCentralType(type) {
  try {
    if (window.EMSAdminStore?.get) {
      return await window.EMSAdminStore.get(type);
    }
  } catch (error) {
    console.warn(`[Kostencalculator] Centrale ${type}-store niet beschikbaar, fallback wordt gebruikt.`, error);
  }

  const fallbackMap = {
    prices: "../../data/admin/default-prices.json",
    medication: "../../data/admin/default-medication.json"
  };

  const path = fallbackMap[type];
  if (!path) return null;

  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn(`[Kostencalculator] Fallbackbestand voor ${type} kon niet geladen worden.`, error);
    return null;
  }
}

function applyCentralMedicationConfig(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const activeItems = items.filter((item) => item.active !== false);

  activeItems.forEach((item) => {
    const targetCode = getLegacyItemCode(item);
    APP_CONFIG.itemLabels[targetCode] = item.name || item.label || targetCode;

    if (!APP_CONFIG.costs.items[targetCode] && Number(item.price) > 0) {
      APP_CONFIG.costs.items[targetCode] = Number(item.price);
    }
  });
}

function applyCentralPriceConfig(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const activeItems = items
    .filter((item) => item.active !== false)
    .filter((item) => item.visibleInCalculator !== false);

  const extrasByDepartment = {
    general: [],
    spoed: [],
    chirurgie: [],
    psychologie: [],
    ortho: []
  };

  const investigationMap = { ...(APP_CONFIG.costs.investigations || {}) };

  activeItems.forEach((item) => {
    const departmentKey = toUiDepartmentKey(item.department);
    const amount = Number(item.defaultPrice) || 0;
    if (!departmentKey || !amount) return;

    const documentTypes = Array.isArray(item.documentTypes) ? item.documentTypes : [];
    const supportsCalculator = !documentTypes.length || documentTypes.includes("kostencalculator");

    if (!supportsCalculator) return;

    if (item.category === "onderzoek") {
      investigationMap[getInvestigationCode(item)] = amount;
      return;
    }

    extrasByDepartment[departmentKey].push({
      code: item.code || item.id,
      label: item.label,
      amount
    });
  });

  APP_CONFIG.costs.investigations = investigationMap;

  Object.keys(extrasByDepartment).forEach((departmentKey) => {
    const merged = [
      ...(Array.isArray(APP_CONFIG.departmentExtras?.[departmentKey]) ? APP_CONFIG.departmentExtras[departmentKey] : []),
      ...extrasByDepartment[departmentKey]
    ];

    APP_CONFIG.departmentExtras[departmentKey] = dedupeByCode(merged)
      .sort((a, b) => String(a.label || "").localeCompare(String(b.label || ""), "nl"));
  });
}

function bindEvents() {
  addInjuryBtn.addEventListener("click", addInjuryRow);
  addCustomBtn.addEventListener("click", addCustomRow);
  calculateBtn.addEventListener("click", handleCalculate);
  resetBtn.addEventListener("click", handleReset);
  copySummaryBtn.addEventListener("click", handleCopySummary);
  departmentSelect.addEventListener("change", renderDepartmentExtras);

  [injuryRows, customRows].forEach((container) => {
    container.addEventListener("click", (event) => {
      const removeBtn = event.target.closest(".btn-remove-row");
      if (!removeBtn) return;

      const row = removeBtn.closest(".dynamic-row");
      if (row) row.remove();

      if (!injuryRows.children.length) addInjuryRow();
    });
  });
}

function renderDepartmentSelect() {
  departmentSelect.innerHTML = APP_CONFIG.selectOptions.departments
    .map((option) => `<option value="${escapeAttr(option.value)}">${escapeHtml(option.label)}</option>`)
    .join("");
}

function renderItemCheckboxes() {
  itemOptions.innerHTML = Object.entries(APP_CONFIG.itemLabels)
    .map(([code, label]) => buildCheckboxHtml(`item-${code}`, code, `${label}${APP_CONFIG.costs.items?.[code] ? ` (€ ${APP_CONFIG.costs.items[code]})` : ""}`, "itemOption"))
    .join("");
}

function renderInvestigationCheckboxes() {
  investigationOptions.innerHTML = Object.entries(APP_CONFIG.costs.investigations)
    .map(([code, amount]) => buildCheckboxHtml(`investigation-${code}`, code, `${beautifyInvestigationLabel(code)} (€ ${amount})`, "investigationOption"))
    .join("");
}

function renderDepartmentExtras() {
  const departmentKey = departmentSelect.value || "general";
  const options = APP_CONFIG.departmentExtras[departmentKey] || [];

  departmentExtras.innerHTML = options.length
    ? options.map((entry) => buildCheckboxHtml(`extra-${entry.code}`, entry.code, `${entry.label} (€ ${entry.amount})`, "departmentExtra")).join("")
    : "<p class=\"help-text\">Geen extra kosten ingesteld voor deze afdeling.</p>";
}

function buildCheckboxHtml(id, value, label, group) {
  return `
    <label class="checkbox-item">
      <input type="checkbox" id="${escapeAttr(id)}" data-group="${escapeAttr(group)}" value="${escapeAttr(value)}" />
      <span>${escapeHtml(label)}</span>
    </label>
  `;
}

function addInjuryRow() {
  if (!injuryRowTemplate) return;

  const clone = injuryRowTemplate.content.cloneNode(true);
  const row = clone.querySelector(".injury-row");
  const woundType = row.querySelector('[data-field="woundType"]');
  const severity = row.querySelector('[data-field="severity"]');

  woundType.innerHTML = APP_CONFIG.woundOptions
    .map((option) => `<option value="${escapeAttr(option.value)}">${escapeHtml(option.label)}</option>`)
    .join("");

  severity.innerHTML = APP_CONFIG.selectOptions.injurySeverity
    .map((option) => `<option value="${escapeAttr(option.value)}">${escapeHtml(option.label)}</option>`)
    .join("");

  injuryRows.appendChild(clone);
}

function addCustomRow() {
  if (!customRowTemplate) return;
  customRows.appendChild(customRowTemplate.content.cloneNode(true));
}

function handleCalculate() {
  const result = calculateCosts();
  renderCosts(result);
}

function calculateCosts() {
  const breakdown = [];
  const totals = {
    injuries: 0,
    items: 0,
    investigations: 0,
    departmentExtras: 0,
    custom: 0
  };

  getInjuryData().forEach((injury) => {
    if (!injury.woundType) return;

    const woundBase = APP_CONFIG.costs.wounds[injury.woundType] ?? APP_CONFIG.costs.defaultWound ?? 0;
    const multiplier = APP_CONFIG.costs.severityMultipliers[injury.severity] ?? 1;
    const amount = Math.round(woundBase * multiplier);

    addBreakdownLine(breakdown, totals, "injuries", `${getWoundLabel(injury.woundType)} (${getSeverityLabel(injury.severity)})`, amount);

    if (injury.fracture) {
      addBreakdownLine(
        breakdown,
        totals,
        "injuries",
        `Fractuurtoeslag (${getWoundLabel(injury.woundType)})`,
        APP_CONFIG.costs.fractureSurcharge || 0
      );
    }
  });

  getCheckedValues("itemOption").forEach((code) => {
    const amount = APP_CONFIG.costs.items[code] ?? 0;
    addBreakdownLine(breakdown, totals, "items", APP_CONFIG.itemLabels[code] || code, amount);
  });

  getCheckedValues("investigationOption").forEach((code) => {
    const amount = APP_CONFIG.costs.investigations[code] ?? 0;
    addBreakdownLine(breakdown, totals, "investigations", beautifyInvestigationLabel(code), amount);
  });

  const departmentKey = departmentSelect.value || "general";
  const extrasMap = Object.fromEntries((APP_CONFIG.departmentExtras[departmentKey] || []).map((entry) => [entry.code, entry]));

  getCheckedValues("departmentExtra").forEach((code) => {
    const entry = extrasMap[code];
    if (!entry) return;
    addBreakdownLine(breakdown, totals, "departmentExtras", `${getDepartmentLabel(departmentKey)}: ${entry.label}`, entry.amount || 0);
  });

  getCustomCostData().forEach((entry) => {
    if (!entry.label || !entry.amount) return;
    addBreakdownLine(breakdown, totals, "custom", entry.label, entry.amount);
  });

  const total = totals.injuries + totals.items + totals.investigations + totals.departmentExtras + totals.custom;

  return {
    department: getDepartmentLabel(departmentKey),
    totals,
    total,
    breakdown,
    summary: buildSummary(getDepartmentLabel(departmentKey), totals, total, breakdown)
  };
}

function addBreakdownLine(breakdown, totals, bucket, label, amount) {
  if (!amount) return;
  totals[bucket] += amount;
  breakdown.push({ bucket, label, amount });
}

function getInjuryData() {
  return Array.from(injuryRows.querySelectorAll(".injury-row")).map((row) => ({
    woundType: row.querySelector('[data-field="woundType"]')?.value || "",
    severity: row.querySelector('[data-field="severity"]')?.value || "moderate",
    fracture: row.querySelector('[data-field="fracture"]')?.checked || false
  }));
}

function getCustomCostData() {
  return Array.from(customRows.querySelectorAll(".custom-row")).map((row) => ({
    label: row.querySelector('[data-field="label"]')?.value?.trim() || "",
    amount: Number(row.querySelector('[data-field="amount"]')?.value || 0)
  }));
}

function getCheckedValues(groupName) {
  return Array.from(document.querySelectorAll(`[data-group="${groupName}"]:checked`)).map((input) => input.value);
}

function buildSummary(department, totals, total, breakdown) {
  const lines = [];
  lines.push(`Afdeling: ${department}`);
  lines.push(`Letsels: ${formatCurrency(totals.injuries)}`);
  lines.push(`Items / behandelingen: ${formatCurrency(totals.items)}`);
  lines.push(`Onderzoeken: ${formatCurrency(totals.investigations)}`);
  lines.push(`Afdelingskosten: ${formatCurrency(totals.departmentExtras)}`);
  lines.push(`Vrije extra kosten: ${formatCurrency(totals.custom)}`);
  lines.push(`Totaal: ${formatCurrency(total)}`);

  if (breakdown.length) {
    lines.push("");
    lines.push("Detail:");
    breakdown.forEach((entry) => {
      lines.push(`- ${entry.label}: ${formatCurrency(entry.amount)}`);
    });
  }

  return lines.join("\n");
}

function renderCosts(result) {
  costInjuries.textContent = formatCurrency(result.totals.injuries);
  costItems.textContent = formatCurrency(result.totals.items);
  costInvestigations.textContent = formatCurrency(result.totals.investigations);
  costDepartmentExtras.textContent = formatCurrency(result.totals.departmentExtras);
  costCustom.textContent = formatCurrency(result.totals.custom);
  costTotal.textContent = formatCurrency(result.total);
  summaryOutput.value = result.summary;

  costBreakdownList.innerHTML = "";
  if (!result.breakdown.length) {
    const li = document.createElement("li");
    li.textContent = "Nog geen kostenraming.";
    costBreakdownList.appendChild(li);
    return;
  }

  result.breakdown.forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = `${entry.label}: ${formatCurrency(entry.amount)}`;
    costBreakdownList.appendChild(li);
  });
}

function handleReset() {
  injuryRows.innerHTML = "";
  customRows.innerHTML = "";
  document.querySelectorAll('input[type="checkbox"]').forEach((el) => { el.checked = false; });
  departmentSelect.selectedIndex = 0;
  renderDepartmentExtras();
  addInjuryRow();
  renderCosts({
    totals: { injuries: 0, items: 0, investigations: 0, departmentExtras: 0, custom: 0 },
    total: 0,
    breakdown: [],
    summary: ""
  });
  updateStatus("De calculator is gereset.");
}

function handleCopySummary() {
  const text = summaryOutput.value.trim();
  if (!text) {
    alert("Er is nog geen overzicht om te kopiëren.");
    return;
  }

  navigator.clipboard.writeText(text)
    .then(() => alert("Kostenoverzicht gekopieerd."))
    .catch(() => alert("Kopiëren is niet gelukt."));
}

function toUiDepartmentKey(adminDepartment) {
  const normalized = String(adminDepartment || "").trim().toLowerCase();
  return Object.entries(DEPARTMENT_UI_MAP).find(([, value]) => value === normalized)?.[0] || null;
}

function getLegacyItemCode(item) {
  const normalized = String(item?.id || item?.name || item?.label || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const match = Object.entries(LEGACY_ITEM_ALIAS_MAP).find(([, aliases]) => aliases.includes(normalized));
  if (match) return match[0];
  return normalized || "item_onbekend";
}

function getInvestigationCode(item) {
  const base = String(item.code || item.label || item.id || "onderzoek")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (base.includes("ct")) return "ct";
  if (base.includes("rx") || base.includes("röntgen") || base.includes("rontgen")) return "rx";
  if (base.includes("observ")) return "observatie";
  if (base.includes("beeld")) return "beeldvorming";
  return base || "onderzoek";
}

function dedupeByCode(entries) {
  const map = new Map();
  entries.forEach((entry) => {
    if (!entry?.code) return;
    map.set(entry.code, entry);
  });
  return Array.from(map.values());
}

function beautifyInvestigationLabel(value) {
  const text = String(value || "");
  if (!text) return "Onderzoek";
  if (text.toLowerCase() === "rx") return "RX";
  if (text.toLowerCase() === "ct") return "CT";
  return text
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getWoundLabel(woundValue) {
  const found = APP_CONFIG.woundOptions.find((option) => option.value === woundValue);
  return found ? found.label : woundValue;
}

function getSeverityLabel(severityValue) {
  const found = APP_CONFIG.selectOptions.injurySeverity.find((option) => option.value === severityValue);
  return found ? found.label : severityValue;
}

function getDepartmentLabel(departmentValue) {
  const found = APP_CONFIG.selectOptions.departments.find((option) => option.value === departmentValue);
  return found ? found.label : departmentValue;
}

function formatCurrency(amount) {
  return `€ ${Number(amount || 0).toLocaleString("nl-BE")}`;
}

function updateStatus(text) {
  if (statusMessage) {
    statusMessage.textContent = text;
  }
}

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
