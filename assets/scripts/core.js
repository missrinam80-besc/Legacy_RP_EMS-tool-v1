/**
 * core.js
 * Algemene helperfuncties die in meerdere tools gebruikt kunnen worden.
 */

function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

function qsa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Kon JSON niet laden: ${path}`);
  }
  return response.json();
}

function formatDateTime(date = new Date()) {
  return new Intl.DateTimeFormat("nl-BE", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function sanitizeText(value) {
  return String(value ?? "").trim();
}
