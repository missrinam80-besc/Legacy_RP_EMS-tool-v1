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
      department: 'revalidatie',
      documentType: 'revalidatie-tool'
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
  merged.selects = merged.selects || {};

  const centralInjuries = window.EMSMedicalCentral?.getInjuryLabels(central.injuries) || [];
  const aidNames = window.EMSMedicalCentral?.getAidNames(central.medication) || [];
  const centralCosts = window.EMSMedicalCentral?.getCostRows(central.prices) || [];

  merged.selects.injuryType = [...(merged.selects.injuryType || []), ...centralInjuries];
  merged.selects.supportAid = [...(merged.selects.supportAid || []), ...aidNames];
  merged.checklist = window.EMSMedicalCentral?.unique([
    ...(merged.checklist || []),
    'Centrale letselbibliotheek nagekeken',
    'Hulpmiddel en opvolgregel afgestemd met centrale configuratie'
  ]) || merged.checklist;
  merged.costs = [...(merged.costs || []), ...centralCosts];

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
  const mobilityLevel = valueOf('mobilityLevel');
  const painLevel = valueOf('painLevel');
  const stability = valueOf('stability');

  if (mobilityLevel === 'Niet mobiel' || painLevel === 'Extreem' || stability === 'Onstabiel') return 'Hoog';
  if (urgency === 'Vandaag' || mobilityLevel === 'Sterk beperkt' || painLevel === 'Hoog') return 'Verhoogd';
  return 'Gepland / standaard';
}

function calculateChecklistProgress() {
  const items = $$('.checklist-item');
  if (!items.length) return 0;
  const done = items.filter((item) => item.checked).length;
  return Math.round((done / items.length) * 100);
}

function calculateCostTotal() {
  return $$('.cost-item').filter((item) => item.checked).reduce((sum, item) => sum + Number(item.dataset.amount || 0), 0);
}

function ruleState() {
  return {
    injuryType: valueOf('injuryType'),
    mobilityLevel: valueOf('mobilityLevel'),
    painLevel: valueOf('painLevel'),
    stability: valueOf('stability'),
    weightBearing: valueOf('weightBearing')
  };
}

function buildWarnings() {
  const warnings = [];
  const priority = calculatePriority();
  const checklistProgress = calculateChecklistProgress();
  if (priority === 'Hoog') warnings.push('Casus vraagt snelle fysieke opvolging of herbeoordeling.');
  if (checklistProgress < 60) warnings.push('Revalidatie-checklist is nog onvolledig. Werk basisinschatting verder af.');
  if (valueOf('supportAid') === 'Geen' && (valueOf('mobilityLevel') === 'Sterk beperkt' || valueOf('mobilityLevel') === 'Niet mobiel')) warnings.push('Mobiliteit is sterk beperkt maar er is nog geen hulpmiddel gekozen.');
  if (valueOf('referralDepartment') === 'Geen' && valueOf('outcomeStatus') === 'Nieuwe evaluatie nodig') warnings.push('Nieuwe evaluatie nodig maar er is nog geen vervolgafdeling gekozen.');

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
  const centralInjuries = (window.EMSMedicalCentral?.getInjuryLabels(central.injuries) || []).join(', ') || 'Geen centrale letsels geladen';
  const centralAids = (window.EMSMedicalCentral?.getAidNames(central.medication) || []).join(', ') || 'Geen centrale hulpmiddelen geladen';
  const warnings = buildWarnings();

  return [
    '=== REVALIDATIE-ASSISTENT ===',
    `Patiënt: ${valueOf('patientName')}`,
    `Geboortedatum: ${valueOf('patientDob')}`,
    `Therapeut / verantwoordelijke: ${valueOf('treatingTherapist')}`,
    `Assisterende medewerker: ${valueOf('assistantName')}`,
    `Herkomst casus: ${valueOf('caseOrigin')}`,
    `Urgentie: ${valueOf('urgency')}`,
    `Prioriteit: ${calculatePriority()}`,
    `Type letsel / casus: ${valueOf('injuryType')}`,
    '',
    'Situatieschets / letsel:',
    valueOf('injurySummary'),
    '',
    'Hersteldoel:',
    valueOf('recoveryGoal'),
    '',
    '=== FYSIEKE INSCHATTING ===',
    `Mobiliteit: ${valueOf('mobilityLevel')}`,
    `Pijnniveau: ${valueOf('painLevel')}`,
    `Stabiliteit: ${valueOf('stability')}`,
    `Belastbaarheid: ${valueOf('weightBearing')}`,
    `Herstelfase: ${valueOf('healingPhase')}`,
    `Aandachtspunten: ${valueOf('physicalNotes')}`,
    '',
    '=== CHECKLIST ===',
    checkedChecklist.length ? checkedChecklist.join(', ') : 'Geen checklistpunten afgevinkt.',
    `Checklist voortgang: ${calculateChecklistProgress()}%`,
    '',
    '=== HERSTELTRAJECT ===',
    `Hulpmiddel: ${valueOf('supportAid')}`,
    `Intensiteit traject: ${valueOf('trajectoryIntensity')}`,
    `Oefeningen / RP-stappen: ${valueOf('rpApproach')}`,
    `Beperkingen: ${valueOf('activityRestrictions')}`,
    '',
    '=== CENTRALE INPUT ===',
    `Beschikbare centrale letsels: ${centralInjuries}`,
    `Beschikbare centrale hulpmiddelen: ${centralAids}`,
    warnings.length ? `Centrale aandachtspunten: ${warnings.join(' | ')}` : 'Geen centrale aandachtspunten.',
    '',
    '=== OPVOLGING ===',
    `Huidige evolutie: ${valueOf('outcomeStatus')}`,
    `Doorverwijzing / vervolgafdeling: ${valueOf('referralDepartment')}`,
    `Opvolgplan: ${valueOf('followupPlan')}`,
    `Controlepunten: ${valueOf('alerts')}`,
    '',
    '=== KOSTENBLOK ORTHO / REVALIDATIE ===',
    checkedCosts.length ? checkedCosts.join(', ') : 'Geen revalidatiekosten geselecteerd.',
    `Geschatte kost: €${costTotal.toFixed(0)}`
  ].join('\n');
}

function handleGenerate() {
  const output = $('#summaryOutput');
  const statusBox = $('#statusBox');
  if (!output || !statusBox) return;
  output.value = buildSummary();
  statusBox.textContent = 'Revalidatie-samenvatting gegenereerd. Deze kun je gebruiken als basis voor een herstel- of opvolgverslag.';
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
    departmentKey: 'revalidatie',
    label: 'ortho / revalidatie',
    stage: 'tool',
    nextUrl: '../rapport-revalidatie/index.html',
    autoImport: true,
    importLabel: 'Importeer aanvraag',
    importMapping: {
      patientName: 'patientName',
      patientDob: 'patientDob',
      locatie: 'caseOrigin',
      letselType: 'injuryType',
      mobiliteit: 'mobilityLevel',
      stabiliteit: 'stability',
      samenvatting: 'injurySummary',
      doelstelling: 'recoveryGoal',
      beperkingen: 'activityRestrictions',
      hulpmiddel: 'supportAid',
      extraInfo: 'alerts'
    },
    steps: [
      { id: 'request', title: '1. Aanvraag', shortTitle: 'aanvraag', url: '../aanvraag-ortho-prioritair/index.html' },
      { id: 'tool', title: '2. Tool', shortTitle: 'tool', url: window.location.pathname },
      { id: 'report', title: '3. Rapport', shortTitle: 'rapport', url: '../rapport-revalidatie/index.html' }
    ],
    collectValues: () => ({
      patientName: $('#patientName')?.value || '',
      patientDob: $('#patientDob')?.value || '',
      caseOrigin: $('#caseOrigin')?.value || '',
      urgency: $('#urgency')?.value || '',
      injuryType: $('#injuryType')?.value || '',
      injurySummary: $('#injurySummary')?.value || '',
      recoveryGoal: $('#recoveryGoal')?.value || '',
      mobilityLevel: $('#mobilityLevel')?.value || '',
      painLevel: $('#painLevel')?.value || '',
      stability: $('#stability')?.value || '',
      weightBearing: $('#weightBearing')?.value || '',
      healingPhase: $('#healingPhase')?.value || '',
      physicalNotes: $('#physicalNotes')?.value || '',
      supportAid: $('#supportAid')?.value || '',
      trajectoryIntensity: $('#trajectoryIntensity')?.value || '',
      rpApproach: $('#rpApproach')?.value || '',
      activityRestrictions: $('#activityRestrictions')?.value || '',
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
