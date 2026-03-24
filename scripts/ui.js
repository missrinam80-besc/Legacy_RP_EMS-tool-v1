/**
 * ui.js
 * Kleine UI helperfuncties voor statusmeldingen.
 */

function showStatus(targetSelector, message, type = "info") {
  const el = document.querySelector(targetSelector);
  if (!el) return;

  el.className = `status-box status-${type}`;
  el.textContent = message;
  el.classList.remove("hidden");
}

function clearStatus(targetSelector) {
  const el = document.querySelector(targetSelector);
  if (!el) return;

  el.textContent = "";
  el.className = "status-box hidden";
}
