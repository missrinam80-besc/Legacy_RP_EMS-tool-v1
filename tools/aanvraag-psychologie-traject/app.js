document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("requestForm");
  const generateBtn = document.getElementById("generateBtn");
  const copyBtn = document.getElementById("copyBtn");
  const output = document.getElementById("output");
  const statusBox = document.getElementById("requestStatus");

  if (!form || !generateBtn || !copyBtn || !output || !statusBox) return;

  const valueOf = (id) => document.getElementById(id)?.value.trim() || "-";

  function buildSummary() {
    return ["=== PSYCHOLOGISCH TRAJECTVOORSTEL ===",`Patiënt: ${valueOf("patientName")}`,`Geboortedatum: ${valueOf("patientDob")}`,`Aanvrager: ${valueOf("aanvrager")}`,`Locatie / context: ${valueOf("locatie")}`,`Gewenste timing: ${valueOf("urgentie")}`,`Type hulpvraag: ${valueOf("casusType")}`,`Huidige mentale toestand: ${valueOf("mentaleToestand")}`,`Complexiteit: ${valueOf("veiligheidsrisico")}`,"","Hulpvraag / trajectindicatie:",valueOf("situatie"),"",`Medewerking patiënt: ${valueOf("cooperatie")}`,`Betrokkenen / netwerk: ${valueOf("supportNetwerk")}`,`Reeds gevoerde gesprekken: ${valueOf("reedsGedaan")}`,`Voorgesteld traject: ${valueOf("doorverwijzing")}`,"","Extra info:",valueOf("extraInfo"),"","Advies: open de psychologie-assistent om intake, aanpak en opvolgplan verder uit te werken."].join("\n");
  }

  generateBtn.addEventListener("click", () => {
    output.value = buildSummary();
    statusBox.textContent = "Psychologisch trajectvoorstel gegenereerd.";
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
