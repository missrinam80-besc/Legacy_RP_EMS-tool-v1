document.addEventListener('DOMContentLoaded', () => {
  if (!window.EMSRequestForm) return;

  window.EMSRequestForm.create({
    buildSummary: ({ getValue, formatLabelValue, joinLines, buildBlock }) => {
      const naam = getValue('naam');
      const roepnummer = getValue('roepnummer');
      const opleidingType = getValue('opleidingType');
      const afdeling = getValue('afdeling');
      const reden = getValue('reden');
      const leerdoelen = getValue('leerdoelen');
      const beschikbaarheid = getValue('beschikbaarheid');

      return joinLines([
        '=== TRAININGSAANVRAAG ===',
        formatLabelValue('Naam', naam),
        formatLabelValue('Roepnummer', roepnummer),
        formatLabelValue('Type training', opleidingType),
        formatLabelValue('Gewenste afdeling', afdeling),
        '',
        buildBlock('Reden van aanvraag:', reden),
        buildBlock('Leerdoelen:', leerdoelen),
        'Beschikbaarheid / extra info:',
        beschikbaarheid || '-'
      ]);
    }
  });
});
