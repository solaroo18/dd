// ==========================================================================
// XNetflix — Minimalist Auto-Activation Engine (Matching User Mockup)
// ==========================================================================

const translations = {
  tabComputer: "Computer",
  tabPhone: "Phone",
  tabTv: "TV",
  openNetflix: "Open Netflix",
  connecting: "Connecting...",
  helperComputer: 'Tap "Open Netflix" to sign in automatically — no password needed.',
  helperPhone: 'Tap "Open Netflix" to activate on Android or iOS app directly.',
  helperTv: 'Tap “Open Netflix” to enter your TV screen code directly.',
  btnNewLink: "New Link",
  btnShowQr: "QR Code",
  qrScanHint: "Scan with phone camera to open on mobile",
  generatingQr: "Generating QR Code...",
  adminLink: "Admin",
  retry: "Retry",
  noCookies: "No active accounts in pool currently. Please notify administrator.",
  serverError: "Server connection error. Please try again.",
  copyError: "Failed to copy link",
  gateTitleMain: "Private Access Gate",
  gateDescMain: "This service is private. Please enter an authorized access key provided by the administrator to continue.",
  gateSubmit: "Unlock Access",
  gateHint: "Don't have an access key? Contact the administrator to get your pass.",
  keyActive: "Key Active",
  activeKeyTitle: "Active Access Key",
  copyKey: "Copy Key",
  switchKey: "Log Out / Switch Key",
  keyRequiredPrompt: "Please enter your access key to continue",
  keyInvalid: "Access key is invalid or expired",
  keySuccess: "Access key verified successfully! Welcome.",
  keyCopied: "Access key copied to clipboard",
  remainingValidity: "Remaining Time:",
  expiryDate: "Expiry Date:",
  permanentKey: "Permanent (Never expires)",
  expiredKey: "Expired"
};

// Application State
const state = {
  currentDevice: "tv", // default matches user screenshot
  currentLang: "en",
  urls: {
    computer: "",
    phone: "",
    tv: ""
  },
  qrs: {
    computer: "",
    phone: "",
    tv: ""
  },
  token: null,
  accessKey: localStorage.getItem("nftoken_access_key") || "",
  keyInfo: null,
  remainingSeconds: null,
  isPermanent: false,
  timerInterval: null,
  loading: false,
  qrOpen: false,
  dailyQuota: {
    limit: 3,
    used: 0,
    remaining: 3
  }
};

// DOM Elements
let elTabComputer, elTabPhone, elTabTv;
let elBtnOpenNetflix, elMainBtnSpinner, elBtnPlayIcon, elBtnOpenLabel;
let elBtnNewLink, elBtnRefreshLabel, elRefreshBtnSpinner, elBtnRefreshIcon, elDailyQuotaBadge;
let elSimpleHelperNote;
let elBtnToggleQr, elQrDrawer, elQrDrawerImg;
let elSimpleAlertBox, elSimpleAlertMsg, elBtnAlertRetry;
let elBtnToggleLang, elLangLabel;

// Access Gate Elements
let elAccessGateOverlay, elGateKeyInput, elBtnSubmitGateKey, elGateKeySpinner, elGateSubmitLabel, elGateKeyError, elGateKeyErrorMsg, elBtnPasteGateKey;
let elBtnKeyStatusChip, elKeyStatusChipLabel, elKeySwitchModal, elBtnCloseKeySwitch, elActiveKeyDisplay, elActiveKeyOwner, elBtnCopyActiveKey, elBtnLogoutKey;

// Active Key Banner & Timer Elements
let elActiveKeyBanner, elKeyBannerLabel, elKeyBannerDisplay, elKeyBannerCountdown, elKeyBannerTime;
let elActiveKeyRemaining, elActiveKeyExpiry, elActiveKeyExpiryRow;

// Initialization
document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  setupLanguage();
  setupDeviceTabs();
  setupActions();
  setupAccessKeySystem();
});

function cacheElements() {
  elTabComputer = document.getElementById("tabComputer");
  elTabPhone = document.getElementById("tabPhone");
  elTabTv = document.getElementById("tabTv");

  elBtnOpenNetflix = document.getElementById("btnOpenNetflix");
  elMainBtnSpinner = document.getElementById("mainBtnSpinner");
  elBtnPlayIcon = document.getElementById("btnPlayIcon");
  elBtnOpenLabel = document.getElementById("btnOpenLabel");

  elBtnNewLink = document.getElementById("btnRefreshLink");
  elBtnRefreshLabel = document.getElementById("btnRefreshLabel");
  elRefreshBtnSpinner = document.getElementById("refreshBtnSpinner");
  elBtnRefreshIcon = document.getElementById("btnRefreshIcon");
  elDailyQuotaBadge = document.getElementById("dailyQuotaBadge");

  elSimpleHelperNote = document.getElementById("simpleHelperNote");

  elBtnToggleQr = document.getElementById("btnToggleQr");
  elQrDrawer = document.getElementById("qrDrawer");
  elQrDrawerImg = document.getElementById("qrDrawerImg");

  elSimpleAlertBox = document.getElementById("simpleAlertBox");
  elSimpleAlertMsg = document.getElementById("simpleAlertMsg");
  elBtnAlertRetry = document.getElementById("btnAlertRetry");

  elBtnToggleLang = document.getElementById("btnToggleLang");
  elLangLabel = document.getElementById("langLabel");

  // Gate Elements
  elAccessGateOverlay = document.getElementById("accessGateOverlay");
  elGateKeyInput = document.getElementById("gateKeyInput");
  elBtnSubmitGateKey = document.getElementById("btnSubmitGateKey");
  elGateKeySpinner = document.getElementById("gateKeySpinner");
  elGateSubmitLabel = document.getElementById("gateSubmitLabel");
  elGateKeyError = document.getElementById("gateKeyError");
  elGateKeyErrorMsg = document.getElementById("gateKeyErrorMsg");
  elBtnPasteGateKey = document.getElementById("btnPasteGateKey");

  // Key Switch Elements
  elBtnKeyStatusChip = document.getElementById("btnKeyStatusChip");
  elKeyStatusChipLabel = document.getElementById("keyStatusChipLabel");
  elKeySwitchModal = document.getElementById("keySwitchModal");
  elBtnCloseKeySwitch = document.getElementById("btnCloseKeySwitch");
  elActiveKeyDisplay = document.getElementById("activeKeyDisplay");
  elActiveKeyOwner = document.getElementById("activeKeyOwner");
  elBtnCopyActiveKey = document.getElementById("btnCopyActiveKey");
  elBtnLogoutKey = document.getElementById("btnLogoutKey");

  // Active Key Banner & Timer Elements
  elActiveKeyBanner = document.getElementById("activeKeyBanner");
  elKeyBannerLabel = document.getElementById("keyBannerLabel");
  elKeyBannerDisplay = document.getElementById("keyBannerDisplay");
  elKeyBannerCountdown = document.getElementById("keyBannerCountdown");
  elKeyBannerTime = document.getElementById("keyBannerTime");
  elActiveKeyRemaining = document.getElementById("activeKeyRemaining");
  elActiveKeyExpiry = document.getElementById("activeKeyExpiry");
  elActiveKeyExpiryRow = document.getElementById("activeKeyExpiryRow");
}

function t(key) {
  return translations[key] || key;
}

// Language Handling
function setupLanguage() {
  applyLanguage();
}

function applyLanguage() {
  state.currentLang = "en";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";

  // Update all [data-i18n] elements
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key && translations[key]) {
      el.textContent = translations[key];
    }
  });

  updateHelperNote();
  updateOpenButtonLabel();
  renderRemainingTimeUI();
}

// Device Identification — localStorage-based (Layer 4)
function getOrCreateDeviceId() {
  let devId = localStorage.getItem("nftoken_device_id");
  if (!devId || devId.length < 16) {
    devId = "dev_" + "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    localStorage.setItem("nftoken_device_id", devId);
  }
  return devId;
}

// Canvas / Hardware Fingerprint — consistent across incognito & browser sessions (Layer 2)
function generateCanvasFingerprint() {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 280;
    canvas.height = 60;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // Draw text with specific font rendering
    ctx.textBaseline = "alphabetic";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(30, 1, 120, 28);
    ctx.fillStyle = "#069";
    ctx.fillText("Cwm fjord veg", 2, 15);
    ctx.fillStyle = "rgba(102,204,0,0.7)";
    ctx.fillText("quiz, ½ pint.", 4, 45);

    // Draw a unique arc
    ctx.beginPath();
    ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();

    // Get canvas data
    const dataUrl = canvas.toDataURL();

    // Combine with hardware signals for uniqueness
    const signals = [
      dataUrl,
      screen.width + "x" + screen.height,
      screen.colorDepth,
      Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      navigator.hardwareConcurrency || 0,
      navigator.maxTouchPoints || 0,
      navigator.platform || ""
    ];

    // Try adding WebGL renderer info
    try {
      const gl = document.createElement("canvas").getContext("webgl");
      if (gl) {
        const dbg = gl.getExtension("WEBGL_debug_renderer_info");
        if (dbg) {
          signals.push(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "");
        }
      }
    } catch (e) { /* silent */ }

    // Hash using simple djb2
    const raw = signals.join("|");
    let hash = 5381;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) + hash + raw.charCodeAt(i)) >>> 0;
    }
    return hash.toString(36) + "_" + simpleHash(raw);
  } catch (e) {
    return "";
  }
}

function simpleHash(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

// Cache the fingerprint so it's consistent within the session
let _cachedCanvasFP = null;
function getCanvasFingerprint() {
  if (!_cachedCanvasFP) {
    _cachedCanvasFP = generateCanvasFingerprint();
  }
  return _cachedCanvasFP;
}

// Automatic Token Generation
async function autoGenerateToken(isManualRefresh = false) {
  if (state.loading) return;
  state.loading = true;

  hideAlert();
  setLoadingState(true, isManualRefresh);

  try {
    const devId = getOrCreateDeviceId();
    const canvasFP = getCanvasFingerprint();
    const response = await fetch("/api/generate-from-pool", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Device-Id": devId,
        "X-Canvas-FP": canvasFP,
        "X-Access-Key": state.accessKey || ""
      },
      body: JSON.stringify({
        manual_rotate: isManualRefresh
      })
    });

    const data = await response.json();

    if (data.daily_quota) {
      state.dailyQuota = data.daily_quota;
      updateDailyQuotaUI(data.daily_quota);
    }

    if (data.success) {
      state.token = data.token;
      state.urls.computer = data.browse_url || data.login_url;
      state.urls.phone = data.unsupported_url || data.login_url;
      state.urls.tv = data.tv_activation_url || data.login_url;

      state.qrs.computer = data.login_qr || "";
      state.qrs.phone = data.unsupported_qr || data.login_qr || "";
      state.qrs.tv = data.tv_qr || data.login_qr || "";

      setReadyState();

      if (isManualRefresh) {
        const remaining = data.daily_quota ? data.daily_quota.remaining : 0;
        showToast(`New link generated! (${remaining}/3 left today)`, "success");
      }
    } else {
      if (data.limit_reached) {
        showToast(data.error || "Daily limit of 3 new links reached today.", "warning");
        if (state.token) {
          setReadyState();
        } else {
          handleGenerationError(data, response.status);
        }
      } else {
        handleGenerationError(data, response.status);
      }
    }
  } catch (err) {
    console.error("Auto generation failed:", err);
    showAlert(t("serverError"));
    setDisabledState();
  } finally {
    state.loading = false;
    setLoadingState(false, isManualRefresh);
  }
}

function updateDailyQuotaUI(quota) {
  if (!elDailyQuotaBadge) return;
  const remaining = quota && typeof quota.remaining === "number" ? quota.remaining : 3;
  elDailyQuotaBadge.textContent = `${remaining}/3`;
  if (remaining <= 0) {
    elDailyQuotaBadge.classList.add("exhausted");
    elDailyQuotaBadge.title = "Daily rotation limit reached (0/3 left today)";
  } else {
    elDailyQuotaBadge.classList.remove("exhausted");
    elDailyQuotaBadge.title = `${remaining}/3 link rotations left today`;
  }
}

function handleGenerationError(data, status) {
  setDisabledState();
  if (status === 401 || data.key_required) {
    showAccessGate(data.error);
    return;
  }
  if (status === 429) {
    showAlert(data.error || "Rate limit exceeded. Please wait a moment.");
  } else if (data.details && data.details.includes("empty")) {
    showAlert(t("noCookies"));
  } else {
    showAlert(data.error || t("serverError"));
  }
}

function setLoadingState(isLoading, isManual = false) {
  if (isLoading) {
    if (isManual) {
      if (elBtnNewLink) elBtnNewLink.classList.add("loading", "disabled");
      if (elRefreshBtnSpinner) elRefreshBtnSpinner.classList.remove("hidden");
      if (elBtnRefreshIcon) elBtnRefreshIcon.classList.add("hidden");
    } else {
      if (elBtnOpenNetflix) {
        elBtnOpenNetflix.classList.add("loading", "disabled");
        if (elBtnOpenLabel) elBtnOpenLabel.textContent = t("connecting");
      }
      if (elBtnNewLink) elBtnNewLink.classList.add("disabled");
    }
  } else {
    if (elBtnOpenNetflix) {
      elBtnOpenNetflix.classList.remove("loading");
    }
    if (elBtnNewLink) {
      elBtnNewLink.classList.remove("loading");
    }
    if (elRefreshBtnSpinner) elRefreshBtnSpinner.classList.add("hidden");
    if (elBtnRefreshIcon) elBtnRefreshIcon.classList.remove("hidden");
  }
}

function setReadyState() {
  const currentUrl = state.urls[state.currentDevice] || "#";

  if (elBtnOpenNetflix) {
    elBtnOpenNetflix.classList.remove("disabled");
    elBtnOpenNetflix.href = currentUrl;
    updateOpenButtonLabel();
  }

  if (elBtnNewLink) {
    elBtnNewLink.classList.remove("disabled");
  }

  updateHelperNote();
  updateQrDrawerImage();
}

function setDisabledState() {
  if (elBtnOpenNetflix) {
    elBtnOpenNetflix.classList.add("disabled");
    elBtnOpenNetflix.removeAttribute("href");
    updateOpenButtonLabel();
  }
  if (elBtnNewLink) {
    elBtnNewLink.classList.add("disabled");
  }
}

function updateOpenButtonLabel() {
  if (!elBtnOpenLabel) return;
  if (state.loading) {
    elBtnOpenLabel.textContent = t("connecting");
  } else {
    elBtnOpenLabel.textContent = t("openNetflix");
  }
}

function updateHelperNote() {
  if (!elSimpleHelperNote) return;
  let key = "helperTv";
  if (state.currentDevice === "computer") key = "helperComputer";
  else if (state.currentDevice === "phone") key = "helperPhone";

  elSimpleHelperNote.textContent = t(key);
}

function updateQrDrawerImage() {
  if (!elQrDrawerImg) return;
  const qr = state.qrs[state.currentDevice];
  const loadingBox = document.getElementById("qrLoadingBox");
  if (qr) {
    elQrDrawerImg.src = qr;
    elQrDrawerImg.classList.remove("hidden");
    if (loadingBox) loadingBox.classList.add("hidden");
  } else {
    elQrDrawerImg.classList.add("hidden");
    if (loadingBox) loadingBox.classList.remove("hidden");
  }
}

// Device Tabs Switching
function setupDeviceTabs() {
  const tabs = [
    { el: elTabComputer, device: "computer" },
    { el: elTabPhone, device: "phone" },
    { el: elTabTv, device: "tv" }
  ];

  tabs.forEach(({ el, device }) => {
    if (!el) return;
    el.addEventListener("click", () => {
      if (state.currentDevice === device) return;
      selectDevice(device);
    });
  });
}

function selectDevice(device) {
  state.currentDevice = device;

  [elTabComputer, elTabPhone, elTabTv].forEach((tab) => {
    if (tab) tab.classList.remove("active");
  });

  if (device === "computer" && elTabComputer) elTabComputer.classList.add("active");
  if (device === "phone" && elTabPhone) elTabPhone.classList.add("active");
  if (device === "tv" && elTabTv) elTabTv.classList.add("active");

  const url = state.urls[device];
  if (url && elBtnOpenNetflix && !state.loading) {
    elBtnOpenNetflix.href = url;
  }

  updateHelperNote();
  updateQrDrawerImage();
}

// Actions (Open, Refresh, QR)
function setupActions() {
  // Refresh / New Link
  if (elBtnNewLink) {
    elBtnNewLink.addEventListener("click", () => {
      autoGenerateToken(true);
    });
  }

  // Toggle QR Code Drawer
  if (elBtnToggleQr) {
    elBtnToggleQr.addEventListener("click", () => {
      state.qrOpen = !state.qrOpen;
      if (elQrDrawer) {
        elQrDrawer.classList.toggle("hidden", !state.qrOpen);
        if (state.qrOpen) {
          updateQrDrawerImage();
        }
      }
    });
  }

  // Retry Alert Button
  if (elBtnAlertRetry) {
    elBtnAlertRetry.addEventListener("click", () => {
      autoGenerateToken(true);
    });
  }
}

// Alert Message Helper
function showAlert(message) {
  if (!elSimpleAlertBox || !elSimpleAlertMsg) return;
  elSimpleAlertMsg.textContent = message;
  elSimpleAlertBox.classList.remove("hidden");
}

function hideAlert() {
  if (!elSimpleAlertBox) return;
  elSimpleAlertBox.classList.add("hidden");
}

// Toast Notifications
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 300);
  }, 2800);
}

// ==========================================================================
// PRIVATE ACCESS KEY SYSTEM
// ==========================================================================

function setupAccessKeySystem() {
  // Check if access key was provided in URL query string (e.g. ?key=NF-XXXX-XXXX-XXXX)
  const urlParams = new URLSearchParams(window.location.search);
  const keyFromUrl = urlParams.get("key");
  if (keyFromUrl && keyFromUrl.trim()) {
    state.accessKey = keyFromUrl.trim();
    localStorage.setItem("nftoken_access_key", state.accessKey);
    // Remove key parameter from URL without triggering page reload
    const cleanUrl = window.location.pathname + (window.location.hash || "");
    window.history.replaceState({}, document.title, cleanUrl);
  }

  // Setup event listeners
  if (elBtnSubmitGateKey) elBtnSubmitGateKey.addEventListener("click", submitGateKey);
  if (elGateKeyInput) {
    elGateKeyInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") submitGateKey();
    });
  }
  if (elBtnPasteGateKey) elBtnPasteGateKey.addEventListener("click", pasteGateKey);

  // Key Switch Modal & Banner listeners
  if (elBtnKeyStatusChip) elBtnKeyStatusChip.addEventListener("click", openKeySwitchModal);
  if (elActiveKeyBanner) elActiveKeyBanner.addEventListener("click", openKeySwitchModal);
  if (elBtnCloseKeySwitch) elBtnCloseKeySwitch.addEventListener("click", closeKeySwitchModal);
  if (elBtnCopyActiveKey) elBtnCopyActiveKey.addEventListener("click", copyCurrentActiveKey);
  if (elBtnLogoutKey) elBtnLogoutKey.addEventListener("click", logoutAccessKey);

  // Validate current key or check gate status
  validateAccessGate();
}

async function validateAccessGate() {
  try {
    const res = await fetch("/api/access-key/status", {
      headers: {
        "X-Access-Key": state.accessKey || ""
      }
    });
    const data = await res.json();

    if (!data.required) {
      // Key gate disabled by admin - full public access
      hideAccessGate();
      if (elBtnKeyStatusChip) elBtnKeyStatusChip.classList.add("hidden");
      if (elActiveKeyBanner) elActiveKeyBanner.classList.add("hidden");
      autoGenerateToken();
      return;
    }

    if (data.has_valid_key) {
      // User has a valid access key
      state.keyInfo = data.key_info;
      updateKeyStatusChip(data.key_info);
      hideAccessGate();
      autoGenerateToken();
    } else {
      // No key or invalid key - show access gate lock
      showAccessGate(data.error);
    }
  } catch (err) {
    console.error("Access key check failed:", err);
    if (!state.accessKey) {
      showAccessGate();
    } else {
      autoGenerateToken();
    }
  }
}

function showAccessGate(errorMsg = null) {
  if (elAccessGateOverlay) elAccessGateOverlay.classList.remove("hidden");
  if (elActiveKeyBanner) elActiveKeyBanner.classList.add("hidden");
  if (errorMsg) {
    if (elGateKeyErrorMsg) elGateKeyErrorMsg.textContent = errorMsg;
    if (elGateKeyError) elGateKeyError.classList.remove("hidden");
  } else {
    if (elGateKeyError) elGateKeyError.classList.add("hidden");
  }
  if (elGateKeyInput) {
    elGateKeyInput.value = state.accessKey || "";
    setTimeout(() => elGateKeyInput.focus(), 150);
  }
}

function hideAccessGate() {
  if (elAccessGateOverlay) elAccessGateOverlay.classList.add("hidden");
  if (elGateKeyError) elGateKeyError.classList.add("hidden");
}

async function submitGateKey() {
  if (!elGateKeyInput) return;
  const enteredKey = elGateKeyInput.value.trim();

  if (!enteredKey) {
    showGateError(t("keyRequiredPrompt"));
    elGateKeyInput.focus();
    return;
  }

  // Show button spinner
  if (elGateKeySpinner) elGateKeySpinner.classList.remove("hidden");
  if (elBtnSubmitGateKey) elBtnSubmitGateKey.disabled = true;
  if (elGateKeyError) elGateKeyError.classList.add("hidden");

  try {
    const res = await fetch("/api/access-key/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: enteredKey })
    });
    const data = await res.json();

    if (data.success) {
      state.accessKey = data.key;
      state.keyInfo = data;
      localStorage.setItem("nftoken_access_key", data.key);
      updateKeyStatusChip(data);
      hideAccessGate();
      showToast(t("keySuccess"), "success");
      autoGenerateToken();
    } else {
      showGateError(data.error || t("keyInvalid"));
    }
  } catch (err) {
    console.error("Gate verification failed:", err);
    showGateError(t("serverError"));
  } finally {
    if (elGateKeySpinner) elGateKeySpinner.classList.add("hidden");
    if (elBtnSubmitGateKey) elBtnSubmitGateKey.disabled = false;
  }
}

function showGateError(msg) {
  if (elGateKeyErrorMsg) elGateKeyErrorMsg.textContent = msg;
  if (elGateKeyError) {
    elGateKeyError.classList.remove("hidden");
    elGateKeyError.style.animation = "none";
    elGateKeyError.offsetHeight; // trigger reflow
    elGateKeyError.style.animation = "shakeError 0.35s ease";
  }
}

async function pasteGateKey() {
  if (!navigator.clipboard || !navigator.clipboard.readText) {
    if (elGateKeyInput) elGateKeyInput.focus();
    return;
  }
  try {
    const text = await navigator.clipboard.readText();
    if (text && elGateKeyInput) {
      elGateKeyInput.value = text.trim();
      elGateKeyInput.focus();
    }
  } catch (e) {
    if (elGateKeyInput) elGateKeyInput.focus();
  }
}

// -------------------------------------------------------------
// Live Remaining Time Countdown & Active Key UI
// -------------------------------------------------------------

function formatCountdownText(totalSeconds, isPermanent) {
  if (isPermanent) {
    return "Permanent (No Expiry)";
  }
  if (totalSeconds === null || totalSeconds === undefined) {
    return "--";
  }
  if (totalSeconds <= 0) {
    return "Expired";
  }

  const days = Math.floor(totalSeconds / 86400);
  let rem = totalSeconds % 86400;
  const hours = Math.floor(rem / 3600);
  rem = rem % 3600;
  const minutes = Math.floor(rem / 60);
  const seconds = rem % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (days === 0 && minutes > 0) parts.push(`${minutes}m`);
  if (days === 0 && hours === 0) parts.push(`${seconds}s`);
  return "Left: " + (parts.join(" ") || "0s");
}

function startRemainingTimer(keyInfo) {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }

  const timeInfo = keyInfo?.time_info || {};
  state.isPermanent = Boolean(timeInfo.is_permanent || keyInfo?.is_permanent || !keyInfo?.expires_at);

  if (state.isPermanent) {
    state.remainingSeconds = null;
    renderRemainingTimeUI();
    return;
  }

  if (timeInfo.remaining_seconds !== undefined && timeInfo.remaining_seconds !== null) {
    state.remainingSeconds = parseInt(timeInfo.remaining_seconds, 10);
  } else if (keyInfo?.remaining_seconds !== undefined && keyInfo?.remaining_seconds !== null) {
    state.remainingSeconds = parseInt(keyInfo.remaining_seconds, 10);
  } else if (keyInfo?.expires_at) {
    try {
      const expiresMs = new Date(keyInfo.expires_at.replace(" ", "T")).getTime();
      const nowMs = Date.now();
      state.remainingSeconds = Math.max(0, Math.floor((expiresMs - nowMs) / 1000));
    } catch (e) {
      state.remainingSeconds = null;
    }
  } else {
    state.remainingSeconds = null;
  }

  renderRemainingTimeUI();

  if (state.remainingSeconds !== null && state.remainingSeconds > 0) {
    state.timerInterval = setInterval(() => {
      if (state.remainingSeconds !== null && state.remainingSeconds > 0) {
        state.remainingSeconds -= 1;
        renderRemainingTimeUI();
      } else {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
        renderRemainingTimeUI();
      }
    }, 1000);
  }
}

function renderRemainingTimeUI() {
  const timeText = formatCountdownText(state.remainingSeconds, state.isPermanent);

  // 1. Update Main Card Banner
  if (elActiveKeyBanner) {
    if (state.accessKey) {
      elActiveKeyBanner.classList.remove("hidden");
    } else {
      elActiveKeyBanner.classList.add("hidden");
    }
  }
  if (elKeyBannerLabel) {
    elKeyBannerLabel.textContent = state.keyInfo?.label || "VIP";
  }
  if (elKeyBannerDisplay) {
    const rawKey = state.accessKey || (state.keyInfo?.key || "");
    elKeyBannerDisplay.textContent = rawKey ? `${rawKey.slice(0, 10)}...` : "NF-****";
  }
  if (elKeyBannerTime) {
    elKeyBannerTime.textContent = timeText;
  }

  // 2. Update Header Status Chip
  if (elBtnKeyStatusChip) {
    if (state.accessKey) {
      elBtnKeyStatusChip.classList.remove("hidden");
    } else {
      elBtnKeyStatusChip.classList.add("hidden");
    }
  }
  if (elKeyStatusChipLabel) {
    const label = state.keyInfo?.label || "Key";
    elKeyStatusChipLabel.textContent = `${label} • ${timeText}`;
  }

  // 3. Update Modal remaining info if modal is open
  if (elActiveKeyRemaining) {
    elActiveKeyRemaining.textContent = timeText;
  }
  if (elActiveKeyExpiry) {
    if (state.isPermanent) {
      elActiveKeyExpiry.textContent = "Never (Permanent)";
    } else {
      elActiveKeyExpiry.textContent = state.keyInfo?.expires_at || "--";
    }
  }
}

function updateKeyStatusChip(keyInfo) {
  state.keyInfo = keyInfo || state.keyInfo;
  startRemainingTimer(state.keyInfo);
  renderRemainingTimeUI();
}

function openKeySwitchModal() {
  if (!elKeySwitchModal) return;
  if (elActiveKeyDisplay) elActiveKeyDisplay.textContent = state.accessKey || "NF-****-****";
  if (elActiveKeyOwner) {
    const label = state.keyInfo?.label || "General";
    const uses = state.keyInfo?.used_count !== undefined ? ` • Activations: ${state.keyInfo.used_count}` : "";
    elActiveKeyOwner.textContent = `Owner: ${label}${uses}`;
  }
  renderRemainingTimeUI();
  elKeySwitchModal.classList.remove("hidden");
}

function closeKeySwitchModal() {
  if (elKeySwitchModal) elKeySwitchModal.classList.add("hidden");
}

function copyCurrentActiveKey() {
  if (!state.accessKey) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(state.accessKey).then(() => {
      showToast(t("keyCopied"), "success");
    });
  } else {
    prompt("Copy Key:", state.accessKey);
  }
}

function logoutAccessKey() {
  state.accessKey = "";
  state.keyInfo = null;
  state.remainingSeconds = null;
  state.isPermanent = false;
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  localStorage.removeItem("nftoken_access_key");
  closeKeySwitchModal();
  if (elBtnKeyStatusChip) elBtnKeyStatusChip.classList.add("hidden");
  if (elActiveKeyBanner) elActiveKeyBanner.classList.add("hidden");
  setDisabledState();
  showAccessGate();
  showToast("Logged out of access key", "info");
}

