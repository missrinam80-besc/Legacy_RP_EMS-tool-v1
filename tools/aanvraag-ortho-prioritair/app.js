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



  if (window.DepartmentFlow) {
    DepartmentFlow.init({
      departmentKey: "revalidatie",
      label: "ortho / revalidatie",
      stage: "request",
      nextUrl: "../revalidatie-tool/index.html",
      steps: [
        { id: "request", title: "1. Aanvraag", shortTitle: "aanvraag", url: window.location.pathname },
        { id: "tool", title: "2. Tool", shortTitle: "tool", url: "../revalidatie-tool/index.html" },
        { id: "report", title: "3. Rapport", shortTitle: "rapport", url: "../rapport-revalidatie/index.html" }
      ],
      collectValues: () => ({
        patientName: document.getElementById("patientName")?.value || "",
        patientDob: document.getElementById("patientDob")?.value || "",
        aanvrager: document.getElementById("aanvrager")?.value || "",
        roepnummer: document.getElementById("roepnummer")?.value || "",
        locatie: document.getElementById("locatie")?.value || "",
        urgentie: document.getElementById("urgentie")?.value || "",
        letselType: document.getElementById("letselType")?.value || "",
        mobiliteit: document.getElementById("mobiliteit")?.value || "",
        stabiliteit: document.getElementById("stabiliteit")?.value || "",
        samenvatting: document.getElementById("samenvatting")?.value || "",
        reedsGedaan: document.getElementById("reedsGedaan")?.value || "",
        extraInfo: document.getElementById("extraInfo")?.value || ""
      }),
      buildSummary: () => output.value.trim() || buildSummary(),
      saveNextLabel: "Zet klaar voor tool"
    });
  }

  form.addEventListener("reset", () => {
    setTimeout(() => {
      output.value = "";
      statusBox.textContent = "Formulier werd gereset.";
    }, 0);
  });
});
