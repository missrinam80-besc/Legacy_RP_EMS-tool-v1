/**
 * info-pages.js
 * -------------
 * Helpers voor kennispagina's met uitklapbare blokken.
 */

document.addEventListener("DOMContentLoaded", () => {
  const accordions = Array.from(document.querySelectorAll(".info-accordion"));
  const expandBtn = document.getElementById("expandAllBtn");
  const collapseBtn = document.getElementById("collapseAllBtn");

  if (!accordions.length) return;

  if (expandBtn) {
    expandBtn.addEventListener("click", () => {
      accordions.forEach((item) => {
        item.open = true;
      });
    });
  }

  if (collapseBtn) {
    collapseBtn.addEventListener("click", () => {
      accordions.forEach((item) => {
        item.open = false;
      });
    });
  }
});