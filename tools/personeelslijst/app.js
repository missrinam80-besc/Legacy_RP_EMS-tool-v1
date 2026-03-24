let allRows = [];

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    const config = await fetchJson("./config.json");
    allRows = config.demoData || [];
    renderList(allRows);
    showStatus("#statusBox", "Lijst geladen.", "success");
    qs("#searchInput").addEventListener("input", handleSearch);
  } catch (error) {
    showStatus("#statusBox", `Fout bij laden: ${error.message}`, "danger");
  }
}

function handleSearch() {
  const search = sanitizeText(qs("#searchInput").value).toLowerCase();

  const filtered = allRows.filter(row => {
    return [row.name, row.callSign, row.role, row.visible]
      .join(" ")
      .toLowerCase()
      .includes(search);
  });

  renderList(filtered);
}

function renderList(rows) {
  const container = qs("#listContainer");

  if (!rows.length) {
    container.innerHTML = "<p>Geen resultaten gevonden.</p>";
    return;
  }

  const html = rows.map(row => `
    <div class="panel mt-1">
      <strong>${row.name}</strong><br>
      Roepnummer: ${row.callSign}<br>
      Rol: ${row.role}<br>
      Zichtbaar: ${row.visible}
    </div>
  `).join("");

  container.innerHTML = html;
}
