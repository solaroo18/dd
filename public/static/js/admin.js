/**
 * XNetflix — Admin Dashboard Controller
 * Professional, clean, no emojis — English-first
 */

const translations = {
  en: {
    adminBrandTitle: "XNetflix Admin",
    adminSubtitle: "Cookie Pool Management & System Settings",
    navHome: "Main Site",
    navLogout: "Logout",
    livePoolBadge: "Active:",
    loggedAs: "Admin:",

    // Auth card
    authCardTitle: "Admin Authentication",
    authCardSubtitle: "Enter your credentials to access the control panel",
    userInputLabel: "Username",
    userInputPlaceholder: "Username",
    passInputLabel: "Password",
    passInputPlaceholder: "Password",
    loginBtn: "Access Dashboard",
    secureZoneNotice: "Encrypted & monitored — authorized administrators only",

    // Dashboard
    dashGreeting: "System Overview",
    dashSubtitle: "Manage cookie pool, test validity, and configure settings",
    btnTestAll: "Test All",
    btnExport: "Export Backup",
    refreshBtn: "Refresh",
    healthLabel: "Pool Health",

    // Metrics
    metricTotal: "Total Accounts",
    metricActive: "Active",
    metricInactive: "Inactive / Expired",
    metricUsage: "Total Generations",

    // Tabs
    tabInventory: "Cookie Pool",
    tabAdd: "Add Cookies",
    tabKeys: "Access Keys",
    tabSettings: "Settings",

    // Access Keys Tab
    gateTitle: "Private Access Key Protection",
    gateSubtitle: "When enabled, visitors cannot generate tokens or use the service without entering an admin-authorized access key.",
    metricTotalKeys: "Total Issued Keys",
    metricActiveKeys: "Active Keys",
    metricKeyUses: "Total Key Activations",
    generateKeyTitle: "Generate New Access Key",
    keyLabelOwner: "Owner / Note (e.g. Client Name)",
    keyLabelExpires: "Expiration",
    keyLabelMaxUses: "Max Uses / Generations",
    keyLabelCount: "Quantity to Generate",
    keyLabelCustomCode: "Custom Code (optional)",
    btnCreateKey: "+ Create Access Key",
    keysDirectoryTitle: "Access Keys Directory",
    cleanExpiredKeysBtn: "Clean Expired Keys",
    thKey: "Access Key",
    thOwner: "Owner / Note",
    thActivations: "Activations",
    thExpiration: "Expiration",

    // Add Tab
    addTitle: "Add New Cookies",
    accountNameLabel: "Account Name (optional)",
    accountNamePlaceholder: "e.g. Premium Account #1",
    cookiesTextLabel: "Cookie Data",
    cookiesPlaceholder: "Paste Netflix cookies here...\nSeparate multiple accounts with --- on a new line.",
    importInputTxtBtn: "Import from input.txt",
    clearTextBtn: "Clear",
    saveCookiesBtn: "Save to Pool",
    addHintTitle: "Supported formats:",
    addHintDesc: "Netscape, Raw Header String, and JSON Array. Separate multiple accounts with <code>---</code> on a new line.",

    // Inventory Tab
    inventoryTitle: "Cookie Pool Inventory",
    searchPlaceholder: "Search by name or ID...",
    filterAll: "All",
    filterActive: "Active",
    filterInactive: "Inactive",
    filterExpired: "Expired",
    clearAllBtn: "Clear All",
    thName: "Account",
    thFormat: "Format",
    thStatus: "Status",
    thUses: "Uses",
    thAdded: "Added",
    thOps: "Actions",
    statusActive: "Active",
    statusInactive: "Inactive",
    statusExpired: "Expired",
    opTest: "Test",
    opToggle: "Toggle",
    opDelete: "Delete",
    opCopy: "Copy",
    opMobileLink: "📱 Phone Link",
    opMobileLinkGenerating: "Generating...",
    opMobileLinkCopied: "✓ Copied!",
    testingText: "Testing...",
    emptyInventory: "No cookies in pool. Add accounts from the Add Cookies tab.",
    noSearchResults: "No accounts match your search.",

    // Settings Tab
    settingsTitle: "Admin Settings",
    newUsernameLabel: "New Username",
    newPassLabel: "New Password",
    changePassPlaceholder: "Min 4 characters",
    saveCredsBtn: "Save Credentials",
    systemInfoTitle: "System Information",

    // Notifications
    enterCredsPrompt: "Please enter username and password",
    loginSuccess: "Authentication successful",
    logoutSuccess: "Logged out successfully",
    invalidCreds: "Invalid username or password",
    cookiesRequired: "Please paste cookie data first",
    cookiesAdded: "Cookies added successfully",
    confirmClearPool: "Delete ALL cookies from the pool? This cannot be undone.",
    confirmDeleteCookie: "Delete this account from the pool?",
    credsUpdated: "Credentials updated successfully",
    copySuccess: "Copied to clipboard"
  }
};

let currentLang = "en";
let adminAuthToken = localStorage.getItem("adminAuthToken") || sessionStorage.getItem("adminAuthToken") || null;
let currentAdminUser = localStorage.getItem("adminUsername") || sessionStorage.getItem("adminUsername") || "admin";
let currentCookiesList = [];
let currentKeysList = [];
let selectedCookieIds = new Set();

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  applyLanguage();
  setupEventListeners();
  checkAuth();
});

function t(key) {
  return (translations[currentLang] || translations.en)[key] || key;
}

function applyLanguage() {
  const dict = translations[currentLang] || translations.en;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.textContent = dict[key];
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (dict[key]) el.placeholder = dict[key];
  });
}

// Auth Check
function checkAuth() {
  const loginSection = document.getElementById("adminLoginSection");
  const dashboardSection = document.getElementById("adminDashboardSection");
  const logoutBtn = document.getElementById("btnNavLogout");
  const userChip = document.getElementById("userIdentityChip");
  const loggedUserEl = document.getElementById("loggedUsername");

  if (adminAuthToken) {
    if (loginSection) loginSection.classList.add("hidden");
    if (dashboardSection) dashboardSection.classList.remove("hidden");
    if (logoutBtn) logoutBtn.classList.remove("hidden");
    if (userChip) userChip.classList.remove("hidden");
    if (loggedUserEl) loggedUserEl.textContent = currentAdminUser;
    loadAdminInventory();
    loadAdminKeys();
    loadSystemInfo();
  } else {
    if (loginSection) loginSection.classList.remove("hidden");
    if (dashboardSection) dashboardSection.classList.add("hidden");
    if (logoutBtn) logoutBtn.classList.add("hidden");
    if (userChip) userChip.classList.add("hidden");
  }
}

// Event Setup
function setupEventListeners() {
  // Login
  const btnLogin = document.getElementById("btnAdminLogin");
  const userInput = document.getElementById("adminUserInput");
  const passInput = document.getElementById("adminPassInput");
  const btnToggleEye = document.getElementById("btnToggleEye");

  if (btnToggleEye && passInput) {
    btnToggleEye.addEventListener("click", () => {
      const isPass = passInput.type === "password";
      passInput.type = isPass ? "text" : "password";
      btnToggleEye.querySelector(".eye-label").textContent = isPass ? "Hide" : "Show";
    });
  }

  if (btnLogin) btnLogin.addEventListener("click", handleLogin);
  if (userInput) userInput.addEventListener("keyup", e => { if (e.key === "Enter") handleLogin(); });
  if (passInput) passInput.addEventListener("keyup", e => { if (e.key === "Enter") handleLogin(); });

  // Logout
  const btnNavLogout = document.getElementById("btnNavLogout");
  const btnSettingsLogout = document.getElementById("btnSettingsLogout");
  if (btnNavLogout) btnNavLogout.addEventListener("click", handleLogout);
  if (btnSettingsLogout) btnSettingsLogout.addEventListener("click", handleLogout);

  // Tabs
  document.querySelectorAll(".admin-tab-button").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-tab");
      document.querySelectorAll(".admin-tab-button").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".admin-tab-pane").forEach(p => p.classList.add("hidden"));
      btn.classList.add("active");
      const target = document.getElementById(targetId);
      if (target) target.classList.remove("hidden");
      if (targetId === "pane-inventory") loadAdminInventory();
      if (targetId === "pane-keys") loadAdminKeys();
      if (targetId === "pane-settings") loadSystemInfo();
    });
  });

  // Access Keys Event Listeners
  const chkRequireKey = document.getElementById("chkRequireKey");
  if (chkRequireKey) chkRequireKey.addEventListener("change", handleToggleRequireKey);

  const keyExpiresSelect = document.getElementById("keyExpiresSelect");
  const customExpiresRow = document.getElementById("customExpiresRow");
  if (keyExpiresSelect && customExpiresRow) {
    keyExpiresSelect.addEventListener("change", () => {
      customExpiresRow.classList.toggle("hidden", keyExpiresSelect.value !== "custom");
    });
  }

  const btnGenerateKey = document.getElementById("btnGenerateKey");
  if (btnGenerateKey) btnGenerateKey.addEventListener("click", handleGenerateKey);

  const btnCloseCreatedKeys = document.getElementById("btnCloseCreatedKeys");
  const createdKeysBox = document.getElementById("createdKeysBox");
  if (btnCloseCreatedKeys && createdKeysBox) {
    btnCloseCreatedKeys.addEventListener("click", () => {
      createdKeysBox.classList.add("hidden");
    });
  }

  const keysSearchInput = document.getElementById("keysSearchInput");
  if (keysSearchInput) keysSearchInput.addEventListener("input", renderKeysTable);

  const keysStatusFilter = document.getElementById("keysStatusFilter");
  if (keysStatusFilter) keysStatusFilter.addEventListener("change", renderKeysTable);

  const btnClearExpiredKeys = document.getElementById("btnClearExpiredKeys");
  if (btnClearExpiredKeys) btnClearExpiredKeys.addEventListener("click", handleClearExpiredKeys);


  // Quick Actions
  const btnTestAll = document.getElementById("btnQuickTestAll");
  if (btnTestAll) btnTestAll.addEventListener("click", handleTestAllCookies);

  const btnExport = document.getElementById("btnExportBackup");
  if (btnExport) btnExport.addEventListener("click", handleExportBackup);

  const btnRefresh = document.getElementById("btnQuickRefresh");
  if (btnRefresh) btnRefresh.addEventListener("click", loadAdminInventory);

  const btnResetLimits = document.getElementById("btnResetDeviceLimits");
  if (btnResetLimits) btnResetLimits.addEventListener("click", handleResetDeviceLimits);

  const btnCopyVercel = document.getElementById("btnCopyVercelEnv");
  if (btnCopyVercel) btnCopyVercel.addEventListener("click", handleCopyVercelEnv);

  // Add Cookies
  const cookiesText = document.getElementById("adminCookiesText");
  const btnSave = document.getElementById("btnSaveCookies");
  const btnImport = document.getElementById("btnImportInput");
  const btnClearText = document.getElementById("btnClearCookiesText");
  const accountName = document.getElementById("adminAccountName");

  if (cookiesText) cookiesText.addEventListener("input", handleCookiesTextInput);

  if (btnClearText && cookiesText) {
    btnClearText.addEventListener("click", () => {
      cookiesText.value = "";
      handleCookiesTextInput();
      cookiesText.focus();
    });
  }

  if (btnSave) {
    btnSave.addEventListener("click", async () => {
      const text = cookiesText.value.trim();
      if (!text) { showToast(t("cookiesRequired"), "error"); return; }

      const spinner = document.getElementById("saveSpinner");
      if (spinner) spinner.classList.add("show");
      btnSave.disabled = true;

      try {
        const res = await fetch("/api/admin/cookies/add", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminAuthToken}` },
          body: JSON.stringify({
            cookies_text: text,
            name: accountName.value.trim()
          })
        });
        const data = await res.json();
        if (data.success) {
          cookiesText.value = "";
          accountName.value = "";
          handleCookiesTextInput();
          showToast(data.message || t("cookiesAdded"), "success");
          loadAdminInventory();
        } else {
          showToast(data.error || "Failed to add cookies", "error");
        }
      } catch (e) {
        showToast("Error adding cookies", "error");
      } finally {
        if (spinner) spinner.classList.remove("show");
        btnSave.disabled = false;
      }
    });
  }

  if (btnImport) {
    btnImport.addEventListener("click", async () => {
      try {
        const res = await fetch("/api/admin/cookies/import-input", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminAuthToken}` }
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message, "success");
          loadAdminInventory();
        } else {
          showToast(data.error || "Import failed", "error");
        }
      } catch (e) {
        showToast("Error importing", "error");
      }
    });
  }

  // Clear Pool
  const btnClearAll = document.getElementById("btnClearAllPool");
  if (btnClearAll) {
    btnClearAll.addEventListener("click", async () => {
      if (!confirm(t("confirmClearPool"))) return;
      try {
        const res = await fetch("/api/admin/cookies/clear", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminAuthToken}` }
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message, "info");
          selectedCookieIds.clear();
          updateBulkToolbar();
          loadAdminInventory();
        }
      } catch (e) {
        showToast("Error clearing pool", "error");
      }
    });
  }

  // Select All
  const selectAll = document.getElementById("selectAllCheckbox");
  if (selectAll) {
    selectAll.addEventListener("change", e => {
      const checked = e.target.checked;
      document.querySelectorAll(".cookie-row-check").forEach(cb => {
        cb.checked = checked;
        const id = cb.getAttribute("data-id");
        checked ? selectedCookieIds.add(id) : selectedCookieIds.delete(id);
      });
      updateBulkToolbar();
    });
  }

  // Bulk Actions
  const btnBulkActivate = document.getElementById("btnBulkActivate");
  const btnBulkDeactivate = document.getElementById("btnBulkDeactivate");
  const btnBulkDelete = document.getElementById("btnBulkDelete");
  if (btnBulkActivate) btnBulkActivate.addEventListener("click", () => handleBulkAction("activate"));
  if (btnBulkDeactivate) btnBulkDeactivate.addEventListener("click", () => handleBulkAction("deactivate"));
  if (btnBulkDelete) btnBulkDelete.addEventListener("click", () => handleBulkAction("delete"));

  // Search & Filter
  const searchInput = document.getElementById("inventorySearch");
  const filterSelect = document.getElementById("inventoryStatusFilter");
  if (searchInput) searchInput.addEventListener("input", renderInventoryTable);
  if (filterSelect) filterSelect.addEventListener("change", renderInventoryTable);

  // Update Credentials
  const btnUpdateCreds = document.getElementById("btnUpdateCredentials");
  const newUserInput = document.getElementById("newAdminUserInput");
  const newPassInput = document.getElementById("newAdminPassInput");

  if (btnUpdateCreds) {
    btnUpdateCreds.addEventListener("click", async () => {
      const newU = newUserInput.value.trim();
      const newP = newPassInput.value.trim();
      if (!newU && !newP) { showToast("Enter a new username or password", "error"); return; }

      const spinner = document.getElementById("credSpinner");
      if (spinner) spinner.classList.add("show");
      btnUpdateCreds.disabled = true;

      try {
        const res = await fetch("/api/admin/change-credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminAuthToken}` },
          body: JSON.stringify({ new_username: newU, new_password: newP })
        });
        const data = await res.json();
        if (data.success) {
          adminAuthToken = data.token;
          currentAdminUser = data.username;
          localStorage.setItem("adminAuthToken", adminAuthToken);
          localStorage.setItem("adminUsername", currentAdminUser);
          sessionStorage.setItem("adminAuthToken", adminAuthToken);
          sessionStorage.setItem("adminUsername", currentAdminUser);
          document.getElementById("loggedUsername").textContent = currentAdminUser;
          newUserInput.value = "";
          newPassInput.value = "";
          showToast(t("credsUpdated"), "success");
        } else {
          showToast(data.error || "Failed", "error");
        }
      } catch (e) {
        showToast("Error updating credentials", "error");
      } finally {
        if (spinner) spinner.classList.remove("show");
        btnUpdateCreds.disabled = false;
      }
    });
  }

  // Raw Modal
  const btnCloseRaw = document.getElementById("btnCloseRawModal");
  const btnDoneRaw = document.getElementById("btnDoneRawModal");
  const rawModal = document.getElementById("rawModal");
  const btnCopyRaw = document.getElementById("btnCopyRawModal");

  function closeRawModal() {
    if (rawModal) { rawModal.classList.add("hidden"); rawModal.style.display = "none"; }
  }

  if (btnCloseRaw) btnCloseRaw.addEventListener("click", closeRawModal);
  if (btnDoneRaw) btnDoneRaw.addEventListener("click", closeRawModal);
  if (rawModal) rawModal.addEventListener("click", e => { if (e.target === rawModal) closeRawModal(); });

  if (btnCopyRaw) {
    btnCopyRaw.addEventListener("click", () => {
      const text = document.getElementById("rawModalText").value;
      navigator.clipboard.writeText(text);
      showToast(t("copySuccess"), "success");
    });
  }
}

// Format Detection
function handleCookiesTextInput() {
  const text = (document.getElementById("adminCookiesText")?.value || "").trim();
  const formatBadge = document.getElementById("detectedFormatBadge");
  const countBadge = document.getElementById("detectedCountBadge");
  if (!formatBadge || !countBadge) return;

  if (!text) {
    formatBadge.textContent = "None";
    formatBadge.style.color = "var(--text-dim)";
    countBadge.textContent = "0 accounts";
    return;
  }

  const count = text.split(/\n\s*---\s*\n/).filter(x => x.trim().length > 0).length || 1;
  countBadge.textContent = `${count} account${count > 1 ? "s" : ""} detected`;

  if (text.startsWith("[") && text.endsWith("]")) {
    formatBadge.textContent = "JSON Array";
    formatBadge.style.color = "#3b82f6";
  } else if (text.includes(".netflix.com") && text.includes("\t")) {
    formatBadge.textContent = "Netscape";
    formatBadge.style.color = "#22c55e";
  } else if (text.includes("NetflixId=") || text.includes("SecureNetflixId=")) {
    formatBadge.textContent = "Raw Header";
    formatBadge.style.color = "#eab308";
  } else {
    formatBadge.textContent = "Raw / Custom";
    formatBadge.style.color = "var(--text-secondary)";
  }
}

// Login
async function handleLogin() {
  const userInput = document.getElementById("adminUserInput");
  const passInput = document.getElementById("adminPassInput");
  const btnLogin = document.getElementById("btnAdminLogin");
  const spinner = document.getElementById("adminLoginSpinner");

  const username = userInput.value.trim();
  const password = passInput.value.trim();

  if (!username || !password) { showToast(t("enterCredsPrompt"), "error"); return; }

  if (spinner) spinner.classList.add("show");
  if (btnLogin) btnLogin.disabled = true;

  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (data.success) {
      adminAuthToken = data.token;
      currentAdminUser = data.username || username;
      localStorage.setItem("adminAuthToken", adminAuthToken);
      localStorage.setItem("adminUsername", currentAdminUser);
      sessionStorage.setItem("adminAuthToken", adminAuthToken);
      sessionStorage.setItem("adminUsername", currentAdminUser);
      userInput.value = "";
      passInput.value = "";
      checkAuth();
      showToast(t("loginSuccess"), "success");
    } else {
      showToast(data.error || t("invalidCreds"), "error");
    }
  } catch (e) {
    showToast("Server connection error", "error");
  } finally {
    if (spinner) spinner.classList.remove("show");
    if (btnLogin) btnLogin.disabled = false;
  }
}

// Logout
async function handleLogout() {
  if (adminAuthToken) {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        headers: { "Authorization": `Bearer ${adminAuthToken}` }
      });
    } catch (e) {}
  }
  adminAuthToken = null;
  localStorage.removeItem("adminAuthToken");
  localStorage.removeItem("adminUsername");
  sessionStorage.removeItem("adminAuthToken");
  sessionStorage.removeItem("adminUsername");
  selectedCookieIds.clear();
  checkAuth();
  showToast(t("logoutSuccess"), "info");
}

// Load Inventory
async function loadAdminInventory() {
  if (!adminAuthToken) return;
  try {
    const res = await fetch("/api/admin/cookies", {
      headers: { "Authorization": `Bearer ${adminAuthToken}` }
    });

    if (res.status === 401 || res.status === 403) { handleLogout(); return; }

    const data = await res.json();
    if (data.success && Array.isArray(data.cookies)) {
      currentCookiesList = data.cookies;
      updateMetrics(currentCookiesList);
      renderInventoryTable();
    }
  } catch (e) {
    console.error("Inventory load failed:", e);
  }
}

// Update Metrics
function updateMetrics(list) {
  const total = list.length;
  const active = list.filter(c => c.status === "active").length;
  const inactive = total - active;
  const totalUses = list.reduce((s, c) => s + (c.usage_count || 0), 0);
  const healthPercent = total > 0 ? Math.round((active / total) * 100) : 0;

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  setEl("metricTotalVal", total);
  setEl("metricActiveVal", active);
  setEl("metricInactiveVal", inactive);
  setEl("metricUsesVal", totalUses);
  setEl("headerPoolCount", active);
  setEl("tabInventoryBadge", total);
  setEl("healthPercentText", `${healthPercent}% (${active}/${total})`);

  const healthBar = document.getElementById("healthProgressBar");
  if (healthBar) {
    healthBar.style.width = `${healthPercent}%`;
    healthBar.style.background = healthPercent >= 70
      ? "linear-gradient(90deg, #22c55e, #16a34a)"
      : healthPercent >= 40
      ? "linear-gradient(90deg, #eab308, #ca8a04)"
      : "linear-gradient(90deg, #ef4444, #dc2626)";
  }
}

// Render Table
function renderInventoryTable() {
  const tbody = document.getElementById("adminInventoryTableBody");
  if (!tbody) return;

  const query = (document.getElementById("inventorySearch")?.value || "").trim().toLowerCase();
  const filterVal = document.getElementById("inventoryStatusFilter")?.value || "all";

  let filtered = currentCookiesList.filter(item => {
    // Status filter
    if (filterVal !== "all" && item.status !== filterVal) return false;
    // Search query
    if (query) {
      const name = (item.name || "").toLowerCase();
      const idPrev = (item.netflix_id_preview || "").toLowerCase();
      const format = (item.format || "").toLowerCase();
      return name.includes(query) || idPrev.includes(query) || format.includes(query);
    }
    return true;
  });

  if (currentCookiesList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-dim);">${t("emptyInventory")}</td></tr>`;
    return;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-dim);">${t("noSearchResults")}</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  filtered.forEach(item => {
    const tr = document.createElement("tr");

    let statusBadge = `<span class="status-badge-active">${t("statusActive")}</span>`;
    if (item.status === "inactive") {
      statusBadge = `<span class="status-badge-inactive">${t("statusInactive")}</span>`;
    } else if (item.status === "expired") {
      statusBadge = `<span class="status-badge-expired">${t("statusExpired")}</span>`;
    }

    const isChecked = selectedCookieIds.has(item.id) ? "checked" : "";

    tr.innerHTML = `
      <td style="text-align: center;">
        <input type="checkbox" class="cookie-row-check" data-id="${item.id}" ${isChecked}>
      </td>
      <td>
        <strong style="color: var(--text-main); font-size: 0.85rem;">${escapeHtml(item.name || "Account")}</strong>
        <br>
        <small style="color: var(--text-dim); font-family: var(--font-mono); font-size: 0.7rem;">
          ${escapeHtml(item.netflix_id_preview || "-")}
        </small>
      </td>
      <td>
        <span style="font-size: 0.7rem; color: var(--text-dim); background: rgba(255,255,255,0.04); padding: 2px 6px; border-radius: 3px; font-family: var(--font-mono);">
          ${escapeHtml(item.format || "raw")}
        </span>
      </td>
      <td>${statusBadge}</td>
      <td><strong style="color: var(--gold); font-family: var(--font-mono);">${item.usage_count || 0}</strong></td>
      <td style="font-size: 0.72rem; color: var(--text-dim);">${escapeHtml(item.added_at || "-")}</td>
      <td>
        <div class="admin-table-ops">
          <button class="btn-op btn-op-copy" onclick="copyCookieRaw('${item.id}', this)">${t("opCopy")}</button>
          <button class="btn-op btn-op-mobile" onclick="generateAndCopyMobileLink('${item.id}', this)" title="📱 إنتاج ونسخ رابط تفعيل الهاتف (Mobile Link)">${t("opMobileLink")}</button>
          <button class="btn-op" onclick="testCookie('${item.id}', this)">${t("opTest")}</button>
          <button class="btn-op" onclick="toggleCookie('${item.id}')">${t("opToggle")}</button>
          <button class="btn-op btn-op-danger" onclick="deleteCookie('${item.id}')">${t("opDelete")}</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Checkbox listeners
  document.querySelectorAll(".cookie-row-check").forEach(cb => {
    cb.addEventListener("change", e => {
      const id = e.target.getAttribute("data-id");
      e.target.checked ? selectedCookieIds.add(id) : selectedCookieIds.delete(id);
      updateBulkToolbar();
    });
  });
}

function updateBulkToolbar() {
  const toolbar = document.getElementById("bulkToolbar");
  const countText = document.getElementById("bulkSelectedText");
  if (!toolbar || !countText) return;

  const count = selectedCookieIds.size;
  if (count > 0) {
    toolbar.classList.remove("hidden");
    countText.textContent = `${count} account${count > 1 ? "s" : ""} selected`;
  } else {
    toolbar.classList.add("hidden");
  }
}

// Bulk Actions
async function handleBulkAction(action) {
  if (selectedCookieIds.size === 0) return;
  if (action === "delete" && !confirm(`Delete ${selectedCookieIds.size} accounts?`)) return;

  try {
    const res = await fetch("/api/admin/cookies/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminAuthToken}` },
      body: JSON.stringify({ action, ids: Array.from(selectedCookieIds) })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, "success");
      selectedCookieIds.clear();
      updateBulkToolbar();
      loadAdminInventory();
    } else {
      showToast(data.error || "Action failed", "error");
    }
  } catch (e) {
    showToast("Error executing action", "error");
  }
}

// Switch Cookie Pool
async function switchCookiePool(cookieId, targetPool) {
  if (!adminAuthToken) return;
  try {
    const res = await fetch("/api/admin/cookies/switch-pool", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminAuthToken}` },
      body: JSON.stringify({ id: cookieId, pool_type: targetPool })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, "success");
      loadAdminInventory();
    } else {
      showToast(data.error || "Failed to switch pool", "error");
    }
  } catch (e) {
    showToast("Error switching pool", "error");
  }
}
window.switchCookiePool = switchCookiePool;

// Test All
async function handleTestAllCookies() {
  const btn = document.getElementById("btnQuickTestAll");
  const textEl = document.getElementById("testAllBtnText");
  if (btn) btn.disabled = true;
  if (textEl) textEl.textContent = "Testing...";

  try {
    const res = await fetch("/api/admin/cookies/test-all", {
      method: "POST",
      headers: { "Authorization": `Bearer ${adminAuthToken}` }
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, "success");
      loadAdminInventory();
    } else {
      showToast(data.error || "Test failed", "error");
    }
  } catch (e) {
    showToast("Connection error", "error");
  } finally {
    if (btn) btn.disabled = false;
    if (textEl) textEl.textContent = t("btnTestAll");
  }
}

// Export Backup
async function handleExportBackup() {
  try {
    const res = await fetch("/api/admin/cookies/export", {
      headers: { "Authorization": `Bearer ${adminAuthToken}` }
    });
    const data = await res.json();
    if (data.success) {
      const blob = new Blob([JSON.stringify(data.pool, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `xnetflix_pool_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("Backup downloaded", "success");
    }
  } catch (e) {
    showToast("Export failed", "error");
  }
}

// Cookie Operations
window.generateAndCopyMobileLink = async function(id, btn) {
  if (!id) return;
  const originalHtml = btn ? btn.innerHTML : "";
  if (btn) {
    btn.disabled = true;
    btn.classList.add("btn-op-loading");
    btn.innerHTML = `<span class="spinner-sm"></span> ${t("opMobileLinkGenerating")}`;
  }

  try {
    const res = await fetch("/api/admin/cookies/generate-mobile-link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminAuthToken}`
      },
      body: JSON.stringify({ id })
    });
    const data = await res.json();

    if (data.success && data.mobile_url) {
      const accName = data.account_name ? ` (${data.account_name})` : "";
      copyText(data.mobile_url, `📱 تم إنتاج ونسخ رابط تفعيل الهاتف بنجاح!${accName}`);
      if (btn) {
        btn.innerHTML = t("opMobileLinkCopied");
        btn.classList.remove("btn-op-loading");
        btn.classList.add("btn-op-success");
      }
    } else {
      showToast(data.error || "فشل إنتاج رابط الهاتف", "error");
      if (btn) {
        btn.innerHTML = originalHtml;
        btn.classList.remove("btn-op-loading");
        btn.disabled = false;
      }
    }
  } catch (err) {
    showToast("خطأ في الاتصال بالخادم: " + (err.message || err), "error");
    if (btn) {
      btn.innerHTML = originalHtml;
      btn.classList.remove("btn-op-loading");
      btn.disabled = false;
    }
  } finally {
    setTimeout(() => {
      if (btn) {
        btn.innerHTML = originalHtml;
        btn.classList.remove("btn-op-success");
        btn.disabled = false;
      }
    }, 2500);
  }
};

window.copyCookieRaw = async function(id) {
  try {
    const res = await fetch("/api/admin/cookies/get-raw", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminAuthToken}` },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (data.success && data.raw) {
      await navigator.clipboard.writeText(data.raw);
      showToast(t("copySuccess"), "success");
    } else {
      showToast("Could not retrieve cookie", "error");
    }
  } catch (e) {
    showToast("Copy failed", "error");
  }
};

window.testCookie = async function(id, btn) {
  if (btn) btn.textContent = t("testingText");
  try {
    const res = await fetch("/api/admin/cookies/test", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminAuthToken}` },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    showToast(data.success ? data.message : (data.error || "Cookie invalid"), data.success ? "success" : "error");
    loadAdminInventory();
  } catch (e) {
    showToast("Test failed", "error");
  } finally {
    if (btn) btn.textContent = t("opTest");
  }
};

window.toggleCookie = async function(id) {
  try {
    const res = await fetch("/api/admin/cookies/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminAuthToken}` },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (data.success) loadAdminInventory();
  } catch (e) {
    showToast("Toggle failed", "error");
  }
};

window.deleteCookie = async function(id) {
  if (!confirm(t("confirmDeleteCookie"))) return;
  try {
    const res = await fetch("/api/admin/cookies/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminAuthToken}` },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, "info");
      selectedCookieIds.delete(id);
      updateBulkToolbar();
      loadAdminInventory();
    }
  } catch (e) {
    showToast("Delete failed", "error");
  }
};

// System Info
async function loadSystemInfo() {
  if (!adminAuthToken) return;
  try {
    const res = await fetch("/api/admin/system-info", {
      headers: { "Authorization": `Bearer ${adminAuthToken}` }
    });
    const data = await res.json();
    if (data.success) {
      const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      setEl("sysUptime", data.uptime);
      setEl("sysPython", data.python_version);
      setEl("sysCurrentAdmin", data.admin_username);
      setEl("sysActiveDevices", `${data.today_active_devices || 0}`);
      setEl("sysEnvironment", data.environment || (data.is_vercel ? "Vercel Serverless" : "Standalone Python"));
      setEl("sysStorageMode", data.storage_mode || "Cloud Serverless");

      const vercelChip = document.getElementById("adminVercelChipText");
      if (vercelChip) {
        vercelChip.textContent = data.is_vercel ? "Vercel Live" : "Vercel Ready";
      }
    }
  } catch (e) {
    console.error("System info error:", e);
  }
}

// Copy Vercel Environment Variables
async function handleCopyVercelEnv() {
  if (!adminAuthToken) return;
  try {
    const res = await fetch("/api/admin/vercel-env", {
      headers: { "Authorization": `Bearer ${adminAuthToken}` }
    });
    const data = await res.json();
    if (data.success && data.env_vars) {
      const lines = Object.entries(data.env_vars)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join("\n\n");
      await navigator.clipboard.writeText(lines);
      showToast("Vercel Environment Variables copied! Paste them into Vercel Project Settings > Environment Variables.", "success");
    } else {
      showToast(data.error || "Failed to export Vercel env", "error");
    }
  } catch (e) {
    showToast("Error exporting Vercel env", "error");
  }
}

// Reset Device Limits
async function handleResetDeviceLimits() {
  if (!adminAuthToken) return;
  if (!confirm("Reset all device limits for today? This grants 3 new activations to every device.")) return;

  try {
    const res = await fetch("/api/admin/reset-device-limits", {
      method: "POST",
      headers: { "Authorization": `Bearer ${adminAuthToken}` }
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message || "Device limits reset", "success");
      loadSystemInfo();
    } else {
      showToast(data.error || "Reset failed", "error");
    }
  } catch (e) {
    showToast("Server error", "error");
  }
}

// Toast
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "toastOut 0.3s ease forwards";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==========================================================================
// ACCESS KEYS CONTROLLER
// ==========================================================================

async function loadAdminKeys() {
  if (!adminAuthToken) return;

  try {
    const res = await fetch("/api/admin/keys", {
      headers: { "Authorization": `Bearer ${adminAuthToken}` }
    });
    const data = await res.json();
    if (!data.success) {
      if (res.status === 401 || res.status === 403) handleLogout();
      return;
    }

    currentKeysList = data.keys || [];

    // Update counters
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl("metricTotalKeys", data.total_keys || 0);
    setEl("metricActiveKeys", data.active_keys || 0);
    setEl("metricKeyUses", data.total_uses || 0);
    setEl("tabKeysBadge", data.active_keys || 0);

    // Update Master Requirement Switch
    const chk = document.getElementById("chkRequireKey");
    const badge = document.getElementById("gateStatusBadge");
    if (chk) chk.checked = !!data.require_key;
    if (badge) {
      if (data.require_key) {
        badge.textContent = "Active / Locked";
        badge.className = "toggle-status-badge badge-active";
      } else {
        badge.textContent = "Disabled / Public";
        badge.className = "toggle-status-badge badge-disabled";
      }
    }

    renderKeysTable();
  } catch (err) {
    console.error("Failed to load access keys:", err);
  }
}

function renderKeysTable() {
  const tbody = document.getElementById("adminKeysTableBody");
  if (!tbody) return;

  const search = (document.getElementById("keysSearchInput")?.value || "").toLowerCase().trim();
  const filter = document.getElementById("keysStatusFilter")?.value || "all";

  const filtered = currentKeysList.filter(k => {
    // Status filter
    if (filter === "active" && k.status !== "active") return false;
    if (filter === "revoked" && k.status !== "revoked") return false;
    if (filter === "expired" && k.status !== "expired" && k.status !== "exhausted") return false;

    // Search filter
    if (search) {
      const matchKey = (k.key || "").toLowerCase().includes(search);
      const matchLabel = (k.label || "").toLowerCase().includes(search);
      if (!matchKey && !matchLabel) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-dim);">
          ${currentKeysList.length === 0 ? "No access keys created yet. Generate your first key above." : "No keys match your search or filter."}
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(k => {
    const statusClass = `key-status-${k.status || 'active'}`;
    const statusText = k.status ? k.status.toUpperCase() : "ACTIVE";
    const maxUsesStr = (k.max_uses !== null && k.max_uses !== undefined) ? k.max_uses : "∞";
    const usesDisplay = `${k.used_count || 0} / ${maxUsesStr}`;
    const expDisplay = k.expires_at ? escapeHtml(k.expires_at) : "<span style='color:var(--text-dim);'>Permanent</span>";
    const createdDisplay = k.created_at ? escapeHtml(k.created_at) : "--";
    const isRevoked = k.status === "revoked";

    return `
      <tr data-key="${escapeHtml(k.key)}">
        <td>
          <div class="key-code-pill">
            <span>${escapeHtml(k.key)}</span>
            <button type="button" class="admin-action-btn admin-action-sm" onclick="copyText('${escapeHtml(k.key)}', 'Key code copied!')" title="Copy Key">
              Copy
            </button>
            <button type="button" class="admin-action-btn admin-action-sm" onclick="copyDirectLink('${escapeHtml(k.key)}')" title="Copy Direct Link">
              🔗 Link
            </button>
          </div>
        </td>
        <td>
          <strong style="color: #fff; font-size: 0.85rem;">${escapeHtml(k.label || "General")}</strong>
        </td>
        <td>
          <span class="key-status-pill ${statusClass}">${statusText}</span>
        </td>
        <td>
          <span style="font-weight: 600;">${usesDisplay}</span>
        </td>
        <td>
          <span style="font-size: 0.8rem;">${expDisplay}</span>
        </td>
        <td>
          <span style="font-size: 0.78rem; color: var(--text-dim);">${createdDisplay}</span>
        </td>
        <td>
          <div class="table-ops-group">
            <button type="button" class="admin-action-btn admin-action-sm" onclick="handleToggleKey('${escapeHtml(k.key)}')">
              ${isRevoked ? "Activate" : "Revoke"}
            </button>
            <button type="button" class="admin-action-btn admin-action-sm" onclick="handleResetKeyUsage('${escapeHtml(k.key)}')">
              Reset
            </button>
            <button type="button" class="admin-action-btn admin-action-danger admin-action-sm" onclick="handleDeleteKey('${escapeHtml(k.key)}')">
              Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function handleGenerateKey() {
  if (!adminAuthToken) return;

  const labelInput = document.getElementById("keyLabelInput");
  const expiresSelect = document.getElementById("keyExpiresSelect");
  const customExpiresInput = document.getElementById("keyCustomExpiresInput");
  const maxUsesSelect = document.getElementById("keyMaxUsesSelect");
  const countSelect = document.getElementById("keyCountSelect");
  const customCodeInput = document.getElementById("keyCustomCodeInput");
  const poolTypeSelect = document.getElementById("keyPoolTypeSelect");
  const spinner = document.getElementById("generateKeySpinner");
  const btn = document.getElementById("btnGenerateKey");

  const label = (labelInput?.value || "").trim();
  const expires_type = expiresSelect?.value || "never";
  const custom_expires = customExpiresInput?.value || "";
  const max_uses = maxUsesSelect?.value || "unlimited";
  const count = parseInt(countSelect?.value || "1", 10);
  const custom_key = (customCodeInput?.value || "").trim();

  if (expires_type === "custom" && !custom_expires) {
    showToast("Please choose an expiration date", "error");
    return;
  }

  if (spinner) spinner.classList.add("show");
  if (btn) btn.disabled = true;

  try {
    const res = await fetch("/api/admin/keys/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminAuthToken}`
      },
      body: JSON.stringify({
        label,
        expires_type,
        custom_expires,
        max_uses,
        count,
        custom_key
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast(data.message || "Key(s) generated successfully", "success");
      if (labelInput) labelInput.value = "";
      if (customCodeInput) customCodeInput.value = "";

      // Display newly created keys banner
      const createdBox = document.getElementById("createdKeysBox");
      const createdList = document.getElementById("createdKeysList");
      if (createdBox && createdList && Array.isArray(data.created_keys)) {
        createdList.innerHTML = data.created_keys.map(k => `
          <div class="created-key-card">
            <div class="created-key-left">
              <span class="created-key-string">${escapeHtml(k.key)}</span>
              <span class="created-key-label">${escapeHtml(k.label)}</span>
            </div>
            <div class="created-key-actions">
              <button type="button" class="admin-action-btn admin-action-sm" onclick="copyText('${escapeHtml(k.key)}', 'Key copied!')">
                Copy Key
              </button>
              <button type="button" class="btn-primary-action admin-action-sm" onclick="copyDirectLink('${escapeHtml(k.key)}')">
                🔗 Copy Direct Link
              </button>
            </div>
          </div>
        `).join("");
        createdBox.classList.remove("hidden");
      }

      loadAdminKeys();
    } else {
      showToast(data.error || "Failed to create key", "error");
    }
  } catch (err) {
    console.error("Create key error:", err);
    showToast("Server connection error", "error");
  } finally {
    if (spinner) spinner.classList.remove("show");
    if (btn) btn.disabled = false;
  }
}

async function handleToggleRequireKey(e) {
  if (!adminAuthToken) return;
  const isChecked = e.target.checked;

  try {
    const res = await fetch("/api/admin/keys/toggle-requirement", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminAuthToken}`
      },
      body: JSON.stringify({ require_key: isChecked })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, "success");
      loadAdminKeys();
    } else {
      showToast(data.error || "Failed to update requirement", "error");
    }
  } catch (err) {
    showToast("Server error", "error");
  }
}

async function handleToggleKey(keyId) {
  if (!adminAuthToken) return;

  try {
    const res = await fetch("/api/admin/keys/toggle", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminAuthToken}`
      },
      body: JSON.stringify({ key: keyId })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, "success");
      loadAdminKeys();
    } else {
      showToast(data.error || "Failed to toggle key", "error");
    }
  } catch (err) {
    showToast("Server error", "error");
  }
}

async function handleDeleteKey(keyId) {
  if (!adminAuthToken) return;
  if (!confirm(`Are you sure you want to delete access key "${keyId}"? Anyone using this key will lose access.`)) return;

  try {
    const res = await fetch("/api/admin/keys/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminAuthToken}`
      },
      body: JSON.stringify({ key: keyId })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, "success");
      loadAdminKeys();
    } else {
      showToast(data.error || "Failed to delete key", "error");
    }
  } catch (err) {
    showToast("Server error", "error");
  }
}

async function handleResetKeyUsage(keyId) {
  if (!adminAuthToken) return;

  try {
    const res = await fetch("/api/admin/keys/reset-usage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminAuthToken}`
      },
      body: JSON.stringify({ key: keyId })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, "success");
      loadAdminKeys();
    } else {
      showToast(data.error || "Failed to reset key usage", "error");
    }
  } catch (err) {
    showToast("Server error", "error");
  }
}

async function handleClearExpiredKeys() {
  if (!adminAuthToken) return;
  if (!confirm("Are you sure you want to clean up and delete all expired or exhausted keys?")) return;

  try {
    const res = await fetch("/api/admin/keys/delete-expired", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminAuthToken}`
      }
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, "success");
      loadAdminKeys();
    } else {
      showToast(data.error || "Failed to clean expired keys", "error");
    }
  } catch (err) {
    showToast("Server error", "error");
  }
}

function copyDirectLink(key) {
  const directUrl = `${window.location.origin}/?key=${encodeURIComponent(key)}`;
  copyText(directUrl, "Direct login link copied! Send this link to the user.");
}

function copyText(text, successMsg = "Copied to clipboard") {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg, "success");
    }).catch(() => {
      fallbackCopyText(text, successMsg);
    });
  } else {
    fallbackCopyText(text, successMsg);
  }
}

function fallbackCopyText(text, successMsg) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    showToast(successMsg, "success");
  } catch (e) {
    prompt("Copy this:", text);
  }
  document.body.removeChild(ta);
}

