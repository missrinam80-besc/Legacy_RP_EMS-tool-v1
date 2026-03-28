document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("requestForm");
  const generateBtn = document.getElementById("generateBtn");
  const copyBtn = document.getElementById("copyBtn");
  const output = document.getElementById("output");
  const statusBox = document.getElementById("requestStatus");

  if (!form || !generateBtn || !copyBtn || !output || !statusBox) return;

  const valueOf = (id) => document.getElementById(id)?.value.trim() || "-";

  function buildSummary() {
    return [
      "=== SPOEDOPERATIE AANVRAAG ===",
      `Patiënt: ${valueOf("patientName")}`,
      `Geboortedatum: ${valueOf("patientDob")}`,
      `Aanvrager: ${valueOf("aanvrager")}`,
      `Roepnummer: ${valueOf("roepnummer")}`,
      `Locatie: ${valueOf("locatie")}`,
      `Urgentie: ${valueOf("urgentie")}`,
      `Stabiliteit: ${valueOf("stabiliteit")}`,
      `Vermoed type ingreep: ${valueOf("ingreepType")}`,
      "",
      "Situatieschets / vermoedelijke diagnose:",
      valueOf("diagnose"),
      "",
      "=== PRE-OP SCREENING ===",
      `Bewustzijn: ${valueOf("bewustzijn")}`,
      `Pols: ${valueOf("pols")}`,
      `Ademhaling: ${valueOf("ademhaling")}`,
      `Bloedverlies: ${valueOf("bloedverlies")}`,
      `Allergieën / bijzonderheden: ${valueOf("allergieen")}`,
      `Nuchterstatus: ${valueOf("nuchter")}`,
      "",
      "Reeds uitgevoerde acties:",
      valueOf("preopActies"),
      "",
      "Extra info voor chirurgie:",
      valueOf("extraInfo"),
      "",
      "Advies: patiënt met prioriteit doorgeven aan chirurgie en operatie-assistent starten."
    ].join("\n");
  }

  generateBtn.addEventListener("click", () => {
    output.value = buildSummary();
    statusBox.textContent = "Spoedoperatie-aanvraag gegenereerd.";
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
