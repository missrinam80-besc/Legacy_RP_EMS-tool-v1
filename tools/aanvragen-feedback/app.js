/**
 * Feedbackformulier
 * -----------------
 * Standaardrequestmodule met uniforme samenvatting, reset- en copygedrag.
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!window.EMSRequestForm) return;

  window.EMSRequestForm.create({
    buildSummary: ({ getValue, formatLabelValue, joinLines, buildBlock }) => {
      const naam = getValue('naam');
      const roepnummer = getValue('roepnummer');
      const feedbackType = getValue('feedbackType');
      const feedbackDoel = getValue('feedbackDoel');
      const situatie = getValue('situatie');
      const feedbackInhoud = getValue('feedbackInhoud');
      const voorstel = getValue('voorstel');

      return joinLines([
        '=== FEEDBACKFORMULIER ===',
        formatLabelValue('Naam', naam),
        formatLabelValue('Roepnummer', roepnummer),
        formatLabelValue('Type feedback', feedbackType),
        formatLabelValue('Gericht aan', feedbackDoel),
        '',
        buildBlock('Situatie / context:', situatie),
        buildBlock('Feedback:', feedbackInhoud),
        'Voorstel / gewenste verbetering:',
        voorstel || '-'
      ]);
    }
  });
});
