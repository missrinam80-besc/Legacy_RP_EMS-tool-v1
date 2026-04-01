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
      "=== PSYCHOLOGISCHE CRISISAANVRAAG ===",
      `Patiënt: ${valueOf("patientName")}`,
      `Geboortedatum: ${valueOf("patientDob")}`,
      `Aanvrager: ${valueOf("aanvrager")}`,
      `Locatie / context: ${valueOf("locatie")}`,
      `Urgentie: ${valueOf("urgentie")}`,
      `Type casus / hulpvraag: ${valueOf("casusType")}`,
      `Toestand / complexiteit: ${valueOf("mentaleToestand")}`,
      `Veiligheids- of risicofactor: ${valueOf("veiligheidsrisico")}`,
      "",
      "Situatieschets:",
      valueOf("situatie"),
      "",
      `Medewerking / belastbaarheid: ${valueOf("cooperatie")}`,
      `Betrokkenen / netwerk / hulpmiddel: ${valueOf("supportNetwerk")}`,
      `Reeds ondernomen acties of opvolging: ${valueOf("reedsGedaan")}`,
      `Voorgestelde vervolgflow: ${valueOf("doorverwijzing")}`,
      "",
      "Extra info:",
      valueOf("extraInfo")
    ].join("\n");
  }

  generateBtn.addEventListener("click", () => {
    output.value = buildSummary();
    statusBox.textContent = "Psychologische crisisaanvraag gegenereerd.";
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
      departmentKey: "psychologie",
      label: "psychologie",
      stage: "request",
      nextUrl: "../psychologie-tool/index.html",
      steps: [
        { id: "request", title: "1. Aanvraag", shortTitle: "aanvraag", url: window.location.pathname },
        { id: "tool", title: "2. Tool", shortTitle: "tool", url: "../psychologie-tool/index.html" },
        { id: "report", title: "3. Rapport", shortTitle: "rapport", url: "../rapport-psychologie/index.html" }
      ],
      collectValues: () => ({
        patientName: document.getElementById("patientName")?.value || "",
        patientDob: document.getElementById("patientDob")?.value || "",
        aanvrager: document.getElementById("aanvrager")?.value || "",
        locatie: document.getElementById("locatie")?.value || "",
        urgentie: document.getElementById("urgentie")?.value || "",
        casusType: document.getElementById("casusType")?.value || "",
        mentaleToestand: document.getElementById("mentaleToestand")?.value || "",
        veiligheidsrisico: document.getElementById("veiligheidsrisico")?.value || "",
        situatie: document.getElementById("situatie")?.value || "",
        cooperatie: document.getElementById("cooperatie")?.value || "",
        supportNetwerk: document.getElementById("supportNetwerk")?.value || "",
        reedsGedaan: document.getElementById("reedsGedaan")?.value || "",
        doorverwijzing: document.getElementById("doorverwijzing")?.value || "",
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
