document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("requestForm");
  const generateBtn = document.getElementById("generateBtn");
  const copyBtn = document.getElementById("copyBtn");
  const output = document.getElementById("output");
  const statusBox = document.getElementById("requestStatus");

  if (!form || !generateBtn || !copyBtn || !output || !statusBox) return;

  const valueOf = (id) => document.getElementById(id)?.value.trim() || "-";

  function buildSummary() {
    return ["=== PRIORITAIRE ORTHO / REVALIDATIE AANVRAAG ===",`Patiënt: ${valueOf("patientName")}`,`Geboortedatum: ${valueOf("patientDob")}`,`Aanvrager: ${valueOf("aanvrager")}`,`Locatie: ${valueOf("locatie")}`,`Urgentie: ${valueOf("urgentie")}`,`Type letsel / casus: ${valueOf("casusType")}`,`Mobiliteit: ${valueOf("mentaleToestand")}`,`Prioriteit: ${valueOf("veiligheidsrisico")}`,"","Situatieschets:",valueOf("situatie"),"",`Belastbaarheid: ${valueOf("cooperatie")}`,`Betrokken zone / hulpmiddel: ${valueOf("supportNetwerk")}`,`Reeds ondernomen zorgen: ${valueOf("reedsGedaan")}`,`Verwachte vervolgflow: ${valueOf("doorverwijzing")}`,"","Extra info:",valueOf("extraInfo"),"","Advies: open de revalidatie-assistent om herstelplan, hulpmiddelen en opvolging verder uit te werken."].join("\n");
  }

  generateBtn.addEventListener("click", () => {
    output.value = buildSummary();
    statusBox.textContent = "Prioritaire ortho / revalidatie aanvraag gegenereerd.";
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
