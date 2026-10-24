'use client';

import Script from 'next/script';
import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      <div className="ambient-glow"></div>

      {/* Header */}
      <header className="app-header">
        <div className="header-container">
          <div className="brand">
            <div className="logo-box">
              <img src="/static/img/Netflix.png" alt="Neflix" className="logo-img" />
            </div>
            <div className="brand-text">
              <h1 className="brand-title">Neflix</h1>
            </div>
          </div>
          <div className="header-right-actions">
            {/* Key Indicator Chip (when unlocked) */}
            <button type="button" className="key-status-chip hidden" id="btnKeyStatusChip" title="View or Switch Access Key">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 2l-2 2m-1.5 1.5L12 11l-4-4-5 5 4 4 1-1m8.5-8.5l3 3"></path>
              </svg>
              <span id="keyStatusChipLabel">Key</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main View */}
      <main className="simple-main-wrapper">
        <div className="simple-activation-card">
          {/* Active Key & Remaining Time Indicator Banner */}
          <div className="active-key-banner hidden" id="activeKeyBanner">
            <div className="key-banner-meta">
              <span className="key-banner-badge" id="keyBannerLabel">
                VIP Key
              </span>
              <span className="key-banner-code" id="keyBannerDisplay">
                NF-****-****
              </span>
            </div>
            <div className="key-banner-countdown" id="keyBannerCountdown" title="Remaining Validity">
              <svg className="key-timer-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span className="key-timer-text" id="keyBannerTime">
                --
              </span>
            </div>
          </div>

          {/* Device Segmented Tabs */}
          <div className="device-tabs-bar" role="tablist">
            <button type="button" className="device-tab-btn" data-device="computer" id="tabComputer" role="tab">
              <svg
                className="device-icon tab-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="3" width="20" height="14" rx="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
              <span data-i18n="tabComputer">Computer</span>
            </button>

            <button type="button" className="device-tab-btn" data-device="phone" id="tabPhone" role="tab">
              <svg
                className="device-icon tab-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="5" y="2" width="14" height="20" rx="2.5"></rect>
                <line x1="12" y1="18" x2="12.01" y2="18"></line>
              </svg>
              <span data-i18n="tabPhone">Phone</span>
            </button>

            <button type="button" className="device-tab-btn active" data-device="tv" id="tabTv" role="tab">
              <svg
                className="device-icon tab-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="7" width="20" height="15" rx="2"></rect>
                <polyline points="17 2 12 7 7 2"></polyline>
              </svg>
              <span data-i18n="tabTv">TV</span>
            </button>
          </div>

          {/* Card Body Content */}
          <div className="simple-card-body">
            {/* Primary Action Button: Open Netflix */}
            <a href="#" target="_blank" rel="noopener noreferrer" className="btn-open-netflix disabled" id="btnOpenNetflix">
              <span className="btn-spinner" id="mainBtnSpinner"></span>
              <svg className="btn-play-icon" id="btnPlayIcon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              <span className="btn-label" id="btnOpenLabel" data-i18n="openNetflix">
                Open Netflix
              </span>
            </a>

            {/* Secondary Action Button: New Link */}
            <button type="button" className="btn-new-link disabled" id="btnRefreshLink" title="Draw a new account from pool">
              <span className="btn-spinner hidden" id="refreshBtnSpinner"></span>
              <svg className="btn-refresh-icon" id="btnRefreshIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              <span id="btnRefreshLabel" data-i18n="btnNewLink">
                New Link
              </span>
              <span className="daily-badge" id="dailyQuotaBadge" title="Remaining daily link rotations">
                3/3
              </span>
            </button>

            {/* Dynamic Helper Note */}
            <p className="simple-helper-note" id="simpleHelperNote" data-i18n="helperTv">
              Tap “Open Netflix” to enter your TV screen code directly.
            </p>

            {/* Secondary Controls: QR Code Toggle */}
            <div className="simple-secondary-controls">
              <button type="button" className="control-text-btn" id="btnToggleQr" title="Show QR Code">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                <span data-i18n="btnShowQr">QR Code</span>
              </button>
            </div>

            {/* Collapsible QR Code Drawer */}
            <div className="simple-qr-drawer hidden" id="qrDrawer">
              <div className="qr-drawer-inner">
                <div className="qr-loading-box" id="qrLoadingBox">
                  <span className="qr-pulse-dot"></span>
                  <span className="qr-loading-text" data-i18n="generatingQr">
                    Generating QR Code...
                  </span>
                </div>
                <img src="" alt="QR Code" className="qr-drawer-img hidden" id="qrDrawerImg" />
                <span className="qr-drawer-caption" data-i18n="qrScanHint">
                  Scan with phone camera to open on mobile
                </span>
              </div>
            </div>

            {/* Inline Status/Error Banner */}
            <div className="simple-alert-box hidden" id="simpleAlertBox">
              <span id="simpleAlertMsg"></span>
              <button type="button" className="alert-retry-btn" id="btnAlertRetry" data-i18n="retry">
                Retry
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Private Access Key Gate Overlay */}
      <div className="access-gate-overlay hidden" id="accessGateOverlay">
        <div className="access-gate-card">
          <div className="access-gate-glow"></div>

          <h2 className="access-gate-title" data-i18n="gateTitleMain">
            Private Access Gate
          </h2>
          <p className="access-gate-desc" data-i18n="gateDescMain">
            This service is private. Please enter an authorized access key provided by the administrator to continue.
          </p>

          <form className="access-gate-form" id="gateKeyForm" onSubmit={(e) => e.preventDefault()}>
            <div className="gate-input-wrapper">
              <svg className="gate-key-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 2l-2 2m-1.5 1.5L12 11l-4-4-5 5 4 4 1-1m8.5-8.5l3 3"></path>
              </svg>
              <input
                type="text"
                id="gateKeyInput"
                className="gate-key-input"
                placeholder="NF-XXXX-XXXX-XXXX"
                spellCheck={false}
                autoComplete="off"
                autoFocus
              />
              <button type="button" className="btn-paste-key" id="btnPasteGateKey" title="Paste from clipboard">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                </svg>
              </button>
            </div>

            <div className="gate-error-banner hidden" id="gateKeyError">
              <span id="gateKeyErrorMsg">Invalid access key</span>
            </div>

            <button type="button" className="btn-gate-submit" id="btnSubmitGateKey">
              <span className="btn-spinner hidden" id="gateKeySpinner"></span>
              <span id="gateSubmitLabel" data-i18n="gateSubmit">
                Unlock Access
              </span>
            </button>
          </form>

          <div className="access-gate-footer">
            <p className="gate-contact-admin" data-i18n="gateHint">
              Or contact the administrator for assistance.
            </p>
          </div>
        </div>
      </div>

      {/* Key Details / Switch Key Modal */}
      <div className="key-switch-modal hidden" id="keySwitchModal">
        <div className="key-switch-card">
          <div className="key-switch-header">
            <h3 data-i18n="activeKeyTitle">Active Access Key</h3>
            <button type="button" className="btn-close-modal" id="btnCloseKeySwitch">
              ✕
            </button>
          </div>
          <div className="key-switch-body">
            <div className="active-key-pill" id="activeKeyDisplay">
              NF-****-****
            </div>
            <p className="key-owner-note" id="activeKeyOwner">
              Owner: --
            </p>

            <div className="key-info-stat-box">
              <div className="key-info-stat-row">
                <span className="stat-label" data-i18n="remainingValidity">
                  Remaining Time:
                </span>
                <span className="stat-val stat-val-timer" id="activeKeyRemaining">
                  --
                </span>
              </div>
              <div className="key-info-stat-row" id="activeKeyExpiryRow">
                <span className="stat-label" data-i18n="expiryDate">
                  Expiry Date:
                </span>
                <span className="stat-val" id="activeKeyExpiry">
                  --
                </span>
              </div>
            </div>

            <div className="key-switch-actions">
              <button type="button" className="btn-copy-login" id="btnCopyActiveKey" style={{ marginBottom: '8px' }}>
                <span data-i18n="copyKey">Copy Key</span>
              </button>
              <button type="button" className="btn-copy-login btn-key-logout" id="btnLogoutKey">
                <span data-i18n="switchKey">Log Out / Switch Key</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast notifications */}
      <div className="toast-container" id="toastContainer"></div>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-container">
          <span className="footer-copy">Neflix — 2026</span>
          <span>Auto-Login & TV Activation</span>
          <Link href="/admin" style={{ color: '#888', textDecoration: 'none', marginLeft: '12px' }}>
            Admin
          </Link>
        </div>
      </footer>

      {/* Load core client logic */}
      <Script src="/static/js/app.js?v=2.6" strategy="afterInteractive" />
    </>
  );
}
