/* =========================================================
   HOMERENT — REUSABLE MODAL SYSTEM
   File: js/core/modal.js

   PURPOSE:
   - One consistent modal design across HomeRent
   - Dynamic title and subtitle
   - Business logo and name
   - Reusable content and footer
   - Close button, backdrop click and Escape key
   ========================================================= */

import { getSettings } from "./settings.js";

let activeModal = null;
let previousBodyOverflow = "";

/**
 * Open a reusable HomeRent modal.
 *
 * @param {Object} options
 * @param {string} options.title       Modal title
 * @param {string} options.subtitle    Optional description
 * @param {string} options.content     Modal body HTML
 * @param {string} options.footer      Optional footer HTML
 * @param {string} options.size        "small", "medium", or "large"
 * @param {Function} options.onClose   Optional close callback
 */
export function openModal({
  title = "Details",
  subtitle = "",
  content = "",
  footer = "",
  size = "medium",
  onClose = null
} = {}) {
  // Close any currently open modal first.
  closeModal();

  const settings = getSettings?.() || {};

  // Reuse the logo already shown on the current page when possible.
  const existingLogo = document.querySelector("[data-default-logo]");
  const logoUrl =
    settings.logoUrl ||
    existingLogo?.getAttribute("src") ||
    "";

  const businessName = settings.businessName || "HomeRent";

  const root = document.createElement("div");
  root.id = "homeRentModalRoot";
  root.className = "hr-modal-backdrop";
  root.setAttribute("data-hr-backdrop", "");

  root.innerHTML = `
    <section
      class="hr-modal hr-modal-${escapeHTML(size)}"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hrModalTitle"
      aria-describedby="hrModalSubtitle"
      tabindex="-1"
    >
      <header class="hr-modal-topbar">
        <div class="hr-modal-brand">
          ${
            logoUrl
              ? `<img
                   class="hr-modal-logo"
                   src="${escapeHTML(logoUrl)}"
                   alt="${escapeHTML(businessName)} logo"
                 >`
              : `<div class="hr-modal-logo-fallback" aria-hidden="true">
                   <i class="fa-solid fa-building"></i>
                 </div>`
          }

          <div class="hr-modal-heading">
            <span class="hr-modal-brand-name">
              ${escapeHTML(businessName)}
            </span>

            <h2 id="hrModalTitle">${escapeHTML(title)}</h2>

            <p id="hrModalSubtitle"
               ${subtitle ? "" : "hidden"}>
              ${escapeHTML(subtitle)}
            </p>
          </div>
        </div>

        <button
          type="button"
          class="hr-modal-close"
          data-hr-close
          aria-label="Close modal"
          title="Close"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </header>

      <div class="hr-modal-content">
        ${content}
      </div>

      ${
        footer
          ? `<footer class="hr-modal-footer">${footer}</footer>`
          : ""
      }
    </section>
  `;

  previousBodyOverflow = document.body.style.overflow;
  document.body.appendChild(root);
  document.body.style.overflow = "hidden";

  activeModal = {
    root,
    onClose,
    previousFocus: document.activeElement
  };

  root.addEventListener("click", handleModalClick);
  root.addEventListener("keydown", handleModalKeydown);

  root.querySelector(".hr-modal")?.focus();

  return root;
}

/**
 * Close the currently open modal.
 */
export function closeModal() {
  if (!activeModal) return;

  const modal = activeModal;
  activeModal = null;

  modal.root.remove();
  document.body.style.overflow = previousBodyOverflow;

  if (typeof modal.onClose === "function") {
    modal.onClose();
  }

  if (modal.previousFocus instanceof HTMLElement) {
    modal.previousFocus.focus();
  }
}

function handleModalClick(event) {
  if (event.target.closest("[data-hr-close]")) {
    closeModal();
    return;
  }

  // Close only when the backdrop itself is clicked.
  if (event.target.matches("[data-hr-backdrop]")) {
    closeModal();
  }
}

function handleModalKeydown(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    closeModal();
  }
}

/**
 * Escape dynamic text before putting it into HTML.
 */
function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Keep the function name consistent with its uses above.
function escapeHtml(value) {
  return escapeHTML(value);
}