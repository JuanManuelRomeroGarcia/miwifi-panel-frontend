import { loadTranslations, localize } from "./translations/localize.js?v=__MIWIFI_VERSION__";
import { html, css, LitElement } from "https://unpkg.com/lit@2.7.5/index.js?module";
import { until } from "https://unpkg.com/lit-html@2.7.5/directives/until.js?module";

const MIWIFI_VERSION = "__MIWIFI_VERSION__";
class MiWiFiPanel extends LitElement {

  static properties = {
    hass: {},
    narrow: {},
    isWide: {},
    _currentPage: { state: true },
    _router: { state: true },
    _pagePromise: { state: true },
  };

  constructor() {
    super();
    this._currentPage = "/";
    this._router = null;
    this._pagePromise = null;
    this._lastLoadedPage = null;
    this._translationsLoaded = false;
    this._startAutoRefresh();
    window.addEventListener("miwifi-apply-settings", () => this._applySettings());
  }

  updated(changedProperties) {
    if (changedProperties.has("hass") && this.hass && !this._translationsLoaded) {
      this._translationsLoaded = true;
      loadTranslations(this.hass).then(() => this._loadRouter());
    }

    if (changedProperties.has("hass") && this._pagePromise && this._router) {
      this.requestUpdate();
    }
  }

  async _loadRouter() {
    await loadTranslations(this.hass);
    const module = await import(`./router.js?v=${MIWIFI_VERSION}`);
    this._router = module;
    this._navigate(this._router.currentPath());
    window.addEventListener("miwifi-navigate", (e) => {
      const path = e.detail.path;
      this._navigate(path);
    });
  }

  _navigate(path) {
    if (!this._router) return;
    if (path === this._currentPage && this._pagePromise) return;
    this._currentPage = path;
    this._loadPage(path);
  }

  _applySettings() {
    const panelActiveEl = this.renderRoot.querySelector("#panel_active");
    const speedUnitEl = this.renderRoot.querySelector("#speed_unit");
    const logLevelEl = this.renderRoot.querySelector("#log_level");

    if (!panelActiveEl || !speedUnitEl || !logLevelEl) {
      this._showToast(localize("error.form_elements_not_found"));
      return;
    }

    const panelActive = panelActiveEl.checked;
    const speedUnit = speedUnitEl.value;
    const logLevel = logLevelEl.value;

    this._showToast(localize("settings.applying"));

    this.hass.callService("miwifi", "apply_config", {
      panel_active: panelActive,
      speed_unit: speedUnit,
      log_level: logLevel,
    }).then(() => {
      this._showToast(localize("settings.success"));
      setTimeout(() => {
        this._loadPage("/settings");
      }, 4000);
    }).catch((err) => {
      console.error("❌ Error applying settings:", err);
      this._showToast(localize("settings.error"));
    });
  }

  _showToast(message) {
    this.hass.callService("persistent_notification", "create", {
      message,
      title: "⚙️ MiWiFi",
      notification_id: "miwifi_feedback"
    });
  }

  async _loadPage(path) {
    const PageComponent = this._router.router[path] || this._router.router["/error"];
    this._pagePromise = PageComponent(this.hass);
    this.requestUpdate();
  }

  renderLoading(message = localize("loading.panel")) {
    return html`
      <div class="loading-container">
        <div class="spinner"></div>
        <div class="loading-text">${message}</div>
      </div>
    `;
  }

  _renderVersionWarning() {
    const expectedVersion = MIWIFI_VERSION;
    const actualVersion = window.miwifiPanelVersion || "";
  
    if (actualVersion && actualVersion !== expectedVersion) {
      return html`
        <ha-alert alert-type="warning" title="⚠️ Panel Version Mismatch">
          A new version of the MiWiFi Panel is available.<br />
          <b>Installed:</b> ${actualVersion} — <b>Expected:</b> ${expectedVersion}<br />
          Please <b>press Ctrl+F5</b> to refresh your browser and load the latest version.
        </ha-alert>
      `;
    }
  
    return html``;
  }

  _startAutoRefresh() {
    this._refreshInterval = setInterval(() => {
      const root = this.shadowRoot?.querySelector(".content");
      const isEmpty = !root || root.offsetHeight === 0;

      if (isEmpty) {
        console.warn("⚠️ Panel frozen or blank. Reloading section...");
        this._pagePromise = null;
        this._loadPage(this._currentPage);
      } else {
        console.log("⟳ Refreshing current section...");
        this._pagePromise = null;
        this._loadPage(this._currentPage);
      }
    }, 5 * 60 * 1000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._refreshInterval);
  }

  render() {
    if (!this._pagePromise) return this.renderLoading();

    return html`
      <ha-app-layout>
        <ha-top-app-bar slot="header">
          <div style="display: flex; align-items: center; gap: 10px; padding-left: 16px;">
            <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
            <img src="/local/miwifi/assets/logo.png" class="logo" alt="Logo" />
            <div main-title>XiaoHack Edition</div>
          </div>
        </ha-top-app-bar>

        <div slot="content" class="content">
        ${this._renderVersionWarning()}
          <div class="miwifi-button-group">
            <button class="miwifi-button" @click=${() => this._navigate("/status")}>${localize("nav_status")}</button>
            <button class="miwifi-button" @click=${() => this._navigate("/topologia")}>${localize("nav_topology")}</button>
            <button class="miwifi-button" @click=${() => this._navigate("/miwifi-devices")}>${localize("nav_devices")}</button>
            <button class="miwifi-button" @click=${() => this._navigate("/mesh")}>${localize("nav_mesh")}</button>
            <button class="miwifi-button" @click=${() => this._navigate("/settings")}>${localize("nav_settings")}</button>
          </div>

          ${until(this._pagePromise, this.renderLoading(localize("loading_section")))}
        </div>
      </ha-app-layout>
    `;
  }

  static styles = css`
  :host {
    --miwifi-primary-color: #1a73e8;
    --miwifi-text-color: white;
    --miwifi-border-radius: 12px;
    --miwifi-font-size: 16px;
    --miwifi-padding: 16px;
    display: block;
    background-color: var(--miwifi-primary-color);
    min-height: 100vh;
    overflow-x: hidden;
  }

  .content {
    padding: var(--miwifi-padding);
    animation: fadeIn 0.3s ease-in-out;
    color: var(--miwifi-text-color);
    min-height: calc(100vh - 80px);
    overflow-x: hidden;
    box-sizing: border-box;
  }

  ha-app-layout {
    display: block;
    height: 100%;
    background-color: var(--miwifi-primary-color);
    color: var(--miwifi-text-color);
  }

  .logo {
    height: 36px;
    margin-right: 10px;
  }

  ha-top-app-bar-fixed {
    display: flex;
    align-items: center;
  }

  .miwifi-button-group {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 20px;
    justify-content: center;
  }

  .miwifi-button {
    background: linear-gradient(135deg, #00c6ff 0%, #0072ff 100%);
    color: white;
    border: none;
    border-radius: 30px;
    padding: 10px 20px;
    font-size: 15px;
    font-weight: 600;
    min-width: 140px;
    text-align: center;
    box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.2);
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .miwifi-button:hover {
    transform: translateY(-2px);
    box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.25);
  }

  .miwifi-button:active {
    transform: scale(0.98);
    box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.2);
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 70vh;
    text-align: center;
    color: white;
  }

  .spinner {
    border: 6px solid rgba(255, 255, 255, 0.2);
    border-top: 6px solid white;
    border-radius: 50%;
    width: 60px;
    height: 60px;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
  }

  .loading-text {
    font-size: 20px;
    font-weight: bold;
    animation: pulse 1.5s infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .topo-box {
    width: 270px;
    margin-bottom: 20px;
    display: inline-block;
    text-align: center;
    color: #fff;
  }

  .topo-icon {
    width: 50px;
    height: 50px;
    margin-bottom: 6px;
    border-radius: 8px;
    padding: 5px;
  }

  .topo-icon-lg {
    width: 60px;
    height: 60px;
    margin-bottom: 6px;
    border-radius: 8px;
    padding: 5px;
  }

  .topo-name {
    font-size: 13px;
    font-weight: normal;
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .topo-ip {
    font-size: 12px;
    color: #a9bcd8;
  }

  .line-net {
    display: inline-block;
    width: 4px;
    height: 40px;
    background-color: #0f3;
    margin: 15px 0 5px;
  }

  .line-horizontal {
    height: 4px;
    background-color: #0f3;
    width: 100%;
    max-width: 300px;
    margin-bottom: 20px;
  }

  .branch-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 10px;
  }

  .branch-nodes {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 40px;
  }

  img {
    max-width: 100%;
    height: auto;
    display: block;
  }

  .status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 16px;
    padding: 16px;
  }

  .status-card {
    background: #1a73e8;
    color: white;
    padding: 16px;
    border-radius: 12px;
    text-align: center;
    box-shadow: 0px 4px 8px rgba(0,0,0,0.3);
    animation: fadeIn 0.5s ease;
  }

  .status-value {
    font-size: 22px;
    font-weight: bold;
    margin-bottom: 8px;
  }

  .status-label {
    font-size: 14px;
    color: #d0d0d0;
  }

  .unavailable {
    color: #aaa;
  }

  .section-title {
    font-size: 20px;
    font-weight: bold;
    color:white;
    margin-top: 24px;
    text-align: center;
  }

  .device-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    padding: 16px;
  }

  .device-card {
    background: #1a73e8;
    color: white;
    padding: 16px;
    border-radius: 12px;
    text-align: center;
    box-shadow: 0px 4px 8px rgba(0,0,0,0.3);
    animation: fadeIn 0.5s ease;
  }
  .device-card.disconnected {
    background-color: rgba(255, 255, 255, 0.1);
    color: #bbb;
    filter: grayscale(100%);
  }

  .device-card.disconnected .device-status {
    color: #ff4d4d;
  }

  .device-card.disconnected .device-info {
    color: #999;
  }

  .device-name {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 8px;
  }

  .device-info {
    font-size: 14px;
    margin-bottom: 4px;
    color: #d0d0d0;
  }

  .device-status {
    margin-top: 8px;
    font-weight: bold;
  }

  .online {
    color: #00ff00;
  }

  .offline {
    color: #ff4d4d;
  }

  .text-center {
    text-align: center;
  }

  .section {
    background: #1a73e8;
    color: white;
    padding: 16px;
    margin: 30px;
    border-radius: 12px;
    text-align: center;
    box-shadow: 0px 4px 8px rgba(0,0,0,0.3);
    animation: fadeIn 0.5s ease;
  }

  .setting-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #eee;
  }

  .setting-row:last-child {
    border-bottom: none;
  }

  .switch {
    position: relative;
    display: inline-block;
    width: 42px;
    height: 24px;
  }

  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: 0.4s;
    border-radius: 24px;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
  }

  .switch input:checked + .slider {
    background-color: #03a9f4;
  }

  .switch input:checked + .slider:before {
    transform: translateX(18px);
  }

  .select-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }

  .select-block {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 240px;
  }

  .select-block select {
    padding: 8px;
    border-radius: 8px;
    border: 1px solid #ccc;
    font-size: 14px;
  }

  button.reboot-btn {
    background: #f44336;
    color: white;
    font-weight: bold;
    border: none;
    border-radius: 10px;
    padding: 12px 20px;
    cursor: pointer;
    width: 100%;
    margin-top: 16px;
  }

  button.reboot-btn:hover {
    background: #e53935;
  }

  .panel-header,
  .config-header {
    text-align: center;
    margin-bottom: 28px;
  }

  .config-header img {
    display: inline;
    vertical-align: middle;
    margin-right: 6px;
    filter: drop-shadow(1px 1px 1px rgba(0,0,0,0.3));
  }

  .version-badge {
    background: #1a73e8;
    color: white;
    font-size: 12px;
    padding: 4px 10px;
    border-radius: 8px;
    display: inline-block;
    margin-left: 8px;
  }

  .miwifi-mesh-group {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 40px;
    margin: 20px;
    padding: 0 16px;
  }


  .mesh-card {
    background: #2366d1;
    padding: 16px;
    border-radius: 10px;
    text-align: center;
    box-shadow: 0px 4px 8px rgba(0,0,0,0.3);
    transition: transform 0.3s, box-shadow 0.3s;
    color: white;
    width: auto; 
    max-width: 100%;
  }


  .mesh-card:hover {
    transform: scale(1.01);
    box-shadow: 0px 6px 14px rgba(0,0,0,0.5);
  }

  .mesh-name {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 8px;
  }

  .mesh-info {
    font-size: 14px;
    color: #d0d0d0;
    margin-bottom: 4px;
  }

  .miwifi-issue-link {
      display: inline-block;
      margin-top: 8px;
      padding: 8px 16px;
      color: white;
      background-color: #1a73e8;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
    }

    .miwifi-issue-link:hover {
      background-color: #155ab6;
    }

  @media (max-width: 768px) {
    .miwifi-mesh-group {
      grid-template-columns: 1fr !important;
      padding: 0;
      gap: 16px;
      margin: 0;
    }

    .section {
      padding: 12px;
      margin: 20px 0;
    }

    .select-grid {
      flex-direction: column;
      align-items: stretch;
    }

    .select-block {
      max-width: 100%;
      width: 100%;
    }

    .status-grid,
    .device-grid {
      grid-template-columns: 1fr !important;
      padding: 8px;
    }

    .status-card,
    .device-card {
      width: auto;
    }

    .miwifi-button-group {
      gap: 8px;
      flex-direction: row;
    }

    .miwifi-button {
      min-width: unset;
      width: 90%;
      padding: 10px;
      font-size: 15px;
    }

    .config-header h2 {
      font-size: 18px;
    }
    .disabled-message {
      padding: 2rem;
      text-align: center;
      color: red;
      font-size: 1.2rem;
    }
`;

  
}

customElements.define("miwifi-panel", MiWiFiPanel);
