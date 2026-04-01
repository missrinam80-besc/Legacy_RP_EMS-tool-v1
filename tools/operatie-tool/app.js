const CONFIG_URL = './config.json';
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

let config = null;
let central = { prices: [], medication: [], injuries: [], treatmentRules: [] };

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function valueOf(id) {
  return document.getElementById(id)?.value.trim() || '-';
}

function checkedValues(selector) {
  return $$(selector)
    .filter((item) => item.checked)
    .map((item) => item.dataset.label || item.value || '')
    .filter(Boolean);
}

async function loadConfig() {
  try {
    const response = await fetch(CONFIG_URL, { cache: 'no-store' });
    config = await response.json();
  } catch {
    config = { selects: {}, checklist: [], costs: [] };
  }

  if (window.EMSMedicalCentral) {
    central = await window.EMSMedicalCentral.loadContext({
      department: 'chirurgie',
      documentType: 'operatie-tool'
    });
  }
}

function buildEnhancedConfig() {
  const merged = JSON.parse(JSON.stringify(config || { selects: {}, checklist: [], costs: [] }));
  merged.selects = merged.selects || {};

  const injuryLabels = window.EMSMedicalCentral?.getInjuryLabels(central.injuries) || [];
  const centralMedication = window.EMSMedicalCentral?.getMedicationNames(central.medication) || [];
  const centralCosts = window.EMSMedicalCentral?.getCostRows(central.prices) || [];

  merged.selects.operationType = [...(merged.selects.operationType || []), ...injuryLabels.map((label) => `${label} - chirurgische opvolging`)];
  merged.checklist = window.EMSMedicalCentral?.unique([
    ...(merged.checklist || []),
    'Centrale letsels en behandelregels nagekeken',
    'Benodigde centrale medicatie of hulpmiddelen afgewogen'
  ]) || merged.checklist;
  merged.costs = [...(merged.costs || []), ...centralCosts];
  merged.__centralMedication = centralMedication;

  return merged;
}

function populateSelect(id, options) {
  const element = document.getElementById(id);
  if (!element) return;
  const values = window.EMSMedicalCentral?.unique(options || []) || (options || []);
  element.innerHTML = [`<option value="">Maak een keuze</option>`]
    .concat(values.map((option) => `<option>${escapeHtml(option)}</option>`))
    .join('');
}

function populateSelects() {
  Object.entries(config.selects || {}).forEach(([id, options]) => {
    if (id.startsWith('__')) return;
    populateSelect(id, options);
  });
}

function buildChecklist() {
  const container = $('#checklistGrid');
  if (!container) return;
  container.innerHTML = (config.checklist || []).map((item, index) => `
    <label class="check-card">
      <input type="checkbox" class="checklist-item" data-label="${escapeHtml(item)}" id="check-${index}" />
      <span>${escapeHtml(item)}</span>
    </label>
  `).join('');
}

function buildCostGrid() {
  const container = $('#costGrid');
  if (!container) return;
  container.innerHTML = (config.costs || []).map((item, index) => `
    <label class="cost-card">
      <input type="checkbox" class="cost-item" data-amount="${item.amount}" data-label="${escapeHtml(item.label)}" id="cost-${index}" />
      <span class="cost-card__title">${escapeHtml(item.label)}</span>
      <span class="cost-card__amount">€${Number(item.amount).toFixed(0)}</span>
    </label>
  `).join('');
}

function bindEvents() {
  $('#generateBtn')?.addEventListener('click', handleGenerate);
  $('#copyBtn')?.addEventListener('click', handleCopy);
  $('#resetBtn')?.addEventListener('click', handleReset);

  $$('input, select, textarea').forEach((element) => {
    element.addEventListener('input', updateDerivedState);
    element.addEventListener('change', updateDerivedState);
  });
}

function calculatePriority() {
  const urgency = valueOf('urgency');
  const stability = valueOf('stability');
  const bloodLoss = valueOf('bloodLoss');
  const consciousness = valueOf('consciousness');

  if (urgency === 'Onmiddellijk' || stability === 'Kritiek' || bloodLoss === 'Ernstig' || consciousness === 'Buiten bewustzijn') return 'Kritiek';
  if (urgency === 'Binnen 30 minuten' || stability === 'Onstabiel' || bloodLoss === 'Veel') return 'Hoog';
  if (urgency === 'Binnen 1 uur' || stability === 'Matig stabiel') return 'Verhoogd';
  return 'Gepland / standaard';
}

function calculateChecklistProgress() {
  const items = $$('.checklist-item');
  if (!items.length) return 0;
  const done = items.filter((item) => item.checked).length;
  return Math.round((done / items.length) * 100);
}

function calculateCostTotal() {
  return $$('.cost-item')
    .filter((item) => item.checked)
    .reduce((sum, item) => sum + Number(item.dataset.amount || 0), 0);
}

function ruleState() {
  return {
    urgency: valueOf('urgency'),
    stability: valueOf('stability'),
    bloodloss: valueOf('bloodLoss'),
    bloodLoss: valueOf('bloodLoss'),
    consciousness: valueOf('consciousness'),
    painLevel: valueOf('painLevel')
  };
}

function buildWarnings() {
  const warnings = [];
  const priority = calculatePriority();
  const checklistProgress = calculateChecklistProgress();
  const npoStatus = valueOf('npoStatus');
  const allergies = valueOf('allergies');
  const postOpStatus = valueOf('postOpStatus');

  if (priority === 'Kritiek') warnings.push('Patiënt heeft kritieke prioriteit: onmiddellijke chirurgische aandacht nodig.');
  if (checklistProgress < 60) warnings.push('Checklist is nog onvolledig. Controleer pre-op stappen voor start van de ingreep.');
  if (npoStatus === 'Nee' || npoStatus === 'Onbekend') warnings.push('Nuchterstatus is niet ideaal of onbekend. Hou hier RP-technisch rekening mee.');
  if (allergies !== '-' && allergies.toLowerCase() !== 'geen') warnings.push('Er zijn allergieën of risico\'s genoteerd. Verifieer medicatie en voorbereiding.');
  if (postOpStatus === 'Instabiel') warnings.push('Post-op status is instabiel. Voorzie opname of intensieve opvolging.');

  const ruleAdvice = window.EMSMedicalCentral?.evaluateRules(central.treatmentRules, ruleState()) || [];
  ruleAdvice.forEach((rule) => warnings.push(window.EMSMedicalCentral.formatAdvice(rule)));

  return window.EMSMedicalCentral?.unique(warnings).length
    ? window.EMSMedicalCentral.unique(warnings)
    : ['Geen directe waarschuwingen op basis van de huidige invoer.'];
}

function updateMaterialHints() {
  const field = $('#requiredMaterials');
  if (!field || field.dataset.centralTouched === 'true') return;
  const centralMedication = config.__centralMedication || [];
  if (!centralMedication.length) return;
  field.value = centralMedication.slice(0, 4).join(', ');
}

function updateDerivedState() {
  const priority = calculatePriority();
  const checklistProgress = calculateChecklistProgress();
  const costTotal = calculateCostTotal();
  const warnings = buildWarnings();

  if ($('#priorityBadge')) $('#priorityBadge').textContent = priority;
  if ($('#checklistBadge')) $('#checklistBadge').textContent = `${checklistProgress}% voltooid`;
  if ($('#costBadge')) $('#costBadge').textContent = `€${costTotal.toFixed(0)}`;
  if ($('#warningList')) $('#warningList').innerHTML = warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('');
}

function buildSummary() {
  const checkedChecklist = checkedValues('.checklist-item');
  const checkedCosts = checkedValues('.cost-item');
  const costTotal = calculateCostTotal();
  const centralInjuries = (window.EMSMedicalCentral?.getInjuryLabels(central.injuries) || []).join(', ') || 'Geen centrale letsels geladen';
  const centralMedication = (config.__centralMedication || []).join(', ') || 'Geen centrale medicatie geladen';
  const warnings = buildWarnings();

  return [
    '=== OPERATIE-ASSISTENT ===',
    `Patiënt: ${valueOf('patientName')}`,
    `Geboortedatum: ${valueOf('patientDob')}`,
    `Chirurg / verantwoordelijke: ${valueOf('treatingSurgeon')}`,
    `Operatie-assistent: ${valueOf('assistantName')}`,
    `Herkomst casus: ${valueOf('caseOrigin')}`,
    `Urgentie: ${valueOf('urgency')}`,
    `Prioriteit: ${calculatePriority()}`,
    `Type ingreep: ${valueOf('operationType')}`,
    `Complexiteit: ${valueOf('operationComplexity')}`,
    `Stabiliteit: ${valueOf('stability')}`,
    '',
    'Situatieschets / diagnose:',
    valueOf('diagnosis'),
    '',
    'Doel van de ingreep:',
    valueOf('surgicalGoal'),
    '',
    '=== PRE-OP SCREENING ===',
    `Bewustzijn: ${valueOf('consciousness')}`,
    `Pols: ${valueOf('pulse')}`,
    `Ademhaling: ${valueOf('breathing')}`,
    `Bloedverlies: ${valueOf('bloodLoss')}`,
    `Pijnniveau: ${valueOf('painLevel')}`,
    `Nuchterstatus: ${valueOf('npoStatus')}`,
    `Allergieën / risico's: ${valueOf('allergies')}`,
    `Voorbereiding reeds uitgevoerd: ${valueOf('preOpActions')}`,
    '',
    '=== CHECKLIST ===',
    checkedChecklist.length ? checkedChecklist.join(', ') : 'Geen checklistpunten afgevinkt.',
    `Checklist voortgang: ${calculateChecklistProgress()}%`,
    '',
    '=== INGREEP ===',
    `Anesthesie / sedatie: ${valueOf('anesthesia')}`,
    `Benodigd materiaal: ${valueOf('requiredMaterials')}`,
    'RP-stappen:',
    valueOf('rpSteps'),
    '',
    '=== CENTRALE INPUT ===',
    `Beschikbare centrale letsels: ${centralInjuries}`,
    `Beschikbare centrale medicatie / hulpmiddelen: ${centralMedication}`,
    warnings.length ? `Centrale aandachtspunten: ${warnings.join(' | ')}` : 'Geen centrale aandachtspunten.',
    '',
    '=== POST-OP ===',
    `Onmiddellijke post-op status: ${valueOf('postOpStatus')}`,
    `Vervolgafdeling: ${valueOf('followupDepartment')}`,
    `Post-op plan: ${valueOf('postOpPlan')}`,
    `Complicaties / aandachtspunten: ${valueOf('complications')}`,
    '',
    '=== KOSTENBLOK CHIRURGIE ===',
    checkedCosts.length ? checkedCosts.join(', ') : 'Geen chirurgische kosten geselecteerd.',
    `Geschatte chirurgische kost: €${costTotal.toFixed(0)}`
  ].join('\n');
}

function handleGenerate() {
  const output = $('#summaryOutput');
  const statusBox = $('#statusBox');
  if (!output || !statusBox) return;
  output.value = buildSummary();
  statusBox.textContent = 'Operatie-samenvatting gegenereerd. Deze kun je gebruiken als basis voor het operatierapport.';
  updateDerivedState();
}

async function handleCopy() {
  const output = $('#summaryOutput');
  const statusBox = $('#statusBox');
  if (!output || !statusBox) return;

  if (!output.value.trim()) {
    statusBox.textContent = 'Genereer eerst een samenvatting voor je kopieert.';
    return;
  }

  try {
    await navigator.clipboard.writeText(output.value);
    statusBox.textContent = 'Samenvatting gekopieerd naar het klembord.';
  } catch {
    statusBox.textContent = 'Kopiëren is niet gelukt.';
  }
}

function handleReset() {
  $$('input, textarea').forEach((element) => {
    if (element.type === 'checkbox') element.checked = false;
    else element.value = '';
  });

  $$('select').forEach((select) => { select.selectedIndex = 0; });
  if ($('#summaryOutput')) $('#summaryOutput').value = '';
  if ($('#statusBox')) $('#statusBox').textContent = 'Formulier gereset.';
  updateMaterialHints();
  updateDerivedState();
}

function initDepartmentFlow() {
  if (!window.DepartmentFlow) return;
  DepartmentFlow.init({
    departmentKey: 'chirurgie',
    label: 'chirurgie',
    stage: 'tool',
    nextUrl: '../rapport-operatie/index.html',
    autoImport: true,
    importLabel: 'Importeer aanvraag',
    importMapping: {
      patientName: 'patientName',
      patientDob: 'patientDob',
      locatie: 'location',
      urgency: 'urgency',
      urgentie: 'urgency',
      stabiliteit: 'stability',
      ingreepType: 'operationType',
      diagnose: 'diagnosis',
      bewustzijn: 'consciousness',
      pols: 'pulse',
      bloedverlies: 'bloodLoss',
      allergieen: 'allergies',
      nuchter: 'npoStatus',
      preopActies: 'preOpActions',
      extraInfo: 'extraInfo'
    },
    steps: [
      { id: 'request', title: '1. Aanvraag', shortTitle: 'aanvraag', url: '../aanvraag-spoedoperatie/index.html' },
      { id: 'tool', title: '2. Tool', shortTitle: 'tool', url: window.location.pathname },
      { id: 'report', title: '3. Rapport', shortTitle: 'rapport', url: '../rapport-operatie/index.html' }
    ],
    collectValues: () => ({
      patientName: $('#patientName')?.value || '',
      patientDob: $('#patientDob')?.value || '',
      location: $('#location')?.value || '',
      operationType: $('#operationType')?.value || '',
      diagnosis: $('#diagnosis')?.value || '',
      urgency: $('#urgency')?.value || '',
      stability: $('#stability')?.value || '',
      consciousness: $('#consciousness')?.value || '',
      pulse: $('#pulse')?.value || '',
      bloodLoss: $('#bloodLoss')?.value || '',
      allergies: $('#allergies')?.value || '',
      npoStatus: $('#npoStatus')?.value || '',
      preOpActions: $('#preOpActions')?.value || '',
      postOpPlan: $('#postOpPlan')?.value || '',
      extraInfo: $('#extraInfo')?.value || ''
    }),
    buildSummary: () => $('#summaryOutput')?.value || '',
    saveNextLabel: 'Zet klaar voor rapport'
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  config = buildEnhancedConfig();
  populateSelects();
  buildChecklist();
  buildCostGrid();
  bindEvents();
  $('#requiredMaterials')?.addEventListener('input', () => { $('#requiredMaterials').dataset.centralTouched = 'true'; });
  updateMaterialHints();
  updateDerivedState();
  initDepartmentFlow();
});
