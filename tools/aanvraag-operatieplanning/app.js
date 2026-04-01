document.addEventListener('DOMContentLoaded', () => {
  const request = window.EMSRequestForm?.create({
    generatedMessage: 'Operatieplanning-aanvraag gegenereerd.',
    buildSummary: ({ getValue, joinLines }) => joinLines([
      '=== OPERATIEPLANNING AANVRAAG ===',
      `Patiënt: ${getValue('patientName') || '-'}`,
      `Geboortedatum: ${getValue('patientDob') || '-'}`,
      `Aanvrager: ${getValue('aanvrager') || '-'}`,
      `Herkomst casus: ${getValue('afdelingBron') || '-'}`,
      `Gewenste timing: ${getValue('planning') || '-'}`,
      `Type ingreep: ${getValue('ingreepType') || '-'}`,
      `Opname voorzien: ${getValue('opname') || '-'}`,
      '',
      'Indicatie / diagnose:',
      getValue('diagnose') || '-',
      '',
      `Mobiliteit / beperkingen: ${getValue('beperkingen') || '-'}`,
      `Nog te regelen pre-op: ${getValue('preopNodig') || '-'}`,
      `Bijzondere risico's: ${getValue('risico') || '-'}`,
      '',
      'Extra info / planningnotities:',
      getValue('extraInfo') || '-',
      '',
      'Advies: plan consult / operatievoorbereiding en werk de ingreep verder uit in de operatie-assistent.'
    ])
  });
  if (!request) return;
  if (window.DepartmentFlow) {
    DepartmentFlow.init({
      departmentKey: 'chirurgie', label: 'chirurgie', stage: 'request', nextUrl: '../operatie-tool/index.html',
      steps: [
        { id: 'request', title: '1. Aanvraag', shortTitle: 'aanvraag', url: window.location.pathname },
        { id: 'tool', title: '2. Tool', shortTitle: 'tool', url: '../operatie-tool/index.html' },
        { id: 'report', title: '3. Rapport', shortTitle: 'rapport', url: '../rapport-operatie/index.html' }
      ],
      collectValues: () => ({ patientName: document.getElementById('patientName')?.value || '', patientDob: document.getElementById('patientDob')?.value || '', aanvrager: document.getElementById('aanvrager')?.value || '', afdelingBron: document.getElementById('afdelingBron')?.value || '', planning: document.getElementById('planning')?.value || '', ingreepType: document.getElementById('ingreepType')?.value || '', opname: document.getElementById('opname')?.value || '', diagnose: document.getElementById('diagnose')?.value || '', beperkingen: document.getElementById('beperkingen')?.value || '', preopNodig: document.getElementById('preopNodig')?.value || '', risico: document.getElementById('risico')?.value || '', extraInfo: document.getElementById('extraInfo')?.value || '' }),
      buildSummary: () => request.output.value.trim() || '', saveNextLabel: 'Zet klaar voor tool'
    });
  }
});
