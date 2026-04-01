document.addEventListener('DOMContentLoaded', async () => {
  const statusBox = document.querySelector('#hubStatus');

  try {
    await ModuleRegistry.renderPageRegions();
    ModuleRegistry.filterCards('#toolSearch', '.module-card', '.tool-section', '#hubStatus', 'Geen resultaten voor deze zoekopdracht.');
  } catch (error) {
    console.error(error);
    if (statusBox) {
      statusBox.textContent = 'De modules konden niet geladen worden. Controleer de centrale configuratie of de lokale JSON-bestanden.';
      statusBox.classList.remove('status-info');
      statusBox.classList.add('status-danger');
    }
  }
});
