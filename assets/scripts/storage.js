/**
 * storage.js
 * Optionele lokale opslag voor concepten of voorkeuren.
 */

function saveToLocal(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function loadFromLocal(key, fallback = null) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function removeFromLocal(key) {
  localStorage.removeItem(key);
}
