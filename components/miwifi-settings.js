import { LitElement, html } from "https://unpkg.com/lit@2.7.5/index.js?module";
import { renderToggle, renderSelects, logToBackend } from "../pages/utils.js?v=__MIWIFI_VERSION__";
import { localize } from "../translations/localize.js?v=__MIWIFI_VERSION__";

const MIWIFI_VERSION = "__MIWIFI_VERSION__";
const REPOSITORY = "JuanManuelRomeroGarcia/hass-miwifi";

export class MiWiFiSettingsPanel extends LitElement {
  static properties = {
    hass: {},
    routerSensor: { state: true },
    showDumpModal: { state: true },
    dumpOptions: { state: true },
    isDumpLoading: { state: true },
  };

  constructor() {
    super();
    this.routerSensor = null;
    this.showDumpModal = false;
    this.isDumpLoading = false;
    this.dumpOptions = {
      system: true,
      network: true,
      devices: true,
      nat_rules: true,
      qos: true,
      wifi_config: false,
      hide_sensitive: true,
    };
  }

  createRenderRoot() {
    return this;
  }

  render() {
    if (!this.routerSensor) {
      return html`
        <div class="content" style="text-align:center; margin-top:20px;">
          <p style="font-size: 16px;">❗ ${localize("topology_main_not_found")}</p>
          <p>${localize("nav_topology")}.</p>
        </div>
      `;
    }

    const config = this.hass.states["sensor.miwifi_config"]?.attributes || {};
    const version = MIWIFI_VERSION || "?.?.?";
    const mac = this.routerSensor.attributes.graph.mac.toLowerCase().replace(/:/g, "_");
    const mainGraph = this.routerSensor.attributes.graph;
    const routerIcon = `https://raw.githubusercontent.com/${REPOSITORY}/main/images/${mainGraph.hardware || "default"}.png`;

    const switches = Object.values(this.hass.states).filter((e) =>
      e.entity_id.startsWith("switch.miwifi_" + mac)
    );

    const selects = Object.values(this.hass.states).filter((e) =>
      e.entity_id.startsWith("select.miwifi_" + mac)
    );

    const led = this.hass.states[`light.miwifi_${mac}_led`];
    const reboot = this.hass.states[`button.miwifi_${mac}_reboot`];

    const handleReboot = () => {
      this.hass.callService("button", "press", { entity_id: reboot.entity_id }).catch(console.error);
      this.hass.callService("persistent_notification", "create", {
        title: localize("settings_restart_router"),
        message: localize("settings_restart_router_done"),
        notification_id: "miwifi_reboot_done",
      });
    };

    const clearMain = () => {
      if (confirm(localize("settings_confirm_clear_main"))) {
        this.hass.callService("miwifi", "select_main_router", { mac: "" })
          .then(() => location.reload())
          .catch(console.error);
      }
    };

    const handleDumpService = () => {
      const selected = Object.entries(this.dumpOptions).filter(([k, v]) => v && k !== "hide_sensitive");
      if (selected.length === 0) {
        alert(localize("settings_generate_dump_validation"));
        return;
      }

      this.isDumpLoading = true;

      this.hass.callService("miwifi", "dump_router_data", this.dumpOptions)
        .then(() => {
          this.isDumpLoading = false;
          this.showDumpModal = false;
        })
        .catch(err => {
          this.isDumpLoading = false;
          alert("Error: " + err);
          console.error(err);
        });
    };

    const currentPanel = config.panel_activo ?? true;
    const currentUnit = config.speed_unit || "MB";
    const currentLog = config.log_level || "info";

    return html`
      <div class="content">
        <div class="config-header">
          <img src="/local/miwifi/assets/logo.png" class="logo" alt="Logo" />
          <div main-title>XiaoHack Edition</div>
          <div><span class="version-badge">v${version}</span></div>
          <h2>${localize("settings_router_config")}</h2>
          <div class="topo-box">
            <img src="${routerIcon}" class="topo-icon-lg" />
            <div class="topo-name">${mainGraph.name} (${localize("gateway")})</div>
            <div class="topo-ip">${mainGraph.ip}</div>
            ${!mainGraph.is_main_auto ? html`
              <button class="reboot-btn" style="margin-top:8px" @click=${clearMain}>
                🔄 ${localize("settings_clear_main_router")}
              </button>
            ` : ""}
          </div>
        </div>

        <div class="section">
          <h3>${localize("settings_wifi_switches")}</h3>
          ${switches.map((sw) => renderToggle(this.hass, sw))}
        </div>

        <div class="section">
          <h3>${localize("settings_channels")}</h3>
          ${renderSelects(this.hass, selects)}
        </div>

        <div class="section">
          <h3>${localize("settings_extra")}</h3>
          ${led ? html`<div>${localize("label_led")} ${renderToggle(this.hass, led)}</div>` : ""}
          ${reboot ? html`<button class="reboot-btn" @click=${handleReboot}>${localize("settings_restart_router")}</button>` : ""}
          <button class="reboot-btn" @click=${() => this.hass.callService("miwifi", "download_logs")}>
            📥 ${localize("settings_download_logs")}
          </button>
          <button class="reboot-btn" @click=${() => {
            if (confirm(localize("settings_confirm_clear_logs"))) {
              this.hass.callService("miwifi", "clear_logs")
                .then(() => {
                  this.hass.callService("persistent_notification", "create", {
                    title: localize("clear_logs"),
                    message: localize("clear_logs_done"),
                    notification_id: "miwifi_logs_cleared",
                  });
                });
            }
          }}>🧹 ${localize("settings_clear_logs")}</button>
          <button class="reboot-btn" @click=${() => this.showDumpModal = true}>📄 ${localize("settings_generate_dump")}</button>
        </div>

        ${this.showDumpModal ? html`
          <div class="miwifi-dump-modal-backdrop" @click=${() => !this.isDumpLoading && (this.showDumpModal = false)}>
            <div class="miwifi-dump-modal-window" @click=${(e) => e.stopPropagation()}>
              <h3>${localize("settings_generate_dump")}</h3>
              <div class="modal-form">
                ${this.isDumpLoading
                  ? html`
                      <div class="spinner"></div>
                      <div class="loading-text">${localize("settings_dump_in_progress") || "Collecting data, please wait..."}</div>
                    `
                  : html`
                      ${Object.keys(this.dumpOptions).map((key) => html`
                        <label style="display:block; margin-bottom:6px;">
                          <input type="checkbox"
                            .checked=${this.dumpOptions[key]}
                            @change=${(e) => this.dumpOptions = { ...this.dumpOptions, [key]: e.target.checked }} />
                          ${localize(`service_fields.dump_router_data.${key}`) || key}
                        </label>
                      `)}
                      <button class="miwifi-button" @click=${handleDumpService}>
                        ${localize("settings_generate_dump_confirm")}
                      </button>
                    `
                }
              </div>
            </div>
          </div>
        ` : ""}
      </div>
    `;
  }
}

customElements.define("miwifi-settings", MiWiFiSettingsPanel);
