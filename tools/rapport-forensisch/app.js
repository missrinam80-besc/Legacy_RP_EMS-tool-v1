/**
 * EMS Forensisch Rapport v1
 * ------------------------
 * Gebruikt centrale services:
 * - storage.js
 * - export.js
 * - discord-webhook.js
 * - ems-staff-service.js
 */

let CONFIG = {};
let STAFF_ROWS = [];

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    CONFIG = await loadConfig();

    fillBasicSelects();
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
  if ($("#reportDate") && !$("#reportDate").value) $("#reportDate").value = toDateInputValue(now);
  if ($("#reportTime") && !$("#reportTime").value) $("#reportTime").value = toTimeInputValue(now);
}

function fillBasicSelects() {
  fillSelect("#reportType", CONFIG.reportTypeOptions || []);
  fillSelect("#consciousness", CONFIG.consciousnessOptions || []);
  fillSelect("#stability", CONFIG.stabilityOptions || []);
  fillSelect("#temperatureState", CONFIG.temperatureOptions || []);
  fillSelect("#bloodLoss", CONFIG.bloodLossOptions || []);
  fillSelect("#violenceIndicators", CONFIG.violenceIndicatorOptions || []);
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
    patientName: matchGroup(text, /(?:pati[eë]nt|patient|betrokkene)\s*[:\-]\s*(.+)/i),
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
    reportDate: sanitizeText($("#reportDate")?.value),
    reportTime: sanitizeText($("#reportTime")?.value),
    reportType: sanitizeText($("#reportType")?.value),
    caseReference: sanitizeText($("#caseReference")?.value),
    reasonForExam: sanitizeText($("#reasonForExam")?.value),
    leadDoctor: sanitizeText($("#leadDoctor")?.value),
    assistants: getSelectedAssistants(),
    requestedBy: sanitizeText($("#requestedBy")?.value),
    presenceOthers: sanitizeText($("#presenceOthers")?.value),
    consciousness: sanitizeText($("#consciousness")?.value),
    stability: sanitizeText($("#stability")?.value),
    bpSys: sanitizeText($("#bpSys")?.value),
    bpDia: sanitizeText($("#bpDia")?.value),
    heartRate: sanitizeText($("#heartRate")?.value),
    temperatureState: sanitizeText($("#temperatureState")?.value),
    generalConditionNotes: sanitizeText($("#generalConditionNotes")?.value),
    injuryOverview: sanitizeText($("#injuryOverview")?.value),
    bloodLoss: sanitizeText($("#bloodLoss")?.value),
    violenceIndicators: sanitizeText($("#violenceIndicators")?.value),
    externalObservations: sanitizeText($("#externalObservations")?.value),
    forensicFindings: sanitizeText($("#forensicFindings")?.value),
    suspectedCause: sanitizeText($("#suspectedCause")?.value),
    timeEstimate: sanitizeText($("#timeEstimate")?.value),
    samplesTaken: sanitizeText($("#samplesTaken")?.value),
    evidenceHandled: sanitizeText($("#evidenceHandled")?.value),
    conclusion: sanitizeText($("#conclusion")?.value),
    transferTo: sanitizeText($("#transferTo")?.value),
    followUp: sanitizeText($("#followUp")?.value),
    costImport: sanitizeText($("#costImport")?.value),
    costTotal: sanitizeText($("#costTotal")?.value),
    costNotes: sanitizeText($("#costNotes")?.value),
    medicalLog: sanitizeText($("#medicalLog")?.value),
    summaryNotes: sanitizeText($("#summaryNotes")?.value)
  };
}

function composeReport(data) {
  const costText = buildCostMarkdown(data);
  const logText = data.medicalLog
    ? `__**MEDISCH SYSTEEMLOG**__\n\n- ${escapeMarkdownText(data.medicalLog).replace(/\n/g, "\n- ")}`
    : `__**MEDISCH SYSTEEMLOG**__\n\n-`;

  return [
    "---",
    "__**FORENSISCH RAPPORT**__",
    "---",
    "",
    "__**PATIËNT / BETROKKENE**__",
    `- **Naam betrokkene:** ${orDash(data.patientName)}`,
    `- **Geboortedatum:** ${formatDateDisplay(data.patientDob)}`,
    "",
    "---",
    "",
    "__**ALGEMENE FORENSISCHE GEGEVENS**__",
    `- **Locatie:** ${orDash(data.location)}`,
    `- **Datum onderzoek:** ${formatDateDisplay(data.reportDate)}`,
    `- **Uur onderzoek:** ${orDash(data.reportTime)}`,
    `- **Type onderzoek:** ${orDash(data.reportType)}`,
    `- **Referentie / dossiernummer:** ${orDash(data.caseReference)}`,
    `- **Aanleiding onderzoek:** ${orDash(data.reasonForExam)}`,
    "",
    "---",
    "",
    "__**ONDERZOEKSTEAM**__",
    `- **Behandelaar / onderzoeker:** ${orDash(data.leadDoctor)}`,
    `- **Assistenten:** ${data.assistants.length ? data.assistants.join(", ") : "-"}`,
    `- **Aangevraagd door:** ${orDash(data.requestedBy)}`,
    `- **Aanwezigen bij onderzoek:** ${orDash(data.presenceOthers)}`,
    "",
    "---",
    "",
    "__**TOESTAND VAN BETROKKENE**__",
    `- **Bewustzijn:** ${orDash(data.consciousness)}`,
    `- **Algemene toestand:** ${orDash(data.stability)}`,
    `- **Bloeddruk:** ${formatBloodPressure(data.bpSys, data.bpDia)}`,
    `- **Hartslag:** ${orDash(data.heartRate)}`,
    `- **Temperatuur:** ${orDash(data.temperatureState)}`,
    `- **Klinische notities:** ${orDash(data.generalConditionNotes)}`,
    "",
    "---",
    "",
    "__**LETSELS EN UITERLIJKE VASTSTELLINGEN**__",
    `- **Overzicht letsels:** ${orDash(data.injuryOverview)}`,
    `- **Bloedverlies:** ${orDash(data.bloodLoss)}`,
    `- **Indicaties van geweld:** ${orDash(data.violenceIndicators)}`,
    `- **Uiterlijke vaststellingen:** ${orDash(data.externalObservations)}`,
    "",
    "---",
    "",
    "__**FORENSISCHE BEVINDINGEN**__",
    `- **Bevindingen:** ${orDash(data.forensicFindings)}`,
    `- **Vermoedelijke oorzaak:** ${orDash(data.suspectedCause)}`,
    `- **Schatting tijdsverloop:** ${orDash(data.timeEstimate)}`,
    "",
    "---",
    "",
    "__**STALEN EN BEWIJSSTUKKEN**__",
    `- **Afgenomen stalen:** ${orDash(data.samplesTaken)}`,
    `- **Veiliggestelde elementen / bewijsstukken:** ${orDash(data.evidenceHandled)}`,
    "",
    "---",
    "",
    "__**BESLUIT EN OVERDRACHT**__",
    `- **Medisch-forensisch besluit:** ${orDash(data.conclusion)}`,
    `- **Overgedragen aan:** ${orDash(data.transferTo)}`,
    `- **Vervolgactie:** ${orDash(data.followUp)}`,
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

    if (trimmed === "__**FORENSISCH RAPPORT**__") {
      closeParagraph();
      closeLists();
      html.push(`<div class="report-title">FORENSISCH RAPPORT</div>`);
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
  return String(CONFIG.storageKey || "ems-forensic-report-v1");
}

function saveDraft() {
  if (typeof saveToLocal !== "function") return;

  const payload = {
    fields: collectFormData()
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
  setValue("#reportDate", fields.reportDate);
  setValue("#reportTime", fields.reportTime);
  setValue("#reportType", fields.reportType);
  setValue("#caseReference", fields.caseReference);
  setValue("#reasonForExam", fields.reasonForExam);
  setValue("#leadDoctor", fields.leadDoctor);
  setValue("#requestedBy", fields.requestedBy);
  setValue("#presenceOthers", fields.presenceOthers);
  setValue("#consciousness", fields.consciousness);
  setValue("#stability", fields.stability);
  setValue("#bpSys", fields.bpSys);
  setValue("#bpDia", fields.bpDia);
  setValue("#heartRate", fields.heartRate);
  setValue("#temperatureState", fields.temperatureState);
  setValue("#generalConditionNotes", fields.generalConditionNotes);
  setValue("#injuryOverview", fields.injuryOverview);
  setValue("#bloodLoss", fields.bloodLoss);
  setValue("#violenceIndicators", fields.violenceIndicators);
  setValue("#externalObservations", fields.externalObservations);
  setValue("#forensicFindings", fields.forensicFindings);
  setValue("#suspectedCause", fields.suspectedCause);
  setValue("#timeEstimate", fields.timeEstimate);
  setValue("#samplesTaken", fields.samplesTaken);
  setValue("#evidenceHandled", fields.evidenceHandled);
  setValue("#conclusion", fields.conclusion);
  setValue("#transferTo", fields.transferTo);
  setValue("#followUp", fields.followUp);
  setValue("#costImport", fields.costImport);
  setValue("#costTotal", fields.costTotal);
  setValue("#costNotes", fields.costNotes);
  setValue("#medicalLog", fields.medicalLog);
  setValue("#summaryNotes", fields.summaryNotes);

  restoreMultiSelect("#assistants", fields.assistants || []);

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
        formType: "forensisch",
        content: report,
        username: CONFIG.discordUsername || "EMS Forensisch Tool",
        extraData: buildForensicDiscordMeta(),
        useEmbeds: CONFIG.discordUseEmbeds !== false,
        sendPlainContent: CONFIG.discordSendPlainContent !== false
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

function buildForensicDiscordMeta() {
  const data = collectFormData();

  return {
    patientName: data.patientName,
    patientDob: data.patientDob,
    location: data.location,
    reportDate: data.reportDate,
    reportTime: data.reportTime,
    reportType: data.reportType,
    leadDoctor: data.leadDoctor,
    caseReference: data.caseReference
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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeMarkdownText(text) {
  return String(text || "").trim();
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