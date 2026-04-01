document.addEventListener('DOMContentLoaded', async () => {
  const statusBox = document.querySelector('#portalSearchStatus');

  try {
    await ModuleRegistry.renderPageRegions();
    ModuleRegistry.filterCards('#portalSearch', '.module-card', '.portal-section', '#portalSearchStatus', 'Geen resultaten in dit portaal.');
  } catch (error) {
    console.error(error);
    if (statusBox) {
      statusBox.textContent = 'De modules konden niet geladen worden. Controleer de centrale configuratie of de lokale JSON-bestanden.';
      statusBox.classList.remove('status-info');
      statusBox.classList.add('status-danger');
    }
  }
});
