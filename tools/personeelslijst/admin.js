document.addEventListener("DOMContentLoaded", init);

function init() {
  qs("#adminForm").addEventListener("submit", handleSubmit);
  qs("#resetBtn").addEventListener("click", resetForm);
  qs("#copyBtn").addEventListener("click", copyOutput);
}

function handleSubmit(event) {
  event.preventDefault();

  const data = {
    name: sanitizeText(qs("#name").value),
    callSign: sanitizeText(qs("#callSign").value),
    role: sanitizeText(qs("#role").value),
    visible: sanitizeText(qs("#visible").value)
  };

  qs("#output").value = JSON.stringify(data, null, 2);
  showStatus("#statusBox", "Rij voorbereid.", "success");
}

function resetForm() {
  qs("#adminForm").reset();
  qs("#output").value = "";
  clearStatus("#statusBox");
}

async function copyOutput() {
  const text = qs("#output").value.trim();
  if (!text) return showStatus("#statusBox", "Geen data om te kopiëren.", "warning");
  await copyTextToClipboard(text);
  showStatus("#statusBox", "Data gekopieerd.", "success");
}
