/**
 * export.js
 * Functies voor kopiëren en downloaden van output.
 */

async function copyTextToClipboard(text) {
  await navigator.clipboard.writeText(text);
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}
