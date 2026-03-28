document.addEventListener('DOMContentLoaded', async () => {
  await ModuleRegistry.renderPageRegions();
  ModuleRegistry.filterCards('#portalSearch', '.module-card', '.portal-section', '#portalSearchStatus', 'Geen resultaten in dit portaal.');
});
