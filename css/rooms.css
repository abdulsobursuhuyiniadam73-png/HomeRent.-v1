/* ============================================================
   HOMERENT — ROOMS MODULE
   ------------------------------------------------------------
   UI DIRECTION:
   - Mobile-first visual language
   - Dark charcoal background
   - HomeRent blue primary
   - Clean rounded surfaces
   - Simple cards
   - Spacious layout
   - Desktop expands the same visual system
   ============================================================ */


/* ============================================================
   1. DESIGN TOKENS
   ============================================================ */

:root {
    --primary: #087fdf;
    --primary-dark: #0567b7;
    --primary-light: #e8f4ff;

    --accent: #d9a441;

    --bg: #f5f7fa;
    --surface: #ffffff;
    --surface-soft: #f8fafc;
    --surface-muted: #eef2f6;

    --text: #17202a;
    --text-secondary: #647180;
    --text-muted: #8a95a3;

    --border: #e4e9ef;
    --border-strong: #d6dde6;

    --success: #12a150;
    --success-bg: #e9f9ef;

    --warning: #c98500;
    --warning-bg: #fff6df;

    --danger: #d92d3f;
    --danger-bg: #fff0f2;

    --info: #1677c8;
    --info-bg: #eaf5ff;

    --maintenance: #7b61c9;
    --maintenance-bg: #f1edff;

    --sidebar-width: 250px;

    --radius-xs: 8px;
    --radius-sm: 10px;
    --radius-md: 14px;
    --radius-lg: 18px;
    --radius-xl: 24px;

    --shadow-sm:
        0 2px 8px rgba(16, 24, 40, 0.05);

    --shadow-md:
        0 8px 24px rgba(16, 24, 40, 0.08);

    --shadow-lg:
        0 18px 50px rgba(16, 24, 40, 0.14);

    --transition:
        160ms ease;

    --mobile-bg: #191a18;
    --mobile-surface: #1c1d1b;
    --mobile-border: #30312f;
    --mobile-text: #f3f3f2;
    --mobile-muted: #a6a7a4;

    --mobile-blue: #087fdf;
}


/* ============================================================
   2. RESET
   ============================================================ */

*,
*::before,
*::after {
    box-sizing: border-box;
}

html {
    min-height: 100%;
    scroll-behavior: smooth;
}

body {
    margin: 0;
    min-height: 100vh;

    background: var(--bg);
    color: var(--text);

    font-family:
        Inter,
        ui-sans-serif,
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;

    font-size: 15px;
    line-height: 1.5;

    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
}

button,
input,
select,
textarea {
    font: inherit;
}

button,
a {
    -webkit-tap-highlight-color: transparent;
}

button {
    cursor: pointer;
}

a {
    color: inherit;
    text-decoration: none;
}

svg {
    display: block;
    width: 20px;
    height: 20px;

    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
}

img {
    max-width: 100%;
    display: block;
}


/* ============================================================
   3. APP SHELL
   ============================================================ */

.app-shell {
    min-height: 100vh;
    display: flex;
}


/* ============================================================
   4. DESKTOP SIDEBAR
   ============================================================ */

.sidebar {
    position: fixed;
    inset: 0 auto 0 0;

    width: var(--sidebar-width);

    display: flex;
    flex-direction: column;

    background: #ffffff;
    border-right: 1px solid var(--border);

    z-index: 100;
}


/* Brand */

.sidebar-brand {
    padding: 24px 20px 22px;
}

.brand-link {
    display: flex;
    align-items: center;
    gap: 11px;
}

.brand-logo {
    width: 42px;
    height: 42px;

    display: grid;
    place-items: center;

    flex: 0 0 auto;

    background: var(--primary);
    color: #ffffff;

    border-radius: 12px;

    font-weight: 800;
    font-size: 18px;

    overflow: hidden;
}

.brand-logo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.brand-text {
    min-width: 0;

    display: flex;
    flex-direction: column;
}

.brand-text strong {
    color: var(--text);
    font-size: 16px;
    font-weight: 750;

    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.brand-text span {
    margin-top: 1px;

    color: var(--text-muted);
    font-size: 11px;

    white-space: nowrap;
}


/* Navigation */

.sidebar-navigation {
    flex: 1;

    padding: 4px 13px;

    overflow-y: auto;
}

.navigation-section {
    margin-bottom: 26px;
}

.navigation-label {
    display: block;

    margin: 0 10px 9px;

    color: #9aa3ad;

    font-size: 10px;
    font-weight: 750;
    letter-spacing: 0.11em;
}

.sidebar-link {
    position: relative;

    min-height: 44px;

    display: flex;
    align-items: center;

    gap: 12px;

    padding: 10px 12px;
    margin: 3px 0;

    border-radius: 10px;

    color: #65717e;

    font-size: 13px;
    font-weight: 600;

    transition:
        background var(--transition),
        color var(--transition);
}

.sidebar-link:hover {
    background: #f3f7fb;
    color: var(--primary);
}

.sidebar-link.active {
    background: var(--primary-light);
    color: var(--primary);
}

.sidebar-icon {
    width: 21px;
    height: 21px;

    display: grid;
    place-items: center;

    flex: 0 0 auto;
}

.sidebar-icon svg {
    width: 19px;
    height: 19px;
}

.sidebar-link-badge {
    margin-left: auto;

    min-width: 25px;
    height: 22px;

    display: inline-flex;
    align-items: center;
    justify-content: center;

    padding: 0 7px;

    border-radius: 20px;

    background: rgba(8, 127, 223, 0.10);
    color: var(--primary);

    font-size: 10px;
    font-weight: 750;
}


/* Sidebar footer */

.sidebar-footer {
    padding: 15px 18px 18px;

    border-top: 1px solid var(--border);
}

.sidebar-footer-business {
    color: var(--text-muted);

    font-size: 10px;
    line-height: 1.45;
}

.sidebar-version {
    display: block;

    margin-top: 5px;

    color: #aab2bb;
    font-size: 10px;
}


/* ============================================================
   5. MAIN CONTENT
   ============================================================ */

.main-content {
    width: calc(100% - var(--sidebar-width));
    min-height: 100vh;

    margin-left: var(--sidebar-width);

    background: var(--bg);
}


/* ============================================================
   6. TOP BAR
   ============================================================ */

.topbar {
    min-height: 82px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 20px;

    padding: 15px 32px;

    background: rgba(255, 255, 255, 0.96);
    border-bottom: 1px solid var(--border);

    position: sticky;
    top: 0;
    z-index: 50;

    backdrop-filter: blur(10px);
}

.topbar-left {
    display: flex;
    align-items: center;
    gap: 14px;
}

.page-heading {
    display: flex;
    flex-direction: column;
}

.page-eyebrow,
.section-eyebrow,
.modal-eyebrow {
    color: var(--primary);

    font-size: 9px;
    font-weight: 800;

    letter-spacing: 0.12em;
    text-transform: uppercase;
}

.page-heading h1 {
    margin: 1px 0 0;

    color: var(--text);

    font-size: 22px;
    line-height: 1.2;
    font-weight: 750;
}

.page-heading p {
    margin: 3px 0 0;

    color: var(--text-muted);

    font-size: 12px;
}

.topbar-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}


/* Top icon */

.icon-button {
    width: 40px;
    height: 40px;

    display: grid;
    place-items: center;

    padding: 0;

    border: 1px solid var(--border);
    border-radius: 11px;

    background: #ffffff;
    color: #647180;

    transition:
        background var(--transition),
        border-color var(--transition),
        color var(--transition);
}

.icon-button:hover {
    color: var(--primary);
    border-color: #c8e2f8;
    background: #f5fbff;
}

.notification-button {
    position: relative;
}

.notification-dot {
    position: absolute;

    top: 7px;
    right: 7px;

    width: 6px;
    height: 6px;

    border-radius: 50%;

    background: var(--danger);
}


/* Profile */

.profile-button {
    display: flex;
    align-items: center;

    gap: 9px;

    padding: 4px 8px 4px 4px;

    border: 0;
    border-radius: 12px;

    background: transparent;
    color: var(--text);

    transition: background var(--transition);
}

.profile-button:hover {
    background: #f3f6f9;
}

.profile-avatar,
.profile-menu-avatar,
.mobile-profile-avatar {
    display: grid;
    place-items: center;

    border-radius: 50%;

    background: #073b70;
    color: #ffffff;

    font-weight: 750;
}

.profile-avatar {
    width: 38px;
    height: 38px;

    font-size: 12px;
}

.profile-information {
    display: flex;
    flex-direction: column;

    text-align: left;
}

.profile-information strong {
    font-size: 12px;
    font-weight: 700;
}

.profile-information small {
    color: var(--text-muted);
    font-size: 10px;
}

.profile-chevron {
    width: 14px;
    height: 14px;

    color: #9aa3ad;
}


/* Sidebar toggle */

.mobile-sidebar-toggle {
    display: none;

    width: 40px;
    height: 40px;

    place-items: center;

    border: 1px solid var(--border);
    border-radius: 10px;

    background: #ffffff;
    color: var(--text);
}


/* ============================================================
   7. MOBILE HEADER
   ============================================================ */

.mobile-header {
    display: none;
}


/* ============================================================
   8. PAGE CONTENT
   ============================================================ */

.page-content {
    width: 100%;
    max-width: 1480px;

    margin: 0 auto;

    padding: 28px 32px 48px;
}


/* ============================================================
   9. SUMMARY CARDS
   ============================================================ */

.room-summary {
    display: grid;

    grid-template-columns:
        repeat(4, minmax(0, 1fr));

    gap: 15px;

    margin-bottom: 22px;
}

.summary-card {
    min-width: 0;

    display: flex;
    align-items: center;

    gap: 13px;

    padding: 16px;

    background: var(--surface);
    border: 1px solid var(--border);

    border-radius: var(--radius-md);

    box-shadow: var(--shadow-sm);
}

.summary-icon {
    width: 40px;
    height: 40px;

    display: grid;
    place-items: center;

    flex: 0 0 auto;

    border-radius: 11px;
}

.summary-icon svg {
    width: 19px;
    height: 19px;
}

.summary-icon-total {
    background: #edf5fd;
    color: var(--primary);
}

.summary-icon-available {
    background: var(--success-bg);
    color: var(--success);
}

.summary-icon-occupied {
    background: var(--warning-bg);
    color: var(--warning);
}

.summary-icon-maintenance {
    background: var(--maintenance-bg);
    color: var(--maintenance);
}

.summary-information {
    min-width: 0;

    display: flex;
    flex-direction: column;
}

.summary-information span {
    color: var(--text-muted);

    font-size: 11px;
}

.summary-information strong {
    margin-top: 2px;

    color: var(--text);

    font-size: 21px;
    line-height: 1.1;
}


/* ============================================================
   10. ROOM TOOLBAR
   ============================================================ */

.rooms-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 16px;

    margin-bottom: 27px;
}

.toolbar-search {
    position: relative;

    width: min(550px, 100%);
}

.toolbar-search > svg {
    position: absolute;

    left: 15px;
    top: 50%;

    width: 18px;
    height: 18px;

    transform: translateY(-50%);

    color: #8c97a4;

    pointer-events: none;
}

.toolbar-search input {
    width: 100%;
    height: 45px;

    padding: 0 42px 0 43px;

    border: 1px solid var(--border);
    border-radius: 12px;

    outline: none;

    background: #ffffff;
    color: var(--text);

    font-size: 13px;

    transition:
        border-color var(--transition),
        box-shadow var(--transition);
}

.toolbar-search input::placeholder {
    color: #a2abb5;
}

.toolbar-search input:focus {
    border-color: #93c8ed;

    box-shadow:
        0 0 0 3px rgba(8, 127, 223, 0.08);
}

.toolbar-clear,
.search-clear-button {
    position: absolute;

    top: 50%;
    right: 10px;

    width: 26px;
    height: 26px;

    transform: translateY(-50%);

    display: grid;
    place-items: center;

    padding: 0;

    border: 0;
    border-radius: 50%;

    background: #eef1f4;
    color: #697582;

    font-size: 18px;
    line-height: 1;
}


/* Buttons */

.primary-button,
.secondary-button,
.danger-button {
    min-height: 42px;

    display: inline-flex;
    align-items: center;
    justify-content: center;

    gap: 8px;

    padding: 0 16px;

    border-radius: 10px;

    font-size: 12px;
    font-weight: 700;

    transition:
        background var(--transition),
        border-color var(--transition),
        transform var(--transition),
        box-shadow var(--transition);
}

.primary-button {
    border: 1px solid var(--primary);
    background: var(--primary);
    color: #ffffff;

    box-shadow:
        0 4px 10px rgba(8, 127, 223, 0.16);
}

.primary-button:hover {
    background: var(--primary-dark);
    border-color: var(--primary-dark);
}

.primary-button:active,
.secondary-button:active,
.danger-button:active {
    transform: translateY(1px);
}

.primary-button svg {
    width: 17px;
    height: 17px;
}

.secondary-button {
    border: 1px solid var(--border-strong);
    background: #ffffff;
    color: #596675;
}

.secondary-button:hover {
    border-color: #c5ced8;
    background: #f7f9fb;
}

.danger-button {
    border: 1px solid #f1b9c0;
    background: #fff4f5;
    color: var(--danger);
}

.danger-button:hover {
    background: #ffe9ec;
}


/* ============================================================
   11. FILTER AREA
   ============================================================ */

.room-filters-section {
    margin-bottom: 18px;
}

.filter-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;

    gap: 20px;

    margin-bottom: 12px;
}

.filter-header h2 {
    margin: 3px 0 0;

    color: var(--text);

    font-size: 17px;
    font-weight: 750;
}

.results-label {
    color: var(--text-muted);
    font-size: 11px;
}

.room-filters {
    display: flex;
    align-items: center;

    gap: 7px;

    overflow-x: auto;

    padding-bottom: 2px;

    scrollbar-width: none;
}

.room-filters::-webkit-scrollbar {
    display: none;
}

.filter-chip {
    min-height: 34px;

    display: inline-flex;
    align-items: center;

    gap: 7px;

    flex: 0 0 auto;

    padding: 0 12px;

    border: 1px solid var(--border);
    border-radius: 20px;

    background: #ffffff;
    color: #687482;

    font-size: 11px;
    font-weight: 650;

    transition:
        background var(--transition),
        border-color var(--transition),
        color var(--transition);
}

.filter-chip strong {
    color: #9aa4ae;

    font-size: 10px;
}

.filter-chip:hover {
    border-color: #bcd9ed;
    color: var(--primary);
}

.filter-chip.active {
    border-color: var(--primary);
    background: var(--primary);
    color: #ffffff;
}

.filter-chip.active strong {
    color: rgba(255, 255, 255, 0.8);
}


/* ============================================================
   12. LOADING
   ============================================================ */

.rooms-loading {
    min-height: 280px;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    gap: 12px;
}

.loading-spinner,
.button-spinner {
    border-radius: 50%;

    border: 3px solid rgba(8, 127, 223, 0.15);
    border-top-color: var(--primary);

    animation: spin 0.75s linear infinite;
}

.loading-spinner {
    width: 32px;
    height: 32px;
}

.rooms-loading p {
    margin: 0;

    color: var(--text-muted);
    font-size: 12px;
}

.button-spinner {
    width: 14px;
    height: 14px;

    border-width: 2px;

    border-top-color: #ffffff;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}


/* ============================================================
   13. EMPTY STATE
   ============================================================ */

.rooms-empty {
    min-height: 310px;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    padding: 30px;

    text-align: center;

    background: #ffffff;
    border: 1px dashed #d8dfe7;
    border-radius: var(--radius-lg);
}

.empty-icon {
    width: 56px;
    height: 56px;

    display: grid;
    place-items: center;

    margin-bottom: 13px;

    border-radius: 16px;

    background: var(--primary-light);
    color: var(--primary);
}

.empty-icon svg {
    width: 25px;
    height: 25px;
}

.rooms-empty h3 {
    margin: 0;

    color: var(--text);

    font-size: 16px;
}

.rooms-empty p {
    max-width: 380px;

    margin: 6px 0 18px;

    color: var(--text-muted);

    font-size: 12px;
}


/* ============================================================
   14. ROOM GRID
   ============================================================ */

.rooms-grid {
    display: grid;

    grid-template-columns:
        repeat(3, minmax(0, 1fr));

    gap: 15px;
}


/* ============================================================
   15. ROOM CARDS
   ============================================================ */

/*
   These classes are generated by rooms.js.

   The controller should create:

   .room-card
   .room-card-header
   .room-card-number
   .room-card-type
   .room-status
   .room-card-price
   .room-card-meta
   .room-progress
   .room-progress-bar
   .room-card-footer
*/

.room-card {
    position: relative;

    min-width: 0;

    padding: 17px;

    background: #ffffff;
    border: 1px solid var(--border);

    border-radius: var(--radius-md);

    box-shadow: var(--shadow-sm);

    cursor: pointer;

    transition:
        transform var(--transition),
        border-color var(--transition),
        box-shadow var(--transition);
}

.room-card:hover {
    border-color: #cbd9e5;

    box-shadow: var(--shadow-md);

    transform: translateY(-2px);
}

.room-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;

    gap: 12px;
}

.room-card-number {
    min-width: 0;
}

.room-card-number strong {
    display: block;

    color: var(--text);

    font-size: 16px;
    font-weight: 750;

    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.room-card-type {
    display: block;

    margin-top: 2px;

    color: var(--text-secondary);

    font-size: 11px;
}

.room-status {
    display: inline-flex;
    align-items: center;
    justify-content: center;

    min-height: 27px;

    flex: 0 0 auto;

    padding: 0 9px;

    border-radius: 20px;

    font-size: 10px;
    font-weight: 750;

    white-space: nowrap;
}

.room-status.available {
    background: var(--success-bg);
    color: var(--success);
}

.room-status.occupied {
    background: var(--warning-bg);
    color: var(--warning);
}

.room-status.reserved {
    background: var(--info-bg);
    color: var(--info);
}

.room-status.maintenance {
    background: var(--maintenance-bg);
    color: var(--maintenance);
}

.room-status.archived {
    background: #f0f1f2;
    color: #777f87;
}


/* Price */

.room-card-price {
    margin-top: 16px;

    display: flex;
    align-items: baseline;

    gap: 4px;
}

.room-card-price strong {
    color: var(--text);

    font-size: 18px;
    font-weight: 750;
}

.room-card-price span {
    color: var(--text-muted);

    font-size: 10px;
}


/* Metadata */

.room-card-meta {
    display: flex;
    flex-wrap: wrap;

    gap: 6px;

    margin-top: 10px;
}

.room-meta-item {
    display: inline-flex;
    align-items: center;

    gap: 5px;

    color: var(--text-muted);

    font-size: 10px;
}

.room-meta-item svg {
    width: 13px;
    height: 13px;
}


/* Progress */

.room-progress {
    margin-top: 14px;
}

.room-progress-header {
    display: flex;
    justify-content: space-between;

    gap: 10px;

    margin-bottom: 5px;

    color: var(--text-muted);

    font-size: 9px;
}

.room-progress-track {
    width: 100%;
    height: 6px;

    overflow: hidden;

    border-radius: 20px;

    background: #edf0f2;
}

.room-progress-bar {
    height: 100%;

    border-radius: inherit;

    background: var(--success);

    transition: width 300ms ease;
}

.room-progress-bar.warning {
    background: var(--warning);
}

.room-progress-bar.danger {
    background: var(--danger);
}


/* Card footer */

.room-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 10px;

    margin-top: 15px;
    padding-top: 12px;

    border-top: 1px solid #eef1f4;

    color: var(--text-muted);

    font-size: 10px;
}

.room-card-action {
    display: inline-flex;
    align-items: center;

    gap: 4px;

    color: var(--primary);

    font-weight: 700;
}

.room-card-action svg {
    width: 13px;
    height: 13px;
}


/* ============================================================
   16. MOBILE BOTTOM NAVIGATION
   ============================================================ */

.mobile-bottom-navigation {
    display: none;
}


/* ============================================================
   17. MODALS
   ============================================================ */

.modal-backdrop {
    position: fixed;
    inset: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    padding: 20px;

    background: rgba(15, 23, 32, 0.54);

    z-index: 500;

    overflow-y: auto;

    backdrop-filter: blur(3px);
}

.modal-backdrop[hidden] {
    display: none;
}

.modal {
    width: min(680px, 100%);

    max-height: calc(100vh - 40px);

    display: flex;
    flex-direction: column;

    background: #ffffff;

    border: 1px solid rgba(255, 255, 255, 0.8);

    border-radius: var(--radius-lg);

    box-shadow: var(--shadow-lg);

    overflow: hidden;
}

.room-modal {
    width: min(700px, 100%);
}

.room-details-modal {
    width: min(760px, 100%);
}

.history-modal {
    width: min(650px, 100%);
}

.room-check-modal {
    width: min(700px, 100%);
}

.confirmation-modal {
    width: min(450px, 100%);

    padding-top: 25px;
}


/* Modal header */

.modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;

    gap: 20px;

    padding: 22px 24px 18px;

    border-bottom: 1px solid var(--border);
}

.modal-header h2 {
    margin: 3px 0 0;

    color: var(--text);

    font-size: 19px;
    line-height: 1.25;
}

.modal-header p {
    margin: 5px 0 0;

    color: var(--text-muted);

    font-size: 11px;
}

.modal-close-button {
    width: 34px;
    height: 34px;

    display: grid;
    place-items: center;

    flex: 0 0 auto;

    border: 0;
    border-radius: 9px;

    background: #f2f4f6;
    color: #6d7884;

    font-size: 21px;
    line-height: 1;

    transition:
        background var(--transition),
        color var(--transition);
}

.modal-close-button:hover {
    background: #e8edf1;
    color: var(--text);
}


/* Forms */

.modal form {
    min-height: 0;

    display: flex;
    flex-direction: column;
}

.form-section {
    padding: 20px 24px;

    border-bottom: 1px solid #eef1f4;
}

.form-section-heading {
    margin-bottom: 15px;
}

.form-section-heading h3 {
    margin: 0;

    color: var(--text);

    font-size: 13px;
    font-weight: 750;
}

.form-section-heading p {
    margin: 3px 0 0;

    color: var(--text-muted);

    font-size: 10px;
}

.form-grid {
    display: grid;

    gap: 15px;
}

.form-grid.two-columns {
    grid-template-columns:
        repeat(2, minmax(0, 1fr));
}

.form-field {
    min-width: 0;

    display: flex;
    flex-direction: column;

    gap: 6px;
}

.form-field label {
    color: #465362;

    font-size: 11px;
    font-weight: 700;
}

.required {
    color: var(--danger);
}

.form-field input,
.form-field select,
.form-field textarea {
    width: 100%;

    border: 1px solid var(--border-strong);
    border-radius: 9px;

    outline: none;

    background: #ffffff;
    color: var(--text);

    font-size: 12px;

    transition:
        border-color var(--transition),
        box-shadow var(--transition);
}

.form-field input,
.form-field select {
    height: 42px;

    padding: 0 12px;
}

.form-field textarea {
    min-height: 85px;

    padding: 11px 12px;

    resize: vertical;
}

.form-field input::placeholder,
.form-field textarea::placeholder {
    color: #a3adb7;
}

.form-field input:focus,
.form-field select:focus,
.form-field textarea:focus {
    border-color: #91c7eb;

    box-shadow:
        0 0 0 3px rgba(8, 127, 223, 0.07);
}

.form-field.has-error input,
.form-field.has-error select,
.form-field.has-error textarea {
    border-color: #e26b78;
}

.field-error {
    min-height: 0;

    color: var(--danger);

    font-size: 10px;
}

.field-help {
    color: var(--text-muted);
    font-size: 9px;
}


/* Currency input */

.input-with-prefix {
    position: relative;
}

.input-prefix {
    position: absolute;

    left: 12px;
    top: 50%;

    transform: translateY(-50%);

    color: var(--text-secondary);

    font-size: 12px;
    font-weight: 700;

    pointer-events: none;
}

.input-with-prefix input {
    padding-left: 30px;
}


/* Form message */

.form-message {
    margin: 15px 24px 0;

    padding: 10px 12px;

    border: 1px solid #f1c1c7;
    border-radius: 9px;

    background: var(--danger-bg);
    color: var(--danger);

    font-size: 11px;
}


/* Modal footer */

.modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;

    gap: 9px;

    padding: 16px 24px;

    background: #fafbfc;

    border-top: 1px solid var(--border);

    margin-top: auto;
}


/* ============================================================
   18. ROOM DETAILS
   ============================================================ */

.room-details-content {
    padding: 22px 24px;

    overflow-y: auto;
}

.details-grid {
    display: grid;

    grid-template-columns:
        repeat(2, minmax(0, 1fr));

    gap: 10px;
}

.details-item {
    padding: 13px;

    border: 1px solid var(--border);

    border-radius: 11px;

    background: #fbfcfd;
}

.details-item.full-width {
    grid-column: 1 / -1;
}

.details-item-label {
    display: block;

    color: var(--text-muted);

    font-size: 9px;
    font-weight: 650;

    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.details-item-value {
    display: block;

    margin-top: 3px;

    color: var(--text);

    font-size: 12px;
    font-weight: 700;

    word-break: break-word;
}


/* ============================================================
   19. HISTORY
   ============================================================ */

.history-content {
    min-height: 180px;

    padding: 20px 24px;

    overflow-y: auto;
}

.history-list {
    position: relative;

    display: flex;
    flex-direction: column;

    gap: 0;
}

.history-item {
    position: relative;

    display: grid;

    grid-template-columns: 24px 1fr;

    gap: 11px;

    padding-bottom: 20px;
}

.history-item:not(:last-child)::after {
    content: "";

    position: absolute;

    left: 11px;
    top: 24px;
    bottom: 0;

    width: 1px;

    background: #e3e8ed;
}

.history-dot {
    position: relative;
    z-index: 1;

    width: 22px;
    height: 22px;

    display: grid;
    place-items: center;

    border-radius: 50%;

    background: var(--primary-light);
    color: var(--primary);
}

.history-dot svg {
    width: 11px;
    height: 11px;
}

.history-item-content {
    padding-top: 1px;
}

.history-item-title {
    color: var(--text);

    font-size: 11px;
    font-weight: 750;
}

.history-item-meta {
    margin-top: 2px;

    color: var(--text-muted);

    font-size: 9px;
}

.history-item-note {
    margin-top: 6px;

    color: var(--text-secondary);

    font-size: 10px;
}


/* ============================================================
   20. CONFIRMATION
   ============================================================ */

.confirmation-modal .confirmation-icon {
    width: 54px;
    height: 54px;

    display: grid;
    place-items: center;

    margin: 0 auto 14px;

    border-radius: 15px;
}

.confirmation-icon.danger {
    background: var(--danger-bg);
    color: var(--danger);
}

.confirmation-icon svg {
    width: 25px;
    height: 25px;
}

.confirmation-content {
    padding: 0 25px;

    text-align: center;
}

.confirmation-content h2 {
    margin: 4px 0 0;

    color: var(--text);

    font-size: 18px;
}

.confirmation-content p {
    margin: 7px auto 0;

    max-width: 350px;

    color: var(--text-muted);

    font-size: 11px;
    line-height: 1.6;
}

.confirmation-modal .form-message {
    margin-left: 24px;
    margin-right: 24px;
}


/* ============================================================
   21. PROFILE MENU
   ============================================================ */

.profile-menu {
    position: fixed;

    top: 70px;
    right: 30px;

    width: 235px;

    padding: 8px;

    background: #ffffff;

    border: 1px solid var(--border);
    border-radius: 13px;

    box-shadow: var(--shadow-lg);

    z-index: 400;
}

.profile-menu[hidden] {
    display: none;
}

.profile-menu-header {
    display: flex;
    align-items: center;

    gap: 10px;

    padding: 9px;
}

.profile-menu-avatar {
    width: 36px;
    height: 36px;

    flex: 0 0 auto;

    font-size: 10px;
}

.profile-menu-header > div {
    min-width: 0;

    display: flex;
    flex-direction: column;
}

.profile-menu-header strong {
    color: var(--text);

    font-size: 11px;
}

.profile-menu-header span {
    margin-top: 2px;

    color: var(--text-muted);

    font-size: 9px;

    overflow: hidden;
    text-overflow: ellipsis;
}

.profile-menu-divider {
    height: 1px;

    margin: 5px 0;

    background: var(--border);
}

.profile-menu-item {
    width: 100%;
    min-height: 39px;

    display: flex;
    align-items: center;

    gap: 10px;

    padding: 0 10px;

    border: 0;
    border-radius: 8px;

    background: transparent;

    color: #65717e;

    font-size: 11px;
    font-weight: 650;

    text-align: left;
}

.profile-menu-item:hover {
    background: #f4f7f9;
    color: var(--primary);
}

.profile-menu-item svg {
    width: 16px;
    height: 16px;
}

.logout-item:hover {
    color: var(--danger);
    background: var(--danger-bg);
}


/* ============================================================
   22. SIDEBAR OVERLAY
   ============================================================ */

.sidebar-overlay {
    display: none;
}


/* ============================================================
   23. TOAST
   ============================================================ */

.toast {
    position: fixed;

    right: 25px;
    bottom: 25px;

    width: min(370px, calc(100vw - 30px));

    display: flex;
    align-items: flex-start;

    gap: 10px;

    padding: 13px 13px;

    background: #ffffff;

    border: 1px solid var(--border);
    border-radius: 12px;

    box-shadow: var(--shadow-lg);

    z-index: 900;

    opacity: 0;
    visibility: hidden;

    transform: translateY(12px);

    transition:
        opacity 180ms ease,
        visibility 180ms ease,
        transform 180ms ease;
}

.toast.show {
    opacity: 1;
    visibility: visible;

    transform: translateY(0);
}

.toast-icon {
    width: 30px;
    height: 30px;

    display: grid;
    place-items: center;

    flex: 0 0 auto;

    border-radius: 9px;

    background: var(--primary-light);
    color: var(--primary);
}

.toast-content {
    min-width: 0;

    flex: 1;

    display: flex;
    flex-direction: column;
}

.toast-content strong {
    color: var(--text);

    font-size: 11px;
}

.toast-content span {
    margin-top: 2px;

    color: var(--text-secondary);

    font-size: 10px;
    line-height: 1.4;
}

.toast-close {
    width: 24px;
    height: 24px;

    display: grid;
    place-items: center;

    padding: 0;

    border: 0;
    border-radius: 6px;

    background: transparent;
    color: #89939e;

    font-size: 17px;
}

.toast-close:hover {
    background: #f1f3f5;
}


/* ============================================================
   24. FOCUS ACCESSIBILITY
   ============================================================ */

button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
    outline: 3px solid rgba(8, 127, 223, 0.20);
    outline-offset: 2px;
}


/* ============================================================
   25. TABLET
   ============================================================ */

@media (max-width: 1180px) {

    :root {
        --sidebar-width: 225px;
    }

    .page-content {
        padding-left: 24px;
        padding-right: 24px;
    }

    .topbar {
        padding-left: 24px;
        padding-right: 24px;
    }

    .rooms-grid {
        grid-template-columns:
            repeat(2, minmax(0, 1fr));
    }

    .summary-card {
        padding: 14px;
    }

    .summary-information strong {
        font-size: 19px;
    }
}


/* ============================================================
   26. SMALL DESKTOP / TABLET
   ============================================================ */

@media (max-width: 900px) {

    .sidebar {
        transform: translateX(-100%);

        transition:
            transform 220ms ease;

        box-shadow: var(--shadow-lg);
    }

    .sidebar.mobile-open {
        transform: translateX(0);
    }

    .main-content {
        width: 100%;
        margin-left: 0;
    }

    .mobile-sidebar-toggle {
        display: grid;
    }

    .sidebar-overlay {
        position: fixed;
        inset: 0;

        display: block;

        background: rgba(10, 18, 28, 0.35);

        z-index: 90;
    }

    .sidebar-overlay[hidden] {
        display: none;
    }

    .room-summary {
        grid-template-columns:
            repeat(2, minmax(0, 1fr));
    }
}


/* ============================================================
   27. MOBILE — VISUAL REFERENCE MODE
   ------------------------------------------------------------
   This is intentionally close to the supplied mobile mockup.
   ============================================================ */

@media (max-width: 700px) {

    :root {
        --mobile-header-height: 280px;
        --mobile-bottom-height: 76px;
    }

    html {
        background: var(--mobile-bg);
    }

    body {
        min-height: 100vh;

        background: var(--mobile-bg);

        color: var(--mobile-text);
    }

    .app-shell {
        display: block;

        min-height: 100vh;

        background: var(--mobile-bg);
    }

    .sidebar,
    .topbar {
        display: none;
    }

    .main-content {
        width: 100%;
        min-height: 100vh;

        margin: 0;

        padding-bottom: calc(
            var(--mobile-bottom-height) + 15px
        );

        background: var(--mobile-bg);
    }


    /* --------------------------------------------------------
       Mobile Header
       -------------------------------------------------------- */

    .mobile-header {
        position: relative;

        display: block;

        min-height: 280px;

        padding: 29px 20px 34px;

        background: var(--mobile-blue);

        border-radius:
            0 0 0 0;
    }

    .mobile-header-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;

        gap: 15px;

        margin-bottom: 25px;
    }

    .mobile-page-title {
        min-width: 0;
    }

    .mobile-page-title h1 {
        margin: 0;

        color: #ffffff;

        font-size: 31px;
        line-height: 1.1;
        font-weight: 750;
        letter-spacing: -0.03em;
    }

    .mobile-room-count {
        display: block;

        margin-top: 6px;

        color: rgba(255, 255, 255, 0.76);

        font-size: 11px;
    }

    .mobile-header-actions {
        display: flex;
        align-items: center;

        gap: 10px;
    }

    .mobile-header-icon {
        width: 37px;
        height: 37px;

        display: grid;
        place-items: center;

        padding: 0;

        border: 0;
        background: transparent;

        color: #ffffff;
    }

    .mobile-header-icon svg {
        width: 27px;
        height: 27px;

        stroke-width: 1.8;
    }

    .mobile-profile-avatar {
        width: 44px;
        height: 44px;

        background: #06386c;

        color: #9bd0ff;

        font-size: 14px;
    }


    /* Search */

    .mobile-search {
        position: relative;

        width: 100%;
    }

    .mobile-search > svg {
        position: absolute;

        left: 18px;
        top: 50%;

        width: 23px;
        height: 23px;

        transform: translateY(-50%);

        color: #8f908e;

        pointer-events: none;
    }

    .mobile-search input {
        width: 100%;
        height: 66px;

        padding:
            0 48px
            0 55px;

        border: 0;
        border-radius: 15px;

        outline: none;

        background: #191a18;
        color: #ffffff;

        font-size: 19px;

        box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.05);
    }

    .mobile-search input::placeholder {
        color: #858684;
    }

    .mobile-search input:focus {
        box-shadow:
            0 0 0 3px rgba(255, 255, 255, 0.18);
    }

    .mobile-search .search-clear-button {
        right: 13px;

        width: 29px;
        height: 29px;

        background: #30312f;
        color: #bbbbba;

        font-size: 18px;
    }


    /* --------------------------------------------------------
       Mobile Page Content
       -------------------------------------------------------- */

    .page-content {
        width: 100%;

        margin: 0;

        padding:
            34px 20px
            25px;

        background: var(--mobile-bg);
    }


    /* Summary becomes visually compact on mobile */

    .room-summary {
        display: grid;

        grid-template-columns:
            repeat(2, minmax(0, 1fr));

        gap: 10px;

        margin-bottom: 25px;
    }

    .summary-card {
        min-height: 66px;

        padding: 12px;

        background: var(--mobile-surface);
        border-color: var(--mobile-border);

        border-radius: 12px;

        box-shadow: none;
    }

    .summary-icon {
        width: 33px;
        height: 33px;

        border-radius: 9px;
    }

    .summary-icon svg {
        width: 16px;
        height: 16px;
    }

    .summary-information span {
        color: #8f908e;

        font-size: 9px;
    }

    .summary-information strong {
        color: #f2f2f1;

        font-size: 17px;
    }


    /* --------------------------------------------------------
       Hide desktop toolbar
       -------------------------------------------------------- */

    .rooms-toolbar {
        display: none;
    }


    /* --------------------------------------------------------
       Filters
       -------------------------------------------------------- */

    .room-filters-section {
        margin-bottom: 22px;
    }

    .filter-header {
        display: none;
    }

    .room-filters {
        width: calc(100vw - 40px);

        margin-left: -0px;

        gap: 8px;

        overflow-x: auto;
    }

    .filter-chip {
        min-height: 45px;

        padding: 0 18px;

        border: 0;

        background: #141514;
        color: #e8e8e7;

        border-radius: 15px;

        font-size: 14px;
        font-weight: 500;
    }

    .filter-chip strong {
        display: none;
    }

    .filter-chip.active {
        background: #073b70;
        color: #62b5fa;

        box-shadow: none;
    }

    .filter-chip:hover {
        border: 0;
    }


    /* --------------------------------------------------------
       Rooms grid
       -------------------------------------------------------- */

    .rooms-grid {
        grid-template-columns:
            repeat(2, minmax(0, 1fr));

        gap: 12px;
    }


    /* --------------------------------------------------------
       Mobile room card — inspired directly by supplied mock
       -------------------------------------------------------- */

    .room-card {
        min-height: 190px;

        padding: 17px 15px;

        background: #1b1c1a;
        border-color: #30312f;

        border-radius: 18px;

        box-shadow: none;
    }

    .room-card:hover {
        transform: none;

        border-color: #3c3d3b;

        box-shadow: none;
    }

    .room-card-header {
        gap: 7px;
    }

    .room-card-number strong {
        color: #f5f5f4;

        font-size: 17px;
    }

    .room-card-type {
        margin-top: 3px;

        color: #b4b5b3;

        font-size: 12px;
    }

    .room-status {
        min-height: 32px;

        padding: 0 11px;

        border-radius: 17px;

        font-size: 11px;
    }

    .room-status.available {
        background: #151716;
        color: #eeeeec;
    }

    .room-status.occupied {
        background: #063d08;
        color: #00d321;
    }

    .room-status.reserved {
        background: #543000;
        color: #ffb321;
    }

    .room-status.maintenance {
        background: #43070a;
        color: #ff6a72;
    }


    /* Price */

    .room-card-price {
        margin-top: 13px;
    }

    .room-card-price strong {
        color: #eeeeed;

        font-size: 15px;
    }

    .room-card-price span {
        color: #a7a8a6;

        font-size: 11px;
    }


    /* Metadata */

    .room-card-meta {
        margin-top: 8px;
    }

    .room-meta-item {
        color: #999a98;

        font-size: 10px;
    }


    /* Progress */

    .room-progress {
        margin-top: 12px;
    }

    .room-progress-header {
        margin-bottom: 5px;

        color: #a8a9a7;

        font-size: 10px;
    }

    .room-progress-track {
        height: 7px;

        background: #111211;
    }

    .room-progress-bar {
        background: #00d51f;
    }


    /* Footer */

    .room-card-footer {
        margin-top: 9px;
        padding-top: 0;

        border-top: 0;

        color: #9d9e9c;

        font-size: 10px;
    }

    .room-card-action {
        color: #59adf4;
    }


    /* --------------------------------------------------------
       Loading / empty
       -------------------------------------------------------- */

    .rooms-loading {
        min-height: 280px;
    }

    .rooms-loading p {
        color: #8d8e8c;
    }

    .rooms-empty {
        min-height: 270px;

        background: #1b1c1a;
        border-color: #30312f;

        border-radius: 17px;
    }

    .rooms-empty h3 {
        color: #f2f2f1;
    }

    .rooms-empty p {
        color: #999a98;
    }


    /* --------------------------------------------------------
       Mobile bottom navigation
       -------------------------------------------------------- */

    .mobile-bottom-navigation {
        position: fixed;

        left: 0;
        right: 0;
        bottom: 0;

        height: 78px;

        display: grid;

        grid-template-columns:
            1fr 1fr 1.25fr 1fr 1fr;

        align-items: center;

        background: #1a1b19;

        border-top: 1px solid #30312f;

        z-index: 300;
    }

    .mobile-nav-item {
        height: 100%;

        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;

        gap: 4px;

        color: #929390;

        font-size: 11px;
        font-weight: 500;
    }

    .mobile-nav-item svg {
        width: 27px;
        height: 27px;

        stroke-width: 1.7;
    }

    .mobile-nav-item.active {
        color: #56b1f8;
    }

    .mobile-add-button {
        position: relative;

        width: 100%;
        height: 100%;

        display: grid;
        place-items: center;

        padding: 0;

        border: 0;
        background: transparent;
    }

    .mobile-add-button-circle {
        width: 68px;
        height: 68px;

        display: grid;
        place-items: center;

        margin-top: -28px;

        border-radius: 50%;

        background: #087fdf;

        color: #ffffff;

        box-shadow:
            0 4px 15px rgba(0, 0, 0, 0.25);
    }

    .mobile-add-button-circle svg {
        width: 37px;
        height: 37px;

        stroke-width: 1.8;
    }


    /* --------------------------------------------------------
       Mobile modals
       -------------------------------------------------------- */

    .modal-backdrop {
        align-items: flex-end;

        padding: 0;

        background: rgba(0, 0, 0, 0.60);
    }

    .modal {
        width: 100%;

        max-height: 91vh;

        border-radius:
            23px 23px 0 0;

        border: 1px solid #333532;

        background: #1d1e1c;

        color: #f1f1f0;

        box-shadow:
            0 -8px 40px rgba(0, 0, 0, 0.35);
    }

    .modal-header {
        padding: 20px 20px 16px;

        border-bottom-color: #30312f;
    }

    .modal-header h2 {
        color: #f5f5f4;

        font-size: 19px;
    }

    .modal-header p {
        color: #999a98;

        font-size: 10px;
    }

    .modal-close-button {
        width: 34px;
        height: 34px;

        background: #2a2b29;
        color: #b4b5b3;
    }

    .modal-close-button:hover {
        background: #333432;
        color: #ffffff;
    }

    .modal-eyebrow {
        color: #4eaff5;
    }


    /* Forms */

    .form-section {
        padding: 18px 20px;

        border-bottom-color: #30312f;
    }

    .form-section-heading h3 {
        color: #f0f0ef;
    }

    .form-section-heading p {
        color: #969794;
    }

    .form-grid.two-columns {
        grid-template-columns: 1fr;
    }

    .form-field label {
        color: #bfc0be;
    }

    .form-field input,
    .form-field select,
    .form-field textarea {
        border-color: #3b3c3a;

        background: #141514;
        color: #f2f2f1;
    }

    .form-field input::placeholder,
    .form-field textarea::placeholder {
        color: #747572;
    }

    .form-field input:focus,
    .form-field select:focus,
    .form-field textarea:focus {
        border-color: #087fdf;

        box-shadow:
            0 0 0 3px rgba(8, 127, 223, 0.14);
    }

    .input-prefix {
        color: #b4b5b3;
    }

    .field-help {
        color: #777874;
    }

    .modal-footer {
        padding:
            14px 20px
            calc(14px + env(safe-area-inset-bottom));

        background: #191a18;

        border-top-color: #30312f;
    }

    .secondary-button {
        border-color: #3c3d3b;

        background: #282927;
        color: #d4d5d3;
    }

    .secondary-button:hover {
        background: #313230;
    }


    /* Details */

    .room-details-content {
        padding: 18px 20px;
    }

    .details-grid {
        grid-template-columns: 1fr;
    }

    .details-item {
        border-color: #343532;

        background: #252624;
    }

    .details-item-label {
        color: #888985;
    }

    .details-item-value {
        color: #e9e9e8;
    }


    /* History */

    .history-content {
        padding: 18px 20px;
    }

    .history-item:not(:last-child)::after {
        background: #363735;
    }

    .history-item-title {
        color: #eeeeed;
    }

    .history-item-meta {
        color: #8d8e8c;
    }

    .history-item-note {
        color: #b0b1af;
    }


    /* Confirmation */

    .confirmation-content {
        padding: 0 20px;
    }

    .confirmation-content h2 {
        color: #eeeeed;
    }

    .confirmation-content p {
        color: #999a98;
    }

    .confirmation-modal .form-message {
        margin-left: 20px;
        margin-right: 20px;
    }


    /* Profile menu */

    .profile-menu {
        top: 15px;
        right: 15px;

        background: #242522;
        border-color: #393a37;

        box-shadow:
            0 15px 40px rgba(0, 0, 0, 0.45);
    }

    .profile-menu-header strong {
        color: #eeeeed;
    }

    .profile-menu-header span {
        color: #929390;
    }

    .profile-menu-divider {
        background: #373835;
    }

    .profile-menu-item {
        color: #bfc0be;
    }

    .profile-menu-item:hover {
        background: #30312e;
        color: #ffffff;
    }

    .logout-item:hover {
        background: #401d20;
        color: #ff7a82;
    }


    /* Toast */

    .toast {
        right: 15px;
        bottom: 92px;

        width: calc(100vw - 30px);

        background: #262724;
        border-color: #3a3b38;
    }

    .toast-content strong {
        color: #eeeeed;
    }

    .toast-content span {
        color: #a7a8a5;
    }

    .toast-close {
        color: #a4a5a2;
    }

}


/* ============================================================
   28. VERY SMALL PHONES
   ============================================================ */

@media (max-width: 390px) {

    .mobile-header {
        min-height: 255px;

        padding:
            24px 16px
            28px;
    }

    .mobile-page-title h1 {
        font-size: 28px;
    }

    .mobile-profile-avatar {
        width: 40px;
        height: 40px;
    }

    .mobile-search input {
        height: 59px;

        font-size: 17px;
    }

    .page-content {
        padding:
            28px 16px
            22px;
    }

    .room-filters {
        width: calc(100vw - 32px);
    }

    .filter-chip {
        min-height: 42px;

        padding: 0 15px;

        font-size: 13px;
    }

    .rooms-grid {
        gap: 9px;
    }

    .room-card {
        min-height: 178px;

        padding: 14px 12px;

        border-radius: 15px;
    }

    .room-card-number strong {
        font-size: 15px;
    }

    .room-card-type {
        font-size: 10px;
    }

    .room-status {
        min-height: 28px;

        padding: 0 8px;

        font-size: 9px;
    }

    .room-card-price strong {
        font-size: 14px;
    }

    .mobile-bottom-navigation {
        height: 72px;
    }

    .mobile-add-button-circle {
        width: 62px;
        height: 62px;
    }

}


/* ============================================================
   29. REDUCED MOTION
   ============================================================ */

@media (prefers-reduced-motion: reduce) {

    *,
    *::before,
    *::after {
        scroll-behavior: auto !important;

        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;

        transition-duration: 0.01ms !important;
    }
}


/* ============================================================
   30. PRINT
   ============================================================ */

@media print {

    .sidebar,
    .topbar,
    .mobile-header,
    .mobile-bottom-navigation,
    .rooms-toolbar,
    .room-filters-section,
    .modal-backdrop,
    .profile-menu,
    .toast {
        display: none !important;
    }

    .main-content {
        width: 100%;
        margin: 0;
    }

    .page-content {
        padding: 0;
    }

    .rooms-grid {
        grid-template-columns:
            repeat(2, minmax(0, 1fr));
    }

    .room-card {
        break-inside: avoid;

        box-shadow: none;
    }
}