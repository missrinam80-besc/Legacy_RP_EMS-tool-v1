let CONFIG = {};
let STAFF_ROWS = [];

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    CONFIG = await loadConfig();
    fillSelects();
    bindEvents();
    presetDateTime();
    await initStaffFields();
    restoreDraft();
    buildReport();
    showStatus("Klaar. Je kunt het psychologisch verslag invullen en opbouwen.", "neutral");
  } catch (error) {
    showStatus(`Fout bij laden: ${error.message}`, "danger");
  }
}

async function loadConfig() {
  const response = await fetch("./config.json");
  if (!response.ok) throw new Error("config.json kon niet geladen worden.");
  return response.json();
}

function $(selector) {
  return document.querySelector(selector);
}

function fillSelects() {
  const selects = CONFIG.selects || {};
  Object.entries(selects).forEach(([id, options]) => fillSelect(`#${id}`, options));
}

function fillSelect(selector, options = []) {
  const el = $(selector);
  if (!el) return;
  el.innerHTML = `<option value="">Kies een optie</option>`;
  options.forEach(option => {
    const node = document.createElement("option");
    node.value = option;
    node.textContent = option;
    el.appendChild(node);
  });
}

async function initStaffFields() {
  if (!window.EmsStaffService || !CONFIG.staffApiUrl) return;
  window.EmsStaffService.setApiUrl(CONFIG.staffApiUrl);
  STAFF_ROWS = await window.EmsStaffService.getVisibleStaff();
  populateStaffSelects();
}

function populateStaffSelects() {
  const lead = $("#leadPsychologist");
  const assistants = $("#assistants");
  if (!lead || !assistants || !window.EmsStaffService) return;

  window.EmsStaffService.populateSelect(lead, STAFF_ROWS, {
    includeEmpty: true,
    emptyLabel: "Kies een behandelaar",
    labelFormat: CONFIG.staffLabelFormat || "naam-roepnummer-rang",
    valueField: "naam"
  });

  window.EmsStaffService.populateSelect(assistants, STAFF_ROWS, {
    includeEmpty: false,
    labelFormat: CONFIG.staffLabelFormat || "naam-roepnummer-rang",
    valueField: "naam"
  });
}

function bindEvents() {
  $("#buildBtn")?.addEventListener("click", () => {
    buildReport();
    saveDraft();
    showStatus("Verslag opgebouwd.", "success");
  });
  $("#copyBtn")?.addEventListener("click", handleCopy);
  $("#resetBtn")?.addEventListener("click", handleReset);
  $("#parseLogBtn")?.addEventListener("click", parseLog);

  document.querySelectorAll("input, textarea, select").forEach(el => {
    el.addEventListener("input", debounce(handleAutoChange, 180));
    el.addEventListener("change", handleAutoChange);
  });
}

function handleAutoChange() {
  buildReport();
  saveDraft();
}

function presetDateTime() {
  const now = new Date();
  if ($("#consultDate") && !$("#consultDate").value) $("#consultDate").value = toDateInputValue(now);
  if ($("#consultTime") && !$("#consultTime").value) $("#consultTime").value = toTimeInputValue(now);
}

function parseLog() {
  const raw = sanitize($("#medicalLog")?.value);
  if (!raw) {
    showStatus("Er is geen tekstlog om uit te lezen.", "warning");
    return;
  }

  if (!$("#reason").value.trim()) $("#reason").value = raw.slice(0, 3000);
  const notes = $("#summaryNotes").value.trim();
  $("#summaryNotes").value = notes ? `${notes}\n\n[Uit log gehaald]\n${raw}` : `[Uit log gehaald]\n${raw}`;
  buildReport();
  saveDraft();
  showStatus("Tekstlog toegevoegd aan het verslag.", "success");
}

function collectData() {
  return {
    patientName: sanitize($("#patientName")?.value),
    patientDob: sanitize($("#patientDob")?.value),
    location: sanitize($("#location")?.value),
    caseOrigin: sanitize($("#caseOrigin")?.value),
    consultDate: sanitize($("#consultDate")?.value),
    consultTime: sanitize($("#consultTime")?.value),
    caseType: sanitize($("#caseType")?.value),
    urgency: sanitize($("#urgency")?.value),
    reason: sanitize($("#reason")?.value),
    leadPsychologist: sanitize($("#leadPsychologist")?.value),
    assistants: getMultiValues("#assistants"),
    network: sanitize($("#network")?.value),
    riskLevel: sanitize($("#riskLevel")?.value),
    mentalState: sanitize($("#mentalState")?.value),
    cooperation: sanitize($("#cooperation")?.value),
    orientation: sanitize($("#orientation")?.value),
    sleepFunctioning: sanitize($("#sleepFunctioning")?.value),
    observations: sanitize($("#observations")?.value),
    workingDiagnosis: sanitize($("#workingDiagnosis")?.value),
    trajectoryType: sanitize($("#trajectoryType")?.value),
    sessionFrequency: sanitize($("#sessionFrequency")?.value),
    medicationAdvice: sanitize($("#medicationAdvice")?.value),
    referralDepartment: sanitize($("#referralDepartment")?.value),
    interventions: sanitize($("#interventions")?.value),
    advicePlan: sanitize($("#advicePlan")?.value),
    outcomeStatus: sanitize($("#outcomeStatus")?.value),
    nextContact: sanitize($("#nextContact")?.value),
    costTotal: sanitize($("#costTotal")?.value),
    costNotes: sanitize($("#costNotes")?.value),
    summaryNotes: sanitize($("#summaryNotes")?.value)
  };
}

function buildReport() {
  const d = collectData();
  const lines = [
    "EMS PSYCHOLOGISCH VERSLAG",
    "========================",
    "",
    section("Patiëntgegevens", [
      row("Naam patiënt", d.patientName),
      row("Geboortedatum", formatDate(d.patientDob))
    ]),
    section("Consultgegevens", [
      row("Locatie", d.location),
      row("Herkomst casus", d.caseOrigin),
      row("Datum", formatDate(d.consultDate)),
      row("Uur", d.consultTime),
      row("Type casus", d.caseType),
      row("Urgentie", d.urgency),
      row("Aanmelding / hulpvraag", d.reason)
    ]),
    section("Psycholoog & betrokkenen", [
      row("Behandelend psycholoog", d.leadPsychologist),
      row("Assistenten / aanwezigen", joinList(d.assistants)),
      row("Betrokken netwerk of diensten", d.network)
    ]),
    section("Mentale inschatting", [
      row("Risiconiveau", d.riskLevel),
      row("Mentale toestand", d.mentalState),
      row("Medewerking", d.cooperation),
      row("Oriëntatie", d.orientation),
      row("Slaap / functioneren", d.sleepFunctioning),
      row("Observaties", d.observations),
      row("Werkdiagnose / inschatting", d.workingDiagnosis)
    ]),
    section("Traject & advies", [
      row("Type traject", d.trajectoryType),
      row("Frequentie", d.sessionFrequency),
      row("Medicatie / psychiatrisch advies", d.medicationAdvice),
      row("Doorverwijzing", d.referralDepartment),
      row("Uitgevoerde interventies", d.interventions),
      row("Advies en plan", d.advicePlan)
    ]),
    section("Opvolging", [
      row("Status na consult", d.outcomeStatus),
      row("Volgend contactmoment", d.nextContact)
    ]),
    section("Kosten", [
      row("Totaalbedrag", d.costTotal ? `€ ${d.costTotal}` : "-"),
      row("Kostennotitie", d.costNotes)
    ]),
    section("Extra notities", [row("Notities", d.summaryNotes)])
  ].filter(Boolean);

  const report = lines.join("\n");
  $("#reportOutput").value = report;
  const preview = $("#reportPreview");
  preview.textContent = report;
  preview.style.whiteSpace = "pre-wrap";
  return report;
}

function section(title, rows) {
  const filtered = rows.filter(Boolean);
  if (!filtered.length) return "";
  return `${title}\n${"-".repeat(title.length)}\n${filtered.join("\n")}\n`;
}

function row(label, value) {
  return value ? `${label}: ${value}` : "";
}

function getMultiValues(selector) {
  const el = $(selector);
  if (!el) return [];
  return Array.from(el.selectedOptions).map(o => o.value).filter(Boolean);
}

function joinList(items) {
  return items && items.length ? items.join(", ") : "";
}

function sanitize(value) {
  return String(value || "").replace(/\r/g, "").trim();
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("nl-BE").format(date);
}

function toDateInputValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function toTimeInputValue(date) {
  return `${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}`;
}

function saveDraft() {
  localStorage.setItem(CONFIG.storageKey, JSON.stringify(Object.fromEntries(new FormData(document.querySelector("body form") || document.createElement("form")))));
  const payload = {};
  document.querySelectorAll("input, textarea, select").forEach(el => {
    if (el.multiple) payload[el.id] = Array.from(el.selectedOptions).map(o => o.value);
    else payload[el.id] = el.value;
  });
  localStorage.setItem(CONFIG.storageKey, JSON.stringify(payload));
}

function restoreDraft() {
  const raw = localStorage.getItem(CONFIG.storageKey);
  if (!raw) return;
  try {
    const payload = JSON.parse(raw);
    Object.entries(payload).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.multiple && Array.isArray(value)) {
        Array.from(el.options).forEach(option => {
          option.selected = value.includes(option.value);
        });
      } else {
        el.value = value ?? "";
      }
    });
  } catch {
    /* noop */
  }
}

async function handleCopy() {
  const text = buildReport();
  if (!text.trim()) return;
  try {
    await navigator.clipboard.writeText(text);
    showStatus("Verslag gekopieerd naar klembord.", "success");
  } catch {
    showStatus("Kopiëren mislukt. Selecteer de tekst handmatig.", "warning");
  }
}

function handleReset() {
  if (!confirm("Wil je alle velden resetten?")) return;
  document.querySelectorAll("input, textarea, select").forEach(el => {
    if (el.multiple) Array.from(el.options).forEach(o => o.selected = false);
    else el.value = "";
  });
  localStorage.removeItem(CONFIG.storageKey);
  presetDateTime();
  buildReport();
  showStatus("Alle velden zijn gereset.", "success");
}

function showStatus(message, type = "neutral") {
  const box = $("#statusBox");
  if (!box) return;
  box.textContent = message;
  box.className = `status-box status--${type}`;
}

function debounce(fn, delay = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}



document.addEventListener("DOMContentLoaded", () => {
  if (!window.DepartmentFlow) return;
  DepartmentFlow.init({
    departmentKey: "psychologie",
    label: "psychologie",
    stage: "report",
    autoImport: true,
    importLabel: "Importeer tool",
    importMapping: {
      patientName: "patientName",
      patientDob: "patientDob",
      location: "location",
      caseOrigin: "caseOrigin",
      caseType: "caseType",
      requestReason: "reason",
      intakeSummary: "reason",
      supportGoal: "advicePlan",
      contextNotes: "workingDiagnosis",
      mentalState: "mentalState",
      riskLevel: "riskLevel",
      riskNotes: "observations",
      rpApproach: "interventions",
      followupPlan: "advicePlan",
      extraInfo: "summaryNotes"
    },
    steps: [
      { id: "request", title: "1. Aanvraag", shortTitle: "aanvraag", url: "../aanvraag-psychologie-crisis/index.html" },
      { id: "tool", title: "2. Tool", shortTitle: "tool", url: "../psychologie-tool/index.html" },
      { id: "report", title: "3. Rapport", shortTitle: "rapport", url: window.location.pathname }
    ],
    collectValues: collectData,
    buildSummary: buildReport
  });
});

