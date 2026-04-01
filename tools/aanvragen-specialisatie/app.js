document.addEventListener('DOMContentLoaded', () => {
  if (!window.EMSRequestForm) return;

  window.EMSRequestForm.create({
    buildSummary: ({ getValue, formatLabelValue, joinLines, buildBlock }) => {
      const naam = getValue('naam');
      const roepnummer = getValue('roepnummer');
      const specialisatie = getValue('specialisatie');
      const ervaring = getValue('ervaring');
      const motivatie = getValue('motivatie');
      const sterktes = getValue('sterktes');
      const verwachting = getValue('verwachting');

      return joinLines([
        '=== SPECIALISATIE-INTERESSE ===',
        formatLabelValue('Naam', naam),
        formatLabelValue('Roepnummer', roepnummer),
        formatLabelValue('Gewenste specialisatie', specialisatie),
        formatLabelValue('Huidige ervaring', ervaring),
        '',
        buildBlock('Motivatie:', motivatie),
        buildBlock('Sterktes of relevante ervaring:', sterktes),
        'Verwachting van het traject:',
        verwachting || '-'
      ]);
    }
  });
});
