let CONFIG = {};

const CENTRAL_REPORT_OPTIONS = { documentType: 'rapport-revalidatie', department: 'ortho' };let STAFF_ROWS = [];

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    CONFIG = await loadConfig();
    fillSelects();
    bindEvents();
    presetDateTime();
    await initStaffFields();
    restoreDraft();
    await initCentralReportEnhancements();
    buildReport();
    showStatus("Klaar. Je kunt het revalidatierapport invullen en opbouwen.", "neutral");
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
  const lead = $("#leadTherapist");
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


async function initCentralReportEnhancements() {
  if (!window.EMSReportCentral?.init) return;

  try {
    await window.EMSReportCentral.init({
      storageKey: CONFIG.storageKey || config?.storageKey || 'rapport-revalidatie',
      documentType: CENTRAL_REPORT_OPTIONS.documentType,
      department: CENTRAL_REPORT_OPTIONS.department,
      onChange: () => {
        try {
          buildReport();
        } catch (error) {
          console.warn('[EMSReportCentral] Rapport kon niet opnieuw worden opgebouwd.', error);
        }
      }
    });
  } catch (error) {
    console.warn('[EMSReportCentral] Centrale rapportlaag kon niet geladen worden.', error);
  }
}

function finalizeReportWithCentralData(reportText) {
  if (!window.EMSReportCentral?.appendSections) return reportText;
  return window.EMSReportCentral.appendSections(reportText, CENTRAL_REPORT_OPTIONS);
}

function bindEvents() {
  $("#buildBtn")?.addEventListener("click", () => {
    buildReport();
    saveDraft();
    showStatus("Rapport opgebouwd.", "success");
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
    injuryType: sanitize($("#injuryType")?.value),
    urgency: sanitize($("#urgency")?.value),
    reason: sanitize($("#reason")?.value),
    leadTherapist: sanitize($("#leadTherapist")?.value),
    assistants: getMultiValues("#assistants"),
    bodyZone: sanitize($("#bodyZone")?.value),
    postSurgery: sanitize($("#postSurgery")?.value),
    mobilityLevel: sanitize($("#mobilityLevel")?.value),
    painLevel: sanitize($("#painLevel")?.value),
    stability: sanitize($("#stability")?.value),
    weightBearing: sanitize($("#weightBearing")?.value),
    healingPhase: sanitize($("#healingPhase")?.value),
    findings: sanitize($("#findings")?.value),
    restrictions: sanitize($("#restrictions")?.value),
    supportAid: sanitize($("#supportAid")?.value),
    trajectoryIntensity: sanitize($("#trajectoryIntensity")?.value),
    referralDepartment: sanitize($("#referralDepartment")?.value),
    recoveryPlan: sanitize($("#recoveryPlan")?.value),
    followUp: sanitize($("#followUp")?.value),
    outcomeStatus: sanitize($("#outcomeStatus")?.value),
    estimatedDuration: sanitize($("#estimatedDuration")?.value),
    costTotal: sanitize($("#costTotal")?.value),
    costNotes: sanitize($("#costNotes")?.value),
    summaryNotes: sanitize($("#summaryNotes")?.value)
  };
}

function buildReport() {
  const d = collectData();
  const lines = [
    "EMS REVALIDATIERAPPORT",
    "=====================",
    "",
    section("Patiëntgegevens", [
      row("Naam patiënt", d.patientName),
      row("Geboortedatum", formatDate(d.patientDob))
    ]),
    section("Casusgegevens", [
      row("Locatie", d.location),
      row("Herkomst casus", d.caseOrigin),
      row("Datum", formatDate(d.consultDate)),
      row("Uur", d.consultTime),
      row("Type letsel", d.injuryType),
      row("Urgentie", d.urgency),
      row("Aanmelding / reden", d.reason)
    ]),
    section("Behandelaar & betrokken zone", [
      row("Behandelaar", d.leadTherapist),
      row("Assistenten / aanwezigen", joinList(d.assistants)),
      row("Betrokken zone", d.bodyZone),
      row("Postoperatief", d.postSurgery)
    ]),
    section("Mobiliteitscheck", [
      row("Mobiliteit", d.mobilityLevel),
      row("Pijnniveau", d.painLevel),
      row("Stabiliteit", d.stability),
      row("Belastbaarheid", d.weightBearing),
      row("Herstelfase", d.healingPhase),
      row("Bevindingen", d.findings),
      row("Beperkingen", d.restrictions)
    ]),
    section("Herstelplan & hulpmiddelen", [
      row("Hulpmiddel", d.supportAid),
      row("Trajectintensiteit", d.trajectoryIntensity),
      row("Doorverwijzing", d.referralDepartment),
      row("Herstelplan", d.recoveryPlan),
      row("Opvolging", d.followUp)
    ]),
    section("Resultaat", [
      row("Resultaatstatus", d.outcomeStatus),
      row("Geschatte duur herstel", d.estimatedDuration)
    ]),
    section("Kosten", [
      row("Totaalbedrag", d.costTotal ? `€ ${d.costTotal}` : "-"),
      row("Kostennotitie", d.costNotes)
    ]),
    section("Extra notities", [row("Notities", d.summaryNotes)])
  ].filter(Boolean);

  const report = lines.join("\n");
  const finalReport = finalizeReportWithCentralData(report);
  $("#reportOutput").value = finalReport;
  const preview = $("#reportPreview");
  preview.textContent = finalReport;
  preview.style.whiteSpace = "pre-wrap";
  return finalReport;
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
    departmentKey: "revalidatie",
    label: "ortho / revalidatie",
    stage: "report",
    autoImport: true,
    importLabel: "Importeer tool",
    importMapping: {
      patientName: "patientName",
      patientDob: "patientDob",
      location: "location",
      injuryType: "injuryType",
      mobilityLevel: "mobilityLevel",
      stability: "stability",
      injurySummary: "reason",
      restrictions: "restrictions",
      supportAid: "supportAid",
      recoveryPlan: "recoveryPlan",
      followupPlan: "followUp",
      extraInfo: "summaryNotes"
    },
    steps: [
      { id: "request", title: "1. Aanvraag", shortTitle: "aanvraag", url: "../aanvraag-ortho-prioritair/index.html" },
      { id: "tool", title: "2. Tool", shortTitle: "tool", url: "../revalidatie-tool/index.html" },
      { id: "report", title: "3. Rapport", shortTitle: "rapport", url: window.location.pathname }
    ],
    collectValues: collectData,
    buildSummary: buildReport
  });
});

