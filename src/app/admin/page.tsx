'use client';

import Script from 'next/script';
import Link from 'next/link';

export default function AdminPage() {
  return (
    <>
      <link rel="stylesheet" href="/static/css/admin.css?v=2.5" />

      {/* Header */}
      <header className="app-header">
        <div className="header-container">
          <div className="header-brand">
            <Link href="/" className="brand-home-link">
              <div className="admin-logo-wrap">
                <img src="/static/img/Netflix.png" alt="XNetflix" className="admin-logo-img" />
              </div>
              <div className="brand-text-block">
                <h1 className="brand-title" data-i18n="adminBrandTitle">
                  XNetflix Admin
                </h1>
              </div>
            </Link>
          </div>

          <div className="header-actions">
            {/* MongoDB Atlas Ready Chip */}
            <div className="vercel-cloud-chip" id="adminVercelChip" title="MongoDB Atlas Connected">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L24 22H0L12 1Z" />
              </svg>
              <span id="adminVercelChipText">Atlas Ready</span>
            </div>

            {/* Logged In User Chip */}
            <div className="user-identity-chip hidden" id="userIdentityChip">
              <span className="chip-dot"></span>
              <span data-i18n="loggedAs">Admin:</span>
              <strong id="loggedUsername">admin</strong>
            </div>

            {/* Live Pool Badge */}
            <div className="pool-live-badge">
              <span className="pool-pulse-dot"></span>
              <span className="pool-badge-label" data-i18n="livePoolBadge">
                Active:
              </span>
              <strong className="pool-badge-num" id="headerPoolCount">
                0
              </strong>
            </div>

            {/* Back to Main Site */}
            <Link href="/" className="admin-nav-btn" id="btnNavHome">
              <span data-i18n="navHome">Main Site</span>
            </Link>

            {/* Logout */}
            <button type="button" className="admin-nav-btn admin-nav-danger hidden" id="btnNavLogout">
              <span data-i18n="navLogout">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="admin-page-container">
        {/* LOGIN VIEW */}
        <section className="admin-login-hero" id="adminLoginSection">
          <div className="admin-auth-card">
            <div className="auth-card-accent"></div>
            <h2 className="admin-auth-title" data-i18n="authCardTitle">
              Admin Authentication
            </h2>
            <p className="admin-auth-desc" data-i18n="authCardSubtitle">
              Enter your credentials to access the control panel
            </p>

            <div className="admin-auth-form">
              <div className="admin-field-group">
                <label className="admin-field-label" htmlFor="adminUserInput">
                  <span data-i18n="userInputLabel">Username</span>
                </label>
                <input
                  type="text"
                  id="adminUserInput"
                  className="admin-auth-input"
                  placeholder="Username"
                  data-i18n-placeholder="userInputPlaceholder"
                  autoComplete="username"
                  autoFocus
                />
              </div>

              <div className="admin-field-group">
                <label className="admin-field-label" htmlFor="adminPassInput">
                  <span data-i18n="passInputLabel">Password</span>
                </label>
                <div className="admin-auth-input-wrap">
                  <input
                    type="password"
                    id="adminPassInput"
                    className="admin-auth-input"
                    placeholder="Password"
                    data-i18n-placeholder="passInputPlaceholder"
                    autoComplete="current-password"
                  />
                  <button type="button" className="btn-toggle-eye" id="btnToggleEye" title="Show / Hide">
                    <span className="eye-label">Show</span>
                  </button>
                </div>
              </div>

              <button type="button" className="btn-primary-action admin-auth-btn" id="btnAdminLogin">
                <span className="spinner" id="adminLoginSpinner"></span>
                <span data-i18n="loginBtn">Access Dashboard</span>
              </button>
            </div>

            <div className="admin-auth-footer">
              <span data-i18n="secureZoneNotice">Encrypted & monitored — authorized administrators only</span>
            </div>
          </div>
        </section>

        {/* DASHBOARD VIEW */}
        <section className="hidden" id="adminDashboardSection">
          {/* Dashboard Header */}
          <div className="admin-dash-header">
            <div className="dash-header-text">
              <h2 data-i18n="dashGreeting">System Overview</h2>
              <p data-i18n="dashSubtitle">Manage cookie pool, test validity, and configure settings</p>
            </div>
            <div className="admin-quick-actions">
              <button type="button" className="admin-action-btn" id="btnQuickTestAll">
                <span id="testAllBtnText" data-i18n="btnTestAll">
                  Test All
                </span>
              </button>
              <button type="button" className="admin-action-btn" id="btnExportBackup">
                <span data-i18n="btnExport">Export Backup</span>
              </button>
              <button type="button" className="admin-action-btn" id="btnQuickRefresh">
                <span data-i18n="refreshBtn">Refresh</span>
              </button>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="admin-metrics-grid">
            <div className="metric-card">
              <div className="metric-accent metric-accent-blue"></div>
              <div className="metric-body">
                <span className="metric-label" data-i18n="metricTotal">
                  Total Accounts
                </span>
                <strong className="metric-value" id="metricTotalVal">
                  0
                </strong>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-accent metric-accent-green"></div>
              <div className="metric-body">
                <span className="metric-label" data-i18n="metricActive">
                  Active
                </span>
                <strong className="metric-value text-green" id="metricActiveVal">
                  0
                </strong>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-accent metric-accent-red"></div>
              <div className="metric-body">
                <span className="metric-label" data-i18n="metricInactive">
                  Inactive / Expired
                </span>
                <strong className="metric-value text-red" id="metricInactiveVal">
                  0
                </strong>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-accent metric-accent-gold"></div>
              <div className="metric-body">
                <span className="metric-label" data-i18n="metricUsage">
                  Total Generations
                </span>
                <strong className="metric-value text-gold" id="metricUsesVal">
                  0
                </strong>
              </div>
            </div>
          </div>

          {/* Health Bar */}
          <div className="pool-health-card">
            <div className="health-header">
              <span data-i18n="healthLabel">Pool Health</span>
              <span id="healthPercentText">0%</span>
            </div>
            <div className="health-progress-bg">
              <div className="health-progress-bar" id="healthProgressBar"></div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <nav className="admin-tabs-nav">
            <button className="admin-tab-button active" data-tab="pane-inventory">
              <span data-i18n="tabInventory">Cookie Pool</span>
              <span className="tab-count" id="tabInventoryBadge">
                0
              </span>
            </button>
            <button className="admin-tab-button" data-tab="pane-add">
              <span data-i18n="tabAdd">Add Cookies</span>
            </button>
            <button className="admin-tab-button" data-tab="pane-keys" id="tabBtnKeys">
              <span data-i18n="tabKeys">Access Keys</span>
              <span className="tab-count" id="tabKeysBadge">
                0
              </span>
            </button>
            <button className="admin-tab-button" data-tab="pane-settings">
              <span data-i18n="tabSettings">Settings</span>
            </button>
          </nav>

          {/* TAB 1: INVENTORY */}
          <div className="admin-tab-pane" id="pane-inventory">
            <div className="admin-content-card">
              <div className="card-title-bar">
                <div>
                  <h3 data-i18n="inventoryTitle">Cookie Pool Inventory</h3>
                  <p className="card-subtitle">Manage all active accounts in the cookie pool</p>
                </div>
                <div className="inv-actions">
                  <button type="button" className="admin-action-btn admin-action-danger" id="btnClearAllPool">
                    <span data-i18n="clearAllBtn">Clear All</span>
                  </button>
                </div>
              </div>

              {/* Bulk Toolbar */}
              <div className="bulk-toolbar hidden" id="bulkToolbar">
                <span className="bulk-selected-count" id="bulkSelectedText">
                  0 selected
                </span>
                <div className="bulk-buttons-group">
                  <button type="button" className="admin-action-btn admin-action-sm" id="btnBulkActivate">
                    Activate
                  </button>
                  <button type="button" className="admin-action-btn admin-action-sm" id="btnBulkDeactivate">
                    Deactivate
                  </button>
                  <button type="button" className="admin-action-btn admin-action-danger admin-action-sm" id="btnBulkDelete">
                    Delete
                  </button>
                </div>
              </div>

              {/* Search & Filter */}
              <div className="table-toolbar">
                <div className="table-filter-group">
                  <input
                    type="text"
                    id="inventorySearch"
                    className="admin-input-field"
                    placeholder="Search by name or ID..."
                    data-i18n-placeholder="searchPlaceholder"
                  />
                  <select id="inventoryStatusFilter" className="admin-select-field">
                    <option value="all" data-i18n="filterAll">
                      All Statuses
                    </option>
                    <option value="active" data-i18n="filterActive">
                      Active Only
                    </option>
                    <option value="inactive" data-i18n="filterInactive">
                      Inactive
                    </option>
                    <option value="expired" data-i18n="filterExpired">
                      Expired
                    </option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="admin-table-wrapper">
                <table className="admin-table" id="adminInventoryTable">
                  <thead>
                    <tr>
                      <th className="th-check">
                        <input type="checkbox" id="selectAllCheckbox" title="Select All" />
                      </th>
                      <th data-i18n="thName">Account</th>
                      <th data-i18n="thFormat">Format</th>
                      <th data-i18n="thStatus">Status</th>
                      <th data-i18n="thUses">Uses</th>
                      <th data-i18n="thAdded">Added</th>
                      <th data-i18n="thOps">Actions</th>
                    </tr>
                  </thead>
                  <tbody id="adminInventoryTableBody"></tbody>
                </table>
              </div>
            </div>
          </div>

          {/* TAB 2: ADD COOKIES */}
          <div className="admin-tab-pane hidden" id="pane-add">
            <div className="admin-content-card">
              <div className="card-title-bar">
                <div>
                  <h3 data-i18n="addTitle">Add New Cookies</h3>
                  <p className="card-subtitle">Import or paste accounts into the active pool</p>
                </div>
                <button type="button" className="admin-action-btn" id="btnImportInput">
                  <span data-i18n="importInputTxtBtn">Import from input.txt</span>
                </button>
              </div>

              <div className="admin-add-form">
                <div className="form-row">
                  <label htmlFor="adminAccountName" data-i18n="accountNameLabel">
                    Account Name (optional)
                  </label>
                  <input
                    type="text"
                    id="adminAccountName"
                    className="admin-input-field"
                    placeholder="e.g. Premium Account #1"
                    data-i18n-placeholder="accountNamePlaceholder"
                  />
                </div>

                <div className="form-row">
                  <div className="label-with-tool">
                    <label htmlFor="adminCookiesText" data-i18n="cookiesTextLabel">
                      Cookie Data
                    </label>
                    <button type="button" className="admin-action-btn admin-action-sm" id="btnClearCookiesText">
                      <span data-i18n="clearTextBtn">Clear</span>
                    </button>
                  </div>

                  <div className="format-detection-bar" id="detectionBar">
                    <span>
                      Format: <strong className="format-detection-badge" id="detectedFormatBadge">None</strong>
                    </span>
                    <span id="detectedCountBadge">0 accounts</span>
                  </div>

                  <textarea
                    id="adminCookiesText"
                    className="admin-textarea"
                    rows={8}
                    placeholder="Paste Netflix cookies here...&#10;Separate multiple accounts with --- on a new line."
                    data-i18n-placeholder="cookiesPlaceholder"
                    spellCheck={false}
                  ></textarea>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-primary-action" id="btnSaveCookies">
                    <span className="spinner" id="saveSpinner"></span>
                    <span data-i18n="saveCookiesBtn">Save to Pool</span>
                  </button>
                </div>

                <div className="helper-banner">
                  <strong data-i18n="addHintTitle">Supported formats:</strong>
                  <p data-i18n="addHintDesc">
                    Netscape, Raw Header String, and JSON Array. Separate multiple accounts with <code>---</code> on a new line.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* TAB 3: ACCESS KEYS */}
          <div className="admin-tab-pane hidden" id="pane-keys">
            {/* Key Gate Master Toggle Card */}
            <div className="admin-content-card" style={{ marginBottom: '24px' }}>
              <div className="key-gate-banner">
                <div className="key-gate-info">
                  <div className="key-gate-text">
                    <h3 data-i18n="gateTitle">Private Access Gate</h3>
                    <p data-i18n="gateSubtitle">
                      When enabled, visitors cannot generate tokens or use the service without entering an admin-authorized access key.
                    </p>
                  </div>
                </div>
                <div className="key-gate-toggle-wrap">
                  <label className="toggle-switch">
                    <input type="checkbox" id="chkRequireKey" defaultChecked />
                    <span className="toggle-slider"></span>
                  </label>
                  <span className="toggle-status-badge badge-active" id="gateStatusBadge">
                    Active / Locked
                  </span>
                </div>
              </div>
            </div>

            {/* Key Metrics Row */}
            <div className="admin-metrics-grid" style={{ marginBottom: '24px' }}>
              <div className="metric-card">
                <div className="metric-accent metric-accent-blue"></div>
                <div className="metric-body">
                  <span className="metric-label" data-i18n="metricTotalKeys">
                    Total Issued Keys
                  </span>
                  <strong className="metric-value" id="metricTotalKeys">
                    0
                  </strong>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-accent metric-accent-green"></div>
                <div className="metric-body">
                  <span className="metric-label" data-i18n="metricActiveKeys">
                    Active Keys
                  </span>
                  <strong className="metric-value text-green" id="metricActiveKeys">
                    0
                  </strong>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-accent metric-accent-gold"></div>
                <div className="metric-body">
                  <span className="metric-label" data-i18n="metricKeyUses">
                    Total Key Activations
                  </span>
                  <strong className="metric-value text-gold" id="metricKeyUses">
                    0
                  </strong>
                </div>
              </div>
            </div>

            {/* Key Generator Card */}
            <div className="admin-content-card" style={{ marginBottom: '24px' }}>
              <div className="card-title-bar">
                <h3>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ verticalAlign: 'middle', marginRight: '6px' }}
                  >
                    <path d="M21 2l-2 2m-1.5 1.5L12 11l-4-4-5 5 4 4 1-1m8.5-8.5l3 3"></path>
                  </svg>
                  <span data-i18n="generateKeyTitle">Generate New Access Key</span>
                </h3>
              </div>

              <div className="admin-add-form">
                <div className="keys-form-grid">
                  <div className="form-row">
                    <label htmlFor="keyLabelInput" data-i18n="keyLabelOwner">
                      Owner / Note (e.g. Client Name)
                    </label>
                    <input type="text" id="keyLabelInput" className="admin-input-field" placeholder="e.g. Ahmed, VIP Member #1" />
                  </div>

                  <div className="form-row">
                    <label htmlFor="keyExpiresSelect" data-i18n="keyLabelExpires">
                      Expiration
                    </label>
                    <select id="keyExpiresSelect" className="admin-select-field">
                      <option value="never">Never (Permanent)</option>
                      <option value="24h">24 Hours (1 Day)</option>
                      <option value="3d">3 Days</option>
                      <option value="7d">7 Days (1 Week)</option>
                      <option value="30d">30 Days (1 Month)</option>
                      <option value="90d">90 Days (3 Months)</option>
                      <option value="1y">1 Year</option>
                      <option value="custom">Custom Date...</option>
                    </select>
                  </div>

                  <div className="form-row hidden" id="customExpiresRow">
                    <label htmlFor="keyCustomExpiresInput">Expiry Date</label>
                    <input type="date" id="keyCustomExpiresInput" className="admin-input-field" />
                  </div>

                  <div className="form-row">
                    <label htmlFor="keyMaxUsesSelect" data-i18n="keyLabelMaxUses">
                      Max Uses / Generations
                    </label>
                    <select id="keyMaxUsesSelect" className="admin-select-field">
                      <option value="unlimited">Unlimited (∞</option>
                      <option value="1">1 Use (Single Activation)</option>
                      <option value="3">3 Uses</option>
                      <option value="5">5 Uses</option>
                      <option value="10">10 Uses</option>
                      <option value="25">25 Uses</option>
                      <option value="50">50 Uses</option>
                    </select>
                  </div>

                  <div className="form-row">
                    <label htmlFor="keyCountSelect" data-i18n="keyLabelCount">
                      Quantity to Generate
                    </label>
                    <select id="keyCountSelect" className="admin-select-field">
                      <option value="1">1 Key</option>
                      <option value="3">3 Keys</option>
                      <option value="5">5 Keys</option>
                      <option value="10">10 Keys</option>
                    </select>
                  </div>

                  <div className="form-row">
                    <label htmlFor="keyCustomCodeInput" data-i18n="keyLabelCustomCode">
                      Custom Code (optional)
                    </label>
                    <input
                      type="text"
                      id="keyCustomCodeInput"
                      className="admin-input-field"
                      placeholder="Leave blank for auto NF-XXXX-XXXX-XXXX"
                    />
                  </div>
                </div>

                <div className="form-actions" style={{ marginTop: '16px' }}>
                  <button type="button" className="btn-primary-action" id="btnGenerateKey">
                    <span className="spinner" id="generateKeySpinner"></span>
                    <span data-i18n="btnCreateKey">+ Create Access Key</span>
                  </button>
                </div>
              </div>

              {/* Newly Created Keys Notification Box */}
              <div className="created-keys-box hidden" id="createdKeysBox">
                <div className="created-keys-header">
                  <span className="created-keys-title">✓ Newly Generated Key(s):</span>
                  <button type="button" className="admin-action-btn admin-action-sm" id="btnCloseCreatedKeys">
                    Dismiss
                  </button>
                </div>
                <div className="created-keys-list" id="createdKeysList"></div>
              </div>
            </div>

            {/* Keys Inventory Table Card */}
            <div className="admin-content-card">
              <div className="card-title-bar">
                <h3 data-i18n="keysDirectoryTitle">Access Keys Directory</h3>
                <div className="inv-actions">
                  <button type="button" className="admin-action-btn admin-action-danger" id="btnClearExpiredKeys">
                    <span data-i18n="cleanExpiredKeysBtn">Clean Expired Keys</span>
                  </button>
                </div>
              </div>

              {/* Search & Filter */}
              <div className="table-toolbar">
                <div className="table-filter-group">
                  <input
                    type="text"
                    id="keysSearchInput"
                    className="admin-input-field"
                    placeholder="Search by key code or note..."
                  />
                  <select id="keysStatusFilter" className="admin-select-field">
                    <option value="all">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="revoked">Revoked / Disabled</option>
                    <option value="expired">Expired / Exhausted</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="admin-table-wrapper">
                <table className="admin-table" id="adminKeysTable">
                  <thead>
                    <tr>
                      <th data-i18n="thKey">Access Key</th>
                      <th data-i18n="thOwner">Owner / Note</th>
                      <th data-i18n="thStatus">Status</th>
                      <th data-i18n="thActivations">Activations</th>
                      <th data-i18n="thExpiration">Expiration</th>
                      <th data-i18n="thCreated">Created</th>
                      <th data-i18n="thOps">Actions</th>
                    </tr>
                  </thead>
                  <tbody id="adminKeysTableBody"></tbody>
                </table>
              </div>
            </div>
          </div>

          {/* TAB 4: SETTINGS */}
          <div className="admin-tab-pane hidden" id="pane-settings">
            <div className="admin-content-card">
              <div className="card-title-bar">
                <h3 data-i18n="settingsTitle">Admin Settings</h3>
              </div>

              <div className="settings-section-block">
                <h4 className="settings-section-title">Credentials</h4>

                <div className="form-row">
                  <label htmlFor="newAdminUserInput" data-i18n="newUsernameLabel">
                    New Username
                  </label>
                  <input type="text" id="newAdminUserInput" className="admin-input-field" placeholder="Minimum 3 characters" />
                </div>

                <div className="form-row">
                  <label htmlFor="newAdminPassInput" data-i18n="newPassLabel">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newAdminPassInput"
                    className="admin-input-field"
                    placeholder="Minimum 4 characters"
                    data-i18n-placeholder="changePassPlaceholder"
                  />
                </div>

                <button type="button" className="btn-primary-action admin-save-creds-btn" id="btnUpdateCredentials">
                  <span className="spinner" id="credSpinner"></span>
                  <span data-i18n="saveCredsBtn">Save Credentials</span>
                </button>

                <div className="settings-divider"></div>

                <h4 className="settings-section-title" data-i18n="systemInfoTitle">
                  System Information
                </h4>
                <div className="system-info-grid">
                  <div className="sys-info-item">
                    <span className="sys-info-label">Server Status</span>
                    <span className="sys-info-value text-green">Online</span>
                  </div>
                  <div className="sys-info-item">
                    <span className="sys-info-label">Framework</span>
                    <span className="sys-info-value text-green">Next.js 14 App Router</span>
                  </div>
                  <div className="sys-info-item">
                    <span className="sys-info-label">Database</span>
                    <span className="sys-info-value text-green" id="sysStorageMode">
                      MongoDB Atlas
                    </span>
                  </div>
                  <div className="sys-info-item">
                    <span className="sys-info-label">Environment</span>
                    <span className="sys-info-value text-green" id="sysEnvironment">
                      Serverless Ready
                    </span>
                  </div>
                  <div className="sys-info-item">
                    <span className="sys-info-label">Active Devices Today</span>
                    <span className="sys-info-value" id="sysActiveDevices">
                      0
                    </span>
                  </div>
                  <div className="sys-info-item">
                    <span className="sys-info-label">Current Admin</span>
                    <span className="sys-info-value" id="sysCurrentAdmin">
                      --
                    </span>
                  </div>
                </div>

                <div className="settings-divider"></div>
                <h4 className="settings-section-title">🍃 MongoDB Atlas &amp; Vercel Cloud Sync</h4>
                <p style={{ fontSize: '0.82rem', color: '#a1a1aa', marginBottom: '0.85rem', lineHeight: 1.5 }}>
                  This site is fully configured with MongoDB Atlas. To deploy to Vercel, simply provide your <code>MONGODB_URI</code> in
                  Vercel Project Settings &gt; Environment Variables.
                </p>

                <div className="settings-actions-row">
                  <button type="button" className="admin-action-btn" id="btnResetDeviceLimits">
                    <span>Reset Device Limits</span>
                  </button>
                  <button type="button" className="admin-action-btn admin-action-danger" id="btnSettingsLogout">
                    <span data-i18n="navLogout">Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Cookie RAW Inspector Modal */}
      <div className="admin-raw-modal hidden" id="rawModal" style={{ display: 'none' }}>
        <div className="admin-raw-card">
          <div className="raw-modal-header">
            <h3 id="rawModalTitle">Raw Cookie Data</h3>
            <button type="button" className="admin-action-btn admin-action-sm" id="btnCloseRawModal">
              Close
            </button>
          </div>
          <textarea id="rawModalText" className="admin-raw-textarea" readOnly></textarea>
          <div className="raw-modal-actions">
            <button type="button" className="admin-action-btn" id="btnCopyRawModal">
              Copy to Clipboard
            </button>
            <button type="button" className="btn-primary-action admin-action-sm" id="btnDoneRawModal">
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification Container */}
      <div className="toast-container" id="toastContainer"></div>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-container">
          <span className="footer-copy">XNetflix Admin Portal — 2026</span>
          <span>For testing & educational purposes only</span>
        </div>
      </footer>

      {/* Load core client logic */}
      <Script src="/static/js/admin.js?v=2.6" strategy="afterInteractive" />
    </>
  );
}
