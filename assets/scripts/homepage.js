document.addEventListener('DOMContentLoaded', async () => {
  await ModuleRegistry.renderPageRegions();
  ModuleRegistry.filterCards('#toolSearch', '.module-card', '.tool-section', '#hubStatus', 'Geen resultaten voor deze zoekopdracht.');
});
