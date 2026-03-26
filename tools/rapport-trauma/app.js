/**
 * EMS Trauma Rapport v2
 * ---------------------
 * Functies:
 * - Patiëntgegevens bovenaan
 * - 2-koloms layout
 * - Uitklapbare secties
 * - Verwondingen per ledemaat (meerdere mogelijk)
 * - Kostentool import
 * - Medische log import
 * - Rapport opbouwen
 * - Rapport kopiëren
 * - Optioneel Discord log via proxy/webhook-endpoint
 *
 * Belangrijk:
 * Zet NOOIT een ruwe Discord webhook rechtstreeks in frontend code.
 * Gebruik bij voorkeur een veilige tussenlaag.
 */

let CONFIG = {};
const injuryState = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    CONFIG = await loadConfig();
    fillBasicSelects();
    buildInjurySections();
    bindEvents();
    presetDateTime();
    buildReport();
  } catch (error) {
    showStatus(`Fout bij laden: ${error.message}`, "danger");
  }
}

async function loadConfig() {
  const response = await fetch("./config.json");
  if (!response.ok) {
    throw new Error("config.json kon niet geladen worden.");
  }
  return response.json();
}

function bindEvents() {
  $("#buildBtn").addEventListener("click", buildReport);
  $("#copyBtn").addEventListener("click", handleCopy);
  $("#resetBtn").addEventListener("click", handleReset);
  $("#parseLogBtn").addEventListener("click", parseMedicalLog);

  document.querySelectorAll("input, textarea, select").forEach(el => {
    el.addEventListener("input", debounce(buildReport, 150));
    el.addEventListener("change", buildReport);
  });
}

function presetDateTime() {
  const now = new Date();
  $("#incidentDate").value = toDateInputValue(now);
  $("#incidentTime").value = toTimeInputValue(now);
}

function fillBasicSelects() {
  fillSelect("#pulseType", CONFIG.pulseOptions || []);
  fillSelect("#temperatureState", CONFIG.temperatureOptions || []);
  fillSelect("#bloodLoss", CONFIG.bloodLossOptions || []);
  fillSelect("#painLevel", CONFIG.painOptions || []);
}

function fillSelect(selector, options) {
  const select = $(selector);
  select.innerHTML = `<option value="">Kies een optie</option>`;
  options.forEach(option => {
    const el = document.createElement("option");
    el.value = option;
    el.textContent = option;
    select.appendChild(el);
  });
}

function buildInjurySections() {
  const container = $("#injurySections");
  container.innerHTML = "";

  (CONFIG.bodyParts || []).forEach(part => {
    injuryState[part] = [];

    const block = document.createElement("section");
    block.className = "injury-block";
    block.dataset.part = part;

    block.innerHTML = `
      <div class="injury-block-header">
        <h3>${escapeHtml(part)}</h3>
        <button type="button" class="btn btn-secondary add-injury-btn" data-part="${escapeAttr(part)}">
          + Verwonding toevoegen
        </button>
      </div>
      <div class="injury-list" id="injury-list-${slugify(part)}"></div>
    `;

    container.appendChild(block);
  });

  container.querySelectorAll(".add-injury-btn").forEach(btn => {
    btn.addEventListener("click", () => addInjuryItem(btn.dataset.part));
  });
}

function addInjuryItem(part, initialData = {}) {
  const list = $(`#injury-list-${slugify(part)}`);
  if (!list) return;

  const id = cryptoRandomId();
  injuryState[part].push({
    id,
    type: initialData.type || "",
    severity: initialData.severity || "",
    note: initialData.note || ""
  });

  renderInjuryList(part);
  buildReport();
}

function renderInjuryList(part) {
  const list = $(`#injury-list-${slugify(part)}`);
  if (!list) return;

  const items = injuryState[part] || [];
  list.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "muted-line";
    empty.textContent = "Nog geen verwondingen toegevoegd.";
    list.appendChild(empty);
    return;
  }

  items.forEach(item => {
    const wrapper = document.createElement("div");
    wrapper.className = "injury-item";

    const typeOptions = buildOptionsHtml(CONFIG.injuryTypes || [], item.type);
    const severityOptions = buildOptionsHtml(CONFIG.severityOptions || [], item.severity);

    wrapper.innerHTML = `
      <div class="injury-item-grid">
        <div class="field">
          <label>Type verwonding</label>
          <select data-part="${escapeAttr(part)}" data-id="${escapeAttr(item.id)}" data-field="type">
            <option value="">Kies een optie</option>
            ${typeOptions}
          </select>
        </div>

        <div class="field">
          <label>Ernst</label>
          <select data-part="${escapeAttr(part)}" data-id="${escapeAttr(item.id)}" data-field="severity">
            <option value="">Kies een optie</option>
            ${severityOptions}
          </select>
        </div>
      </div>

      <div class="field">
        <label>Toelichting</label>
        <textarea rows="3" placeholder="Extra detail over deze verwonding..."
          data-part="${escapeAttr(part)}"
          data-id="${escapeAttr(item.id)}"
          data-field="note">${escapeHtml(item.note)}</textarea>
      </div>

      <button type="button" class="btn btn-secondary remove-btn"
        data-remove-part="${escapeAttr(part)}"
        data-remove-id="${escapeAttr(item.id)}">
        Verwijder verwonding
      </button>
    `;

    list.appendChild(wrapper);
  });

  list.querySelectorAll("select, textarea").forEach(el => {
    el.addEventListener("input", handleInjuryFieldChange);
    el.addEventListener("change", handleInjuryFieldChange);
  });

  list.querySelectorAll("[data-remove-id]").forEach(btn => {
    btn.addEventListener("click", () => removeInjuryItem(btn.dataset.removePart, btn.dataset.removeId));
  });
}

function handleInjuryFieldChange(event) {
  const part = event.target.dataset.part;
  const id = event.target.dataset.id;
  const field = event.target.dataset.field;
  const value = event.target.value;

  const item = (injuryState[part] || []).find(entry => entry.id === id);
  if (!item) return;

  item[field] = value;
  buildReport();
}

function removeInjuryItem(part, id) {
  injuryState[part] = (injuryState[part] || []).filter(item => item.id !== id);
  renderInjuryList(part);
  buildReport();
}

function parseMedicalLog() {
  const raw = sanitizeText($("#medicalLog").value);
  if (!raw) {
    showStatus("Er is geen tekstlog om uit te lezen.", "warning");
    return;
  }

  const extracted = extractFromLog(raw);

  if (extracted.patientName && !$("#patientName").value.trim()) {
    $("#patientName").value = extracted.patientName;
  }

  if (extracted.leadDoctor && !$("#leadDoctor").value.trim()) {
    $("#leadDoctor").value = extracted.leadDoctor;
  }

  if (extracted.location && !$("#location").value.trim()) {
    $("#location").value = extracted.location;
  }

  if (extracted.heartRate && !$("#heartRate").value.trim()) {
    $("#heartRate").value = extracted.heartRate;
  }

  if (extracted.bpSys && !$("#bpSys").value.trim()) {
    $("#bpSys").value = extracted.bpSys;
  }

  if (extracted.bpDia && !$("#bpDia").value.trim()) {
    $("#bpDia").value = extracted.bpDia;
  }

  if (extracted.summary) {
    const current = $("#summaryNotes").value.trim();
    $("#summaryNotes").value = current
      ? `${current}\n\n[Uit log gehaald]\n${extracted.summary}`
      : `[Uit log gehaald]\n${extracted.summary}`;
  }

  buildReport();
  showStatus("Tekstlog werd ingelezen. Herkende info is waar mogelijk ingevuld.", "success");
}

function extractFromLog(text) {
  const result = {
    patientName: matchGroup(text, /(?:pati[eë]nt|patient)\s*[:\-]\s*(.+)/i),
    leadDoctor: matchGroup(text, /(?:behandelaar|arts|doctor)\s*[:\-]\s*(.+)/i),
    location: matchGroup(text, /(?:locatie|location)\s*[:\-]\s*(.+)/i),
    heartRate: matchGroup(text, /(?:hartslag|hr)\s*[:\-]?\s*(\d{2,3})/i),
    bpSys: "",
    bpDia: "",
    summary: text.trim()
  };

  const bpMatch = text.match(/(?:bloeddruk|bd|bp)\s*[:\-]?\s*(\d{2,3})\s*[\/\-]\s*(\d{2,3})/i);
  if (bpMatch) {
    result.bpSys = bpMatch[1];
    result.bpDia = bpMatch[2];
  }

  return result;
}

function buildReport() {
  const data = collectFormData();
  const report = composeReport(data);
  $("#reportOutput").value = report;
  return report;
}

function collectFormData() {
  return {
    patientName: sanitizeText($("#patientName").value),
    patientDob: sanitizeText($("#patientDob").value),
    location: sanitizeText($("#location").value),
    incidentDate: sanitizeText($("#incidentDate").value),
    incidentTime: sanitizeText($("#incidentTime").value),
    leadDoctor: sanitizeText($("#leadDoctor").value),
    assistants: sanitizeText($("#assistants").value),
    bpSys: sanitizeText($("#bpSys").value),
    bpDia: sanitizeText($("#bpDia").value),
    heartRate: sanitizeText($("#heartRate").value),
    pulseType: sanitizeText($("#pulseType").value),
    temperatureState: sanitizeText($("#temperatureState").value),
    bloodLoss: sanitizeText($("#bloodLoss").value),
    painLevel: sanitizeText($("#painLevel").value),
    costImport: sanitizeText($("#costImport").value),
    costTotal: sanitizeText($("#costTotal").value),
    costNotes: sanitizeText($("#costNotes").value),
    medicalLog: sanitizeText($("#medicalLog").value),
    summaryNotes: sanitizeText($("#summaryNotes").value),
    injuries: getStructuredInjuries()
  };
}

function getStructuredInjuries() {
  const result = {};

  Object.keys(injuryState).forEach(part => {
    const validItems = (injuryState[part] || []).filter(item =>
      item.type || item.severity || item.note
    );
    result[part] = validItems;
  });

  return result;
}

function composeReport(data) {
  const injuryText = buildInjuryText(data.injuries);
  const costText = buildCostText(data);
  const logText = data.medicalLog
    ? [
        "MEDISCH SYSTEEMLOG",
        data.medicalLog
      ].join("\n")
    : "MEDISCH SYSTEEMLOG\n-";

  return [
    "TRAUMA RAPPORT",
    "",
    "PATIËNTGEGEVENS",
    `Naam patiënt: ${orDash(data.patientName)}`,
    `Geboortedatum: ${formatDateDisplay(data.patientDob)}`,
    "",
    "SITUATIEGEGEVENS",
    `Locatie: ${orDash(data.location)}`,
    `Datum: ${formatDateDisplay(data.incidentDate)}`,
    `Uur: ${orDash(data.incidentTime)}`,
    "",
    "ARTS & TEAM",
    `Naam behandelaar: ${orDash(data.leadDoctor)}`,
    `Assistenten: ${orDash(data.assistants)}`,
    "",
    "TRAUMA VITALS",
    `Bloeddruk: ${formatBloodPressure(data.bpSys, data.bpDia)}`,
    `Hartslag: ${orDash(data.heartRate)}`,
    `Pols: ${orDash(data.pulseType)}`,
    `Temperatuur: ${orDash(data.temperatureState)}`,
    `Bloedverlies: ${orDash(data.bloodLoss)}`,
    `Pijn: ${orDash(data.painLevel)}`,
    "",
    "VERWONDINGEN PER LEDEMAAT",
    injuryText,
    "",
    "KOSTENINFORMATIE",
    costText,
    "",
    "SAMENVATTING / EXTRA NOTITIES",
    orDash(data.summaryNotes),
    "",
    logText,
    "",
    `Rapport opgebouwd op: ${formatDateTimeNow()}`
  ].join("\n");
}

function buildInjuryText(injuries) {
  const lines = [];
  let hasAny = false;

  Object.keys(injuries).forEach(part => {
    const items = injuries[part] || [];
    if (!items.length) {
      lines.push(`${part}: geen geregistreerde verwondingen.`);
      return;
    }

    hasAny = true;
    lines.push(`${part}:`);
    items.forEach((item, index) => {
      lines.push(
        `  ${index + 1}. ${orDash(item.type)} | ernst: ${orDash(item.severity)} | toelichting: ${orDash(item.note)}`
      );
    });
  });

  return hasAny ? lines.join("\n") : "-";
}

function buildCostText(data) {
  const parts = [
    `Totaalbedrag: ${data.costTotal ? `€ ${data.costTotal}` : "-"}`,
    `Opmerking: ${orDash(data.costNotes)}`,
    "Export kostentool:",
    data.costImport || "-"
  ];

  return parts.join("\n");
}

async function handleCopy() {
  const report = $("#reportOutput").value.trim();

  if (!report) {
    showStatus("Er is nog geen rapport om te kopiëren.", "warning");
    return;
  }

  let copyOk = false;
  let discordOk = false;
  let discordAttempted = false;

  try {
    await navigator.clipboard.writeText(report);
    copyOk = true;
  } catch (error) {
    copyOk = false;
  }

  if (CONFIG.discordWebhookProxyUrl && CONFIG.discordWebhookProxyUrl.trim()) {
    discordAttempted = true;
    try {
      await sendToDiscord(report);
      discordOk = true;
    } catch (error) {
      discordOk = false;
    }
  }

  if (copyOk && !discordAttempted) {
    showStatus("Rapport gekopieerd naar klembord.", "success");
    return;
  }

  if (copyOk && discordAttempted && discordOk) {
    showStatus("Rapport gekopieerd en succesvol doorgestuurd naar Discord.", "success");
    return;
  }

  if (copyOk && discordAttempted && !discordOk) {
    showStatus("Rapport gekopieerd, maar Discord-log mislukte.", "warning");
    return;
  }

  if (!copyOk && discordAttempted && discordOk) {
    showStatus("Discord-log gelukt, maar kopiëren naar klembord mislukte.", "warning");
    return;
  }

  showStatus("Kopiëren is mislukt.", "danger");
}

async function sendToDiscord(reportText) {
  const payload = {
    content: `**Nieuw trauma rapport**\n\`\`\`\n${truncate(reportText, 1800)}\n\`\`\``
  };

  const response = await fetch(CONFIG.discordWebhookProxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Discord fout: ${response.status}`);
  }
}

function handleReset() {
  document.querySelectorAll("input, textarea, select").forEach(el => {
    if (el.tagName === "SELECT") {
      el.selectedIndex = 0;
    } else {
      el.value = "";
    }
  });

  presetDateTime();

  Object.keys(injuryState).forEach(part => {
    injuryState[part] = [];
    renderInjuryList(part);
  });

  $("#reportOutput").value = "";
  clearStatus();
  buildReport();
}

function showStatus(message, type = "success") {
  const box = $("#statusBox");
  box.textContent = message;
  box.className = `status-box status-${type}`;
}

function clearStatus() {
  const box = $("#statusBox");
  box.textContent = "";
  box.className = "status-box hidden";
}

/* Helpers */

function $(selector) {
  return document.querySelector(selector);
}

function sanitizeText(value) {
  return String(value || "").trim();
}

function orDash(value) {
  return value && String(value).trim() ? String(value).trim() : "-";
}

function formatBloodPressure(sys, dia) {
  if (sys && dia) return `${sys}/${dia}`;
  if (sys || dia) return `${sys || "-"}/${dia || "-"}`;
  return "-";
}

function formatDateDisplay(value) {
  if (!value) return "-";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}-${m}-${y}`;
  }
  return value;
}

function formatDateTimeNow() {
  const now = new Date();
  return `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function toDateInputValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeInputValue(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

function buildOptionsHtml(options, selectedValue) {
  return options.map(option => {
    const selected = option === selectedValue ? "selected" : "";
    return `<option value="${escapeAttr(option)}" ${selected}>${escapeHtml(option)}</option>`;
  }).join("");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
}

function cryptoRandomId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function debounce(fn, delay = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function matchGroup(text, regex) {
  const match = text.match(regex);
  return match && match[1] ? match[1].trim() : "";
}