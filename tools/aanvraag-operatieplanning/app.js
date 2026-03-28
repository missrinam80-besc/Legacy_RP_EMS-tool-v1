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
        afdelingBron: document.getElementById("afdelingBron")?.value || "",
        planning: document.getElementById("planning")?.value || "",
        ingreepType: document.getElementById("ingreepType")?.value || "",
        opname: document.getElementById("opname")?.value || "",
        diagnose: document.getElementById("diagnose")?.value || "",
        beperkingen: document.getElementById("beperkingen")?.value || "",
        preopNodig: document.getElementById("preopNodig")?.value || "",
        risico: document.getElementById("risico")?.value || "",
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
