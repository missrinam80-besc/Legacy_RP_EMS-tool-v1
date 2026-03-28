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



  if (window.DepartmentFlow) {
    DepartmentFlow.init({
      departmentKey: "chirurgie",
      label: "chirurgie",
      stage: "request",
      nextUrl: "../operatie-tool/index.html",
      steps: [
        { id: "request", title: "1. Aanvraag", shortTitle: "aanvraag", url: window.location.pathname },
        { id: "tool", title: "2. Tool", shortTitle: "tool", url: "../operatie-tool/index.html" },
        { id: "report", title: "3. Rapport", shortTitle: "rapport", url: "../rapport-operatie/index.html" }
      ],
      collectValues: () => ({
        patientName: document.getElementById("patientName")?.value || "",
        patientDob: document.getElementById("patientDob")?.value || "",
        aanvrager: document.getElementById("aanvrager")?.value || "",
        roepnummer: document.getElementById("roepnummer")?.value || "",
        locatie: document.getElementById("locatie")?.value || "",
        urgentie: document.getElementById("urgentie")?.value || "",
        stabiliteit: document.getElementById("stabiliteit")?.value || "",
        ingreepType: document.getElementById("ingreepType")?.value || "",
        diagnose: document.getElementById("diagnose")?.value || "",
        bewustzijn: document.getElementById("bewustzijn")?.value || "",
        pols: document.getElementById("pols")?.value || "",
        ademhaling: document.getElementById("ademhaling")?.value || "",
        bloedverlies: document.getElementById("bloedverlies")?.value || "",
        allergieen: document.getElementById("allergieen")?.value || "",
        nuchter: document.getElementById("nuchter")?.value || "",
        preopActies: document.getElementById("preopActies")?.value || "",
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
