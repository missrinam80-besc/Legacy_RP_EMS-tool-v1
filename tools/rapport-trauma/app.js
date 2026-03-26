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
 * - Koppeling met EMS personeelslijst via EmsStaffService
 *
 * Belangrijk:
 * Zet NOOIT een ruwe Discord webhook rechtstreeks in frontend code.
 * Gebruik bij voorkeur een veilige tussenlaag.
 */

let CONFIG = {};
let STAFF_ROWS = [];
const injuryState = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    CONFIG = await loadConfig();

    fillBasicSelects();
    buildInjurySections();
    bindEvents();
    presetDateTime();

    await initStaffFields();

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
  $("#buildBtn")?.addEventListener("click", buildReport);
  $("#copyBtn")?.addEventListener("click", handleCopy);
  $("#resetBtn")?.addEventListener("click", handleReset);
  $("#parseLogBtn")?.addEventListener("click", parseMedicalLog);

  document.querySelectorAll("input, textarea, select").forEach(el => {
    el.addEventListener("input", debounce(buildReport, 150));
    el.addEventListener("change", buildReport);
  });
}

function presetDateTime() {
  const now = new Date();
  if ($("#incidentDate")) $("#incidentDate").value = toDateInputValue(now);
  if ($("#incidentTime")) $("#incidentTime").value = toTimeInputValue(now);
}

function fillBasicSelects() {
  fillSelect("#pulseType", CONFIG.pulseOptions || []);
  fillSelect("#temperatureState", CONFIG.temperatureOptions || []);
  fillSelect("#bloodLoss", CONFIG.bloodLossOptions || []);
  fillSelect("#painLevel", CONFIG.painOptions || []);
}

function fillSelect(selector, options) {
  const select = $(selector);
  if (!select) return;

  select.innerHTML = `<option value="">Kies een optie</option>`;
  options.forEach(option => {
    const el = document.createElement("option");
    el.value = option;
    el.textContent = option;
    select.appendChild(el);
  });
}

/* =========================
   PERSONEELSKOPPELING
========================= */

async function initStaffFields() {
  if (!window.EmsStaffService) {
    throw new Error("EMS Staff Service is niet geladen.");
  }

  const apiUrl = String(CONFIG.staffApiUrl || "").trim();
  if (!apiUrl) {
    showStatus("Personeelsservice is nog niet ingesteld in config.json.", "warning");
    return;
  }

  window.EmsStaffService.setApiUrl(apiUrl);
  STAFF_ROWS = await window.EmsStaffService.getVisibleStaff();

  populateStaffSelects();
}

function populateStaffSelects() {
  const leadDoctorSelect = $("#leadDoctor");
  const assistantsSelect = $("#assistants");

  if (!leadDoctorSelect || !assistantsSelect) return;

  // We laten de service de labels genereren.
  // Daarna zetten we de option.value bewust gelijk aan het zichtbare label,
  // zodat naam + roepnummer samen gebruikt worden.
  window.EmsStaffService.populateSelect(leadDoctorSelect, STAFF_ROWS, {
    includeEmpty: true,
    emptyLabel: "Kies een behandelaar",
    labelFormat: CONFIG.staffLabelFormat || "naam-roepnummer-rang",
    valueField: "naam"
  });

  window.EmsStaffService.populateSelect(assistantsSelect, STAFF_ROWS, {
    includeEmpty: false,
    labelFormat: CONFIG.staffLabelFormat || "naam-roepnummer-rang",
    valueField: "naam"
  });

  if ((CONFIG.staffValueMode || "label") === "label") {
    setSelectOptionValuesToLabels(leadDoctorSelect, true);
    setSelectOptionValuesToLabels(assistantsSelect, false);
  }
}

function setSelectOptionValuesToLabels(selectElement, keepEmpty = true) {
  if (!selectElement) return;

  Array.from(selectElement.options).forEach((option, index) => {
    if (keepEmpty && index === 0 && option.value === "") return;
    option.value = option.textContent.trim();
  });
}

function getSelectedAssistants() {
  const select = $("#assistants");
  if (!select) return [];

  return Array.from(select.selectedOptions)
    .map(option => option.value)
    .filter(Boolean);
}

/* =========================
   VERWONDINGEN
========================= */

function buildInjurySections() {
  const container = $("#injurySections");
  if (!container) return;

  container.innerHTML = "";

  (CONFIG.bodyParts || []).forEach(part => {
    injuryState[part] = [];

    const block = document.createElement("section");
    block.className = "injury-block";
    block.dataset.part = part;

    block.innerHTML = `
      <div class="injury-block-header">
        <h3>${escapeHtml(part)}</h3>
        <button type="button" class="btn btn-secondary btn-compact add-injury-btn" data-part="${escapeAttr(part)}">
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

  Object.keys(injuryState).forEach(part => renderInjuryList(part));
}

function addInjuryItem(part, initialData = {}) {
  const list = $(`#injury-list-${slugify(part)}`);
  if (!list) return;

  const id = cryptoRandomId();
  injuryState[part].push({
    id,
    type: initialData.type || "",
    severity: initialData.severity || ""
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

      <button type="button" class="btn btn-secondary btn-compact remove-btn"
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

/* =========================
   MEDISCH LOG
========================= */

function parseMedicalLog() {
  const raw = sanitizeText($("#medicalLog")?.value);
  if (!raw) {
    showStatus("Er is geen tekstlog om uit te lezen.", "warning");
    return;
  }

  const extracted = extractFromLog(raw);

  if (extracted.patientName && !$("#patientName")?.value.trim()) {
    $("#patientName").value = extracted.patientName;
  }

  if (extracted.location && !$("#location")?.value.trim()) {
    $("#location").value = extracted.location;
  }

  if (extracted.heartRate && !$("#heartRate")?.value.trim()) {
    $("#heartRate").value = extracted.heartRate;
  }

  if (extracted.bpSys && !$("#bpSys")?.value.trim()) {
    $("#bpSys").value = extracted.bpSys;
  }

  if (extracted.bpDia && !$("#bpDia")?.value.trim()) {
    $("#bpDia").value = extracted.bpDia;
  }

  if (extracted.summary) {
    const current = $("#summaryNotes")?.value.trim() || "";
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

/* =========================
   RAPPORT
========================= */

function buildReport() {
  const data = collectFormData();
  const report = composeReport(data);

  if ($("#reportOutput")) {
    $("#reportOutput").value = report;
  }

  renderMarkdownPreview(report);
  return report;
}

function collectFormData() {
  return {
    patientName: sanitizeText($("#patientName")?.value),
    patientDob: sanitizeText($("#patientDob")?.value),
    location: sanitizeText($("#location")?.value),
    incidentDate: sanitizeText($("#incidentDate")?.value),
    incidentTime: sanitizeText($("#incidentTime")?.value),
    leadDoctor: sanitizeText($("#leadDoctor")?.value),
    assistants: getSelectedAssistants(),
    bpSys: sanitizeText($("#bpSys")?.value),
    bpDia: sanitizeText($("#bpDia")?.value),
    heartRate: sanitizeText($("#heartRate")?.value),
    pulseType: sanitizeText($("#pulseType")?.value),
    temperatureState: sanitizeText($("#temperatureState")?.value),
    bloodLoss: sanitizeText($("#bloodLoss")?.value),
    painLevel: sanitizeText($("#painLevel")?.value),
    costImport: sanitizeText($("#costImport")?.value),
    costTotal: sanitizeText($("#costTotal")?.value),
    costNotes: sanitizeText($("#costNotes")?.value),
    medicalLog: sanitizeText($("#medicalLog")?.value),
    summaryNotes: sanitizeText($("#summaryNotes")?.value),
    injuries: getStructuredInjuries()
  };
}

function getStructuredInjuries() {
  const result = {};

  Object.keys(injuryState).forEach(part => {
    const validItems = (injuryState[part] || []).filter(item =>
      item.type || item.severity
    );
    result[part] = validItems;
  });

  return result;
}

function composeReport(data) {
  const injuryText = buildInjuryMarkdown(data.injuries);
  const costText = buildCostMarkdown(data);
  const logText = data.medicalLog
    ? `__**MEDISCH SYSTEEMLOG**__\n\n- ${escapeMarkdownText(data.medicalLog).replace(/\n/g, "\n- ")}`
    : `__**MEDISCH SYSTEEMLOG**__\n\n-`;

  return [
    "---",
    "__**TRAUMA RAPPORT**__",
    "---",
    "",
    "__**PATIËNTGEGEVENS**__",
    `- **Naam patiënt:** ${orDash(data.patientName)}`,
    `- **Geboortedatum:** ${formatDateDisplay(data.patientDob)}`,
    "",
    "---",
    "",
    "__**SITUATIEGEGEVENS**__",
    `- **Locatie:** ${orDash(data.location)}`,
    `- **Datum:** ${formatDateDisplay(data.incidentDate)}`,
    `- **Uur:** ${orDash(data.incidentTime)}`,
    "",
    "---",
    "",
    "__**ARTS & TEAM**__",
    `- **Naam behandelaar:** ${orDash(data.leadDoctor)}`,
    `- **Assistenten:** ${data.assistants.length ? data.assistants.join(", ") : "-"}`,
    "",
    "---",
    "",
    "__**TRAUMA VITALS**__",
    `- **Bloeddruk:** ${formatBloodPressure(data.bpSys, data.bpDia)}`,
    `- **Hartslag:** ${orDash(data.heartRate)}`,
    `- **Pols:** ${orDash(data.pulseType)}`,
    `- **Temperatuur:** ${orDash(data.temperatureState)}`,
    `- **Bloedverlies:** ${orDash(data.bloodLoss)}`,
    `- **Pijn:** ${orDash(data.painLevel)}`,
    "",
    "---",
    "",
    "__**VERWONDINGEN PER LEDEMAAT**__",
    injuryText,
    "",
    "---",
    "",
    "__**KOSTENINFORMATIE**__",
    costText,
    "",
    "---",
    "",
    "__**SAMENVATTING / EXTRA NOTITIES**__",
    `- ${orDash(data.summaryNotes)}`,
    "",
    "---",
    "",
    logText,
    "",
    "---",
    "",
    `**Rapport opgebouwd op:** ${formatDateTimeNow()}`
  ].join("\n");
}

function renderMarkdownPreview(markdown) {
  const preview = $("#reportPreview");
  if (!preview) return;

  const lines = String(markdown || "").split("\n");
  const html = [];

  let inParagraph = false;
  let inUl = false;
  let inOl = false;

  function closeParagraph() {
    if (inParagraph) {
      html.push("</p>");
      inParagraph = false;
    }
  }

  function closeLists() {
    if (inUl) {
      html.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      html.push("</ol>");
      inOl = false;
    }
  }

  function openParagraph() {
    if (!inParagraph) {
      closeLists();
      html.push("<p>");
      inParagraph = true;
    }
  }

  lines.forEach(rawLine => {
    const line = rawLine.replace(/\t/g, "    ");
    const trimmed = line.trim();

    if (trimmed === "---") {
      closeParagraph();
      closeLists();
      html.push("<hr>");
      return;
    }

    if (!trimmed) {
      closeParagraph();
      closeLists();
      return;
    }

    if (trimmed === "__**TRAUMA RAPPORT**__") {
      closeParagraph();
      closeLists();
      html.push(`<div class="report-title">TRAUMA RAPPORT</div>`);
      return;
    }

    if (/^__\*\*(.+)\*\*__$/.test(trimmed)) {
      closeParagraph();
      closeLists();
      const text = trimmed.replace(/^__\*\*(.+)\*\*__$/, "$1");
      html.push(`<div class="report-section-title">${escapeHtml(text)}</div>`);
      return;
    }

    // Bullet list
    if (/^- /.test(trimmed)) {
      closeParagraph();
      if (inOl) {
        html.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        html.push("<ul>");
        inUl = true;
      }

      const content = trimmed.replace(/^- /, "");
      html.push(`<li>${formatInlineMarkdown(content)}</li>`);
      return;
    }

    // Numbered list
    if (/^\d+\.\s/.test(trimmed)) {
      closeParagraph();
      if (inUl) {
        html.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        html.push("<ol>");
        inOl = true;
      }

      const content = trimmed.replace(/^\d+\.\s/, "");
      html.push(`<li>${formatInlineMarkdown(content)}</li>`);
      return;
    }

    // Indented bullet
    if (/^-\s/.test(trimmed)) {
      closeParagraph();
      if (!inUl) {
        html.push("<ul>");
        inUl = true;
      }
      const content = trimmed.replace(/^-\s/, "");
      html.push(`<li>${formatInlineMarkdown(content)}</li>`);
      return;
    }

    // Gewone tekstregel
    openParagraph();
    html.push(`${formatInlineMarkdown(trimmed)}<br>`);
  });

  closeParagraph();
  closeLists();

  preview.innerHTML = html.join("");
}

function formatInlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<u>$1</u>");
}

function buildInjuryMarkdown(injuries) {
  const lines = [];
  let hasAny = false;

  Object.keys(injuries).forEach(part => {
    const items = injuries[part] || [];

    if (!items.length) {
      lines.push(`- **${part}:** geen geregistreerde verwondingen.`);
      return;
    }

    hasAny = true;
    lines.push(`- **${part}:**`);

    items.forEach((item, index) => {
      lines.push(
        `${index + 1}. **Type:** ${orDash(item.type)} | **Ernst:** ${orDash(item.severity)}`
      );
    });

    lines.push("");
  });

  return hasAny ? lines.join("\n") : "-";
}

function buildCostMarkdown(data) {
  const lines = [
    `- **Totaalbedrag:** ${data.costTotal ? `€ ${data.costTotal}` : "-"}`,
    `- **Opmerking:** ${orDash(data.costNotes)}`,
    `- **Export kostentool:**`
  ];

  if (data.costImport) {
    data.costImport.split("\n").forEach(line => {
      lines.push(`  - ${line.trim() || "-"}`);
    });
  } else {
    lines.push("  - -");
  }

  return lines.join("\n");
}

/* =========================
   ACTIES
========================= */

async function handleCopy() {
  const report = $("#reportOutput")?.value.trim();

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
    content: truncate(reportText, 1800)
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
    if (el.tagName === "SELECT" && el.multiple) {
      Array.from(el.options).forEach(option => {
        option.selected = false;
      });
    } else if (el.tagName === "SELECT") {
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

  if ($("#reportOutput")) {
    $("#reportOutput").value = "";
  }

  const preview = $("#reportPreview");
  if (preview) preview.innerHTML = "";

  clearStatus();
  buildReport();
}

/* =========================
   STATUS
========================= */

function showStatus(message, type = "success") {
  const box = $("#statusBox");
  if (!box) return;

  box.textContent = message;
  box.className = `status-box status-${type}`;
}

function clearStatus() {
  const box = $("#statusBox");
  if (!box) return;

  box.textContent = "";
  box.className = "status-box hidden";
}

/* =========================
   HELPERS
========================= */

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

function escapeMarkdownText(text) {
  return String(text || "").trim();
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