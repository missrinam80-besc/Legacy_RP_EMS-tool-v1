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
      "=== OPERATIEPLANNING AANVRAAG ===",
      `Patiënt: ${valueOf("patientName")}`,
      `Geboortedatum: ${valueOf("patientDob")}`,
      `Aanvrager: ${valueOf("aanvrager")}`,
      `Herkomst casus: ${valueOf("afdelingBron")}`,
      `Gewenste timing: ${valueOf("planning")}`,
      `Type ingreep: ${valueOf("ingreepType")}`,
      `Opname voorzien: ${valueOf("opname")}`,
      "",
      "Indicatie / diagnose:",
      valueOf("diagnose"),
      "",
      `Mobiliteit / beperkingen: ${valueOf("beperkingen")}`,
      `Nog te regelen pre-op: ${valueOf("preopNodig")}`,
      `Bijzondere risico's: ${valueOf("risico")}`,
      "",
      "Extra info / planningnotities:",
      valueOf("extraInfo"),
      "",
      "Advies: plan consult / operatievoorbereiding en werk bij start van de ingreep verder in de operatie-assistent."
    ].join("\n");
  }

  generateBtn.addEventListener("click", () => {
    output.value = buildSummary();
    statusBox.textContent = "Operatieplanning-aanvraag gegenereerd.";
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
