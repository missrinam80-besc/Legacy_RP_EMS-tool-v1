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
      department: 'psychologie',
      documentType: 'psychologie-tool'
    });
  }
}

function populateSelect(id, options) {
  const element = document.getElementById(id);
  if (!element) return;

  const values = window.EMSMedicalCentral?.unique(options || []) || (options || []);
  element.innerHTML = [`<option value="">Maak een keuze</option>`]
    .concat(values.map((option) => `<option>${escapeHtml(option)}</option>`))
    .join('');
}

function buildEnhancedConfig() {
  const merged = JSON.parse(JSON.stringify(config || { selects: {}, checklist: [], costs: [] }));
  const medicationNames = window.EMSMedicalCentral?.getMedicationNames(central.medication) || [];
  const centralCosts = window.EMSMedicalCentral?.getCostRows(central.prices) || [];

  merged.selects = merged.selects || {};
  merged.selects.medicationAdvice = [
    ...(merged.selects.medicationAdvice || []),
    ...medicationNames.map((name) => `${name} (centrale medicatie)`)
  ];

  merged.costs = [...(merged.costs || []), ...centralCosts];
  merged.checklist = window.EMSMedicalCentral?.unique([
    ...(merged.checklist || []),
    'Centrale behandelregels nagekeken',
    'Doorverwijzing en medicatie-advies afgestemd'
  ]) || merged.checklist;

  return merged;
}

function populateSelects() {
  Object.entries(config.selects || {}).forEach(([id, options]) => populateSelect(id, options));
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
  const riskLevel = valueOf('riskLevel');
  const mentalState = valueOf('mentalState');

  if (urgency === 'Onmiddellijk' || riskLevel === 'Acuut' || mentalState === 'Agressief') return 'Kritiek';
  if (urgency === 'Vandaag' || riskLevel === 'Hoog' || mentalState === 'Ontregeld') return 'Hoog';
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
    riskLevel: valueOf('riskLevel'),
    mentalState: valueOf('mentalState'),
    outcomeStatus: valueOf('outcomeStatus'),
    medicationAdvice: valueOf('medicationAdvice')
  };
}

function buildWarnings() {
  const warnings = [];
  const priority = calculatePriority();
  const checklistProgress = calculateChecklistProgress();
  const medicationAdvice = valueOf('medicationAdvice');

  if (priority === 'Kritiek') warnings.push('Patiënt vraagt onmiddellijke psychologische of multidisciplinaire interventie.');
  if (checklistProgress < 60) warnings.push('Checklist is nog onvolledig. Werk intake en risicobeoordeling verder af.');
  if (medicationAdvice !== '-' && medicationAdvice !== 'Geen') warnings.push('Medicatie of psychiatrische opvolging werd aangeduid. Stem dit RP-technisch af met arts of opnameflow.');
  if (valueOf('outcomeStatus') === 'Opname / observatie nodig' && valueOf('referralDepartment') === 'Geen') warnings.push('Opname of observatie is nodig, maar er is nog geen vervolgafdeling gekozen.');

  const ruleAdvice = window.EMSMedicalCentral?.evaluateRules(central.treatmentRules, ruleState()) || [];
  ruleAdvice.forEach((rule) => warnings.push(window.EMSMedicalCentral.formatAdvice(rule)));

  return window.EMSMedicalCentral?.unique(warnings).length
    ? window.EMSMedicalCentral.unique(warnings)
    : ['Geen directe waarschuwingen op basis van de huidige invoer.'];
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
  const centralMedication = (window.EMSMedicalCentral?.getMedicationNames(central.medication) || []).join(', ') || 'Geen centrale suggesties geladen';
  const warnings = buildWarnings();

  return [
    '=== PSYCHOLOGIE-ASSISTENT ===',
    `Patiënt: ${valueOf('patientName')}`,
    `Geboortedatum: ${valueOf('patientDob')}`,
    `Psycholoog / verantwoordelijke: ${valueOf('treatingPsychologist')}`,
    `Ondersteunende medewerker: ${valueOf('assistantName')}`,
    `Herkomst casus: ${valueOf('caseOrigin')}`,
    `Urgentie: ${valueOf('urgency')}`,
    `Prioriteit: ${calculatePriority()}`,
    `Type casus: ${valueOf('caseType')}`,
    '',
    'Intake / situatieschets:',
    valueOf('intakeSummary'),
    '',
    'Doel van begeleiding:',
    valueOf('supportGoal'),
    '',
    '=== MENTALE INSCHATTING ===',
    `Risiconiveau: ${valueOf('riskLevel')}`,
    `Mentale toestand: ${valueOf('mentalState')}`,
    `Medewerking: ${valueOf('cooperation')}`,
    `Oriëntatie: ${valueOf('orientation')}`,
    `Slaap / functioneren: ${valueOf('sleepFunctioning')}`,
    `Risico-opmerkingen: ${valueOf('riskNotes')}`,
    `Context / trigger: ${valueOf('contextNotes')}`,
    '',
    '=== CHECKLIST ===',
    checkedChecklist.length ? checkedChecklist.join(', ') : 'Geen checklistpunten afgevinkt.',
    `Checklist voortgang: ${calculateChecklistProgress()}%`,
    '',
    '=== TRAJECT EN AANPAK ===',
    `Type traject: ${valueOf('trajectoryType')}`,
    `Frequentie: ${valueOf('sessionFrequency')}`,
    `Medicatie / psychiatrisch advies: ${valueOf('medicationAdvice')}`,
    `Aanpak / gesprekstechniek: ${valueOf('rpApproach')}`,
    '',
    '=== CENTRALE INPUT ===',
    `Beschikbare centrale medicatie / hulpmiddelen: ${centralMedication}`,
    warnings.length ? `Centrale aandachtspunten: ${warnings.join(' | ')}` : 'Geen centrale aandachtspunten.',
    '',
    '=== OPVOLGING ===',
    `Uitkomst na sessie: ${valueOf('outcomeStatus')}`,
    `Doorverwijzing / vervolgafdeling: ${valueOf('referralDepartment')}`,
    `Opvolgplan: ${valueOf('followupPlan')}`,
    `Aandachtspunten / waarschuwingen: ${valueOf('alerts')}`,
    '',
    '=== KOSTENBLOK PSYCHOLOGIE ===',
    checkedCosts.length ? checkedCosts.join(', ') : 'Geen psychologische kosten geselecteerd.',
    `Geschatte kost: €${costTotal.toFixed(0)}`
  ].join('\n');
}

function handleGenerate() {
  const output = $('#summaryOutput');
  const statusBox = $('#statusBox');
  if (!output || !statusBox) return;

  output.value = buildSummary();
  statusBox.textContent = 'Psychologie-samenvatting gegenereerd. Deze kun je gebruiken als basis voor consult, traject of overdracht.';
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
  updateDerivedState();
}

function initDepartmentFlow() {
  if (!window.DepartmentFlow) return;
  DepartmentFlow.init({
    departmentKey: 'psychologie',
    label: 'psychologie',
    stage: 'tool',
    nextUrl: '../rapport-psychologie/index.html',
    autoImport: true,
    importLabel: 'Importeer aanvraag',
    importMapping: {
      patientName: 'patientName',
      patientDob: 'patientDob',
      locatie: 'caseOrigin',
      hulpvraag: 'intakeSummary',
      huidigeSituatie: 'intakeSummary',
      huidigeThema: 'contextNotes',
      presentatie: 'mentalState',
      veiligheid: 'riskLevel',
      risicoIndicaties: 'riskNotes',
      eersteActies: 'rpApproach',
      trajectType: 'trajectoryType',
      extraInfo: 'alerts'
    },
    steps: [
      { id: 'request', title: '1. Aanvraag', shortTitle: 'aanvraag', url: '../aanvraag-psychologie-crisis/index.html' },
      { id: 'tool', title: '2. Tool', shortTitle: 'tool', url: window.location.pathname },
      { id: 'report', title: '3. Rapport', shortTitle: 'rapport', url: '../rapport-psychologie/index.html' }
    ],
    collectValues: () => ({
      patientName: $('#patientName')?.value || '',
      patientDob: $('#patientDob')?.value || '',
      caseOrigin: $('#caseOrigin')?.value || '',
      urgency: $('#urgency')?.value || '',
      caseType: $('#caseType')?.value || '',
      riskLevel: $('#riskLevel')?.value || '',
      intakeSummary: $('#intakeSummary')?.value || '',
      supportGoal: $('#supportGoal')?.value || '',
      mentalState: $('#mentalState')?.value || '',
      cooperation: $('#cooperation')?.value || '',
      orientation: $('#orientation')?.value || '',
      sleepFunctioning: $('#sleepFunctioning')?.value || '',
      riskNotes: $('#riskNotes')?.value || '',
      contextNotes: $('#contextNotes')?.value || '',
      trajectoryType: $('#trajectoryType')?.value || '',
      sessionFrequency: $('#sessionFrequency')?.value || '',
      medicationAdvice: $('#medicationAdvice')?.value || '',
      rpApproach: $('#rpApproach')?.value || '',
      outcomeStatus: $('#outcomeStatus')?.value || '',
      referralDepartment: $('#referralDepartment')?.value || '',
      followupPlan: $('#followupPlan')?.value || '',
      alerts: $('#alerts')?.value || ''
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
  updateDerivedState();
  initDepartmentFlow();
});
