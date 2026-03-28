document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("requestForm");
  const generateBtn = document.getElementById("generateBtn");
  const copyBtn = document.getElementById("copyBtn");
  const output = document.getElementById("output");
  const statusBox = document.getElementById("requestStatus");

  if (!form || !generateBtn || !copyBtn || !output || !statusBox) return;

  function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }

  function buildSummary() {
    const naam = getValue("naam");
    const roepnummer = getValue("roepnummer");
    const opleidingType = getValue("opleidingType");
    const afdeling = getValue("afdeling");
    const reden = getValue("reden");
    const leerdoelen = getValue("leerdoelen");
    const beschikbaarheid = getValue("beschikbaarheid");

    return [
      "=== TRAININGSAANVRAAG ===",
      `Naam: ${naam || "-"}`,
      `Roepnummer: ${roepnummer || "-"}`,
      `Type training: ${opleidingType || "-"}`,
      `Gewenste afdeling: ${afdeling || "-"}`,
      "",
      "Reden van aanvraag:",
      reden || "-",
      "",
      "Leerdoelen:",
      leerdoelen || "-",
      "",
      "Beschikbaarheid / extra info:",
      beschikbaarheid || "-"
    ].join("\n");
  }

  generateBtn.addEventListener("click", () => {
    output.value = buildSummary();
    statusBox.textContent = "Samenvatting gegenereerd.";
  });

  copyBtn.addEventListener("click", async () => {
    if (!output.value.trim()) {
      statusBox.textContent = "Er is nog geen tekst om te kopiëren.";
      return;
    }

    try {
      await navigator.clipboard.writeText(output.value);
      statusBox.textContent = "Tekst gekopieerd naar het klembord.";
    } catch {
      statusBox.textContent = "Kopiëren is niet gelukt.";
    }
  });

  form.addEventListener("reset", () => {
    setTimeout(() => {
      output.value = "";
      statusBox.textContent = "Formulier werd gereset.";
    }, 0);
  });
});