/**
 * EMS Trauma Rapport v2
 * ---------------------
 * Gebruikt centrale services:
 * - storage.js
 * - export.js
 * - discord-webhook.js
 * - ems-staff-service.js
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
    restoreDraft();

    buildReport();
    showStatus("Klaar. Je kunt gegevens invoeren, het rapport opbouwen of kopiëren.", "neutral");
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
  $("#buildBtn")?.addEventListener("click", () => {
    buildReport();
    saveDraft();
    showStatus("Rapport opgebouwd.", "success");
  });

  $("#copyBtn")?.addEventListener("click", handleCopy);
  $("#resetBtn")?.addEventListener("click", handleReset);
  $("#parseLogBtn")?.addEventListener("click", parseMedicalLog);

  document.querySelectorAll("input, textarea, select").forEach(el => {
    el.addEventListener("input", debounce(handleAutoChange, 200));
    el.addEventListener("change", handleAutoChange);
  });
}

function handleAutoChange() {
  buildReport();
  saveDraft();
  showStatus("Wijzigingen automatisch opgeslagen in lokale opslag.", "neutral");
}

function presetDateTime() {
  const now = new Date();
  if ($("#incidentDate") && !$("#incidentDate").value) $("#incidentDate").value = toDateInputValue(now);
  if ($("#incidentTime") && !$("#incidentTime").value) $("#incidentTime").value = toTimeInputValue(now);
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
  const id = cryptoRandomId();

  injuryState[part].push({
    id,
    type: initialData.type || "",
    severity: initialData.severity || ""
  });

  renderInjuryList(part);
  buildReport();
  saveDraft();
  showStatus(`Verwonding toegevoegd bij ${part}.`, "success");
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
          <label>Type</label>
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

  list.querySelectorAll("select").forEach(el => {
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
  saveDraft();
  showStatus("Verwonding bijgewerkt.", "neutral");
}

function removeInjuryItem(part, id) {
  injuryState[part] = (injuryState[part] || []).filter(item => item.id !== id);
  renderInjuryList(part);
  buildReport();
  saveDraft();
  showStatus(`Verwonding verwijderd bij ${part}.`, "warning");
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
  saveDraft();
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
        `  ${index + 1}. **Type:** ${orDash(item.type)} | **Ernst:** ${orDash(item.severity)}`
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

/* =========================
   OPSLAG
========================= */

function getStorageKey() {
  return String(CONFIG.storageKey || "ems-trauma-report-v2");
}

function saveDraft() {
  if (typeof saveToLocal !== "function") return;

  const payload = {
    fields: collectFormData(),
    injuries: injuryState
  };

  saveToLocal(getStorageKey(), payload);
}

function restoreDraft() {
  if (typeof loadFromLocal !== "function") return;

  const saved = loadFromLocal(getStorageKey(), null);
  if (!saved || !saved.fields) return;

  const fields = saved.fields;

  setValue("#patientName", fields.patientName);
  setValue("#patientDob", fields.patientDob);
  setValue("#location", fields.location);
  setValue("#incidentDate", fields.incidentDate);
  setValue("#incidentTime", fields.incidentTime);
  setValue("#leadDoctor", fields.leadDoctor);
  setValue("#bpSys", fields.bpSys);
  setValue("#bpDia", fields.bpDia);
  setValue("#heartRate", fields.heartRate);
  setValue("#pulseType", fields.pulseType);
  setValue("#temperatureState", fields.temperatureState);
  setValue("#bloodLoss", fields.bloodLoss);
  setValue("#painLevel", fields.painLevel);
  setValue("#costImport", fields.costImport);
  setValue("#costTotal", fields.costTotal);
  setValue("#costNotes", fields.costNotes);
  setValue("#medicalLog", fields.medicalLog);
  setValue("#summaryNotes", fields.summaryNotes);

  restoreMultiSelect("#assistants", fields.assistants || []);

  Object.keys(injuryState).forEach(part => {
    injuryState[part] = [];
  });

  const savedInjuries = saved.injuries || {};
  Object.keys(savedInjuries).forEach(part => {
    injuryState[part] = Array.isArray(savedInjuries[part]) ? savedInjuries[part] : [];
    renderInjuryList(part);
  });

  showStatus("Opgeslagen concept hersteld uit lokale opslag.", "success");
}

function clearDraft() {
  if (typeof removeFromLocal !== "function") return;
  removeFromLocal(getStorageKey());
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
  let discordError = "";

  try {
    if (typeof copyTextToClipboard !== "function") {
      throw new Error("Centrale exportservice is niet geladen.");
    }
    await copyTextToClipboard(report);
    copyOk = true;
  } catch (error) {
    copyOk = false;
  }

  if (CONFIG.discordWebhookProxyUrl && CONFIG.discordWebhookProxyUrl.trim()) {
    discordAttempted = true;

    try {
      if (!window.DiscordWebhookService) {
        throw new Error("DiscordWebhookService is niet geladen.");
      }

      await window.DiscordWebhookService.sendFormMessage({
        endpointUrl: CONFIG.discordWebhookProxyUrl,
        formType: "trauma",
        content: report,
        username: CONFIG.discordUsername || "EMS Trauma Tool",
        extraData: buildTraumaDiscordMeta(),
        useEmbeds: CONFIG.discordUseEmbeds !== false
      });

      discordOk = true;
    } catch (error) {
      discordOk = false;
      discordError = error.message || "Onbekende Discord-fout";
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
    showStatus(`Rapport gekopieerd, maar Discord-log mislukte: ${discordError}`, "warning");
    return;
  }

  if (!copyOk && discordAttempted && discordOk) {
    showStatus("Discord-log gelukt, maar kopiëren naar klembord mislukte.", "warning");
    return;
  }

  showStatus("Kopiëren is mislukt.", "danger");
}

function buildTraumaDiscordMeta() {
  const data = collectFormData();

  return {
    patientName: data.patientName,
    patientDob: data.patientDob,
    location: data.location,
    incidentDate: data.incidentDate,
    incidentTime: data.incidentTime,
    leadDoctor: data.leadDoctor,
    assistants: data.assistants.join(", "),
    painLevel: data.painLevel,
    bloodLoss: data.bloodLoss
  };
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

  if ($("#reportOutput")) $("#reportOutput").value = "";
  if ($("#reportPreview")) $("#reportPreview").innerHTML = "";

  clearDraft();
  buildReport();
  showStatus("Formulier gereset en lokale opslag gewist.", "warning");
}

/* =========================
   STATUS
========================= */

function showStatus(message, type = "neutral") {
  const box = $("#statusBox");
  if (!box) return;

  const classMap = {
    neutral: "status status--neutral",
    success: "status status--success",
    warning: "status status--warning",
    danger: "status status--danger",
    info: "status status--info"
  };

  box.textContent = message;
  box.className = classMap[type] || classMap.neutral;
}

/* =========================
   HELPERS
========================= */

function $(selector) {
  return document.querySelector(selector);
}

function setValue(selector, value) {
  const el = $(selector);
  if (!el) return;
  el.value = value || "";
}

function restoreMultiSelect(selector, values) {
  const el = $(selector);
  if (!el || !Array.isArray(values)) return;

  Array.from(el.options).forEach(option => {
    option.selected = values.includes(option.value);
  });
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