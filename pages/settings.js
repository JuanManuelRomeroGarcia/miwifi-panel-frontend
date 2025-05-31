import { html } from "https://unpkg.com/lit@2.7.5/index.js?module";
import { renderToggle, renderSelects } from "./utils.js?v=__MIWIFI_VERSION__";
import { localize } from "../translations/localize.js?v=__MIWIFI_VERSION__";
import { logToBackend } from "./utils.js?v=__MIWIFI_VERSION__";

const MIWIFI_VERSION = "__MIWIFI_VERSION__";
const REPOSITORY = "JuanManuelRomeroGarcia/hass-miwifi";
const REPOSITORY_PANEL = "JuanManuelRomeroGarcia/miwifi-panel-frontend";

export function renderSettings(hass) {
  const version = MIWIFI_VERSION || "?.?.?";
  const config = hass.states["sensor.miwifi_config"]?.attributes || {};

  const routerSensor = Object.values(hass.states).find((s) => {
    const g = s.attributes?.graph;
    return g?.is_main === true;
  });

  if (!routerSensor) {
    logToBackend(hass, "warning", "❌ [settings.js] No router found with is_main or fallback logic.");
    return html`
      <div class="content" style="text-align:center; margin-top:20px;">
        <p style="font-size: 16px;">❗ ${localize("topology_main_not_found")}</p>
        <p>${localize("nav_topology")}.</p>
      </div>
    `;
  }

  const mac = routerSensor.attributes.graph.mac.toLowerCase().replace(/:/g, "_");
  const mainGraph = routerSensor.attributes.graph;
  const routerIcon = `https://raw.githubusercontent.com/${REPOSITORY}/main/images/${mainGraph.hardware || "default"}.png`;

  const switches = Object.values(hass.states).filter((e) =>
    e.entity_id.startsWith("switch.miwifi_" + mac)
  );

  const selects = Object.values(hass.states).filter((e) =>
    e.entity_id.startsWith("select.miwifi_" + mac)
  );

  const led = hass.states[`light.miwifi_${mac}_led`];
  const reboot = hass.states[`button.miwifi_${mac}_reboot`];

  const handleReboot = () => {
    hass.callService("button", "press", { entity_id: reboot.entity_id }).catch((err) =>
      console.error("callService error:", err)
    );
    logToBackend(hass, "info", `🔄 [settings.js] Reboot requested for router: ${mainGraph.name} (${mainGraph.mac})`);
    hass.callService("persistent_notification", "create", {
      title: localize("settings_restart_router"),
      message: "El router principal ha sido reiniciado correctamente.",
      notification_id: "miwifi_reboot_done",
    }).catch((err) => console.error("callService error:", err));
  };

  const clearMain = () => {
    const confirmMsg = localize("settings_confirm_clear_main") || "Do you want to clear manual main router selection?";
    if (confirm(confirmMsg)) {
      hass.callService("miwifi", "select_main_router", { mac: "" })
        .then(() => location.reload())
        .catch((err) => console.error("Failed to clear main router:", err));
    }
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
          <div class="topo-name">${mainGraph.name} (Gateway)</div>
          <div class="topo-ip">${mainGraph.ip}</div>
          <button class="reboot-btn" style="margin-top:8px" @click=${clearMain}>
            🔄 ${localize("settings_clear_main_router")}
          </button>
        </div>
      </div>

      <div class="section">
        <h3>${localize("settings_wifi_switches")}</h3>
        ${switches.map((sw) => renderToggle(hass, sw))}
      </div>

      <div class="section">
        <h3>${localize("settings_channels")}</h3>
        ${renderSelects(hass, selects)}
      </div>

      <div class="section">
        <h3>${localize("settings_extra")}</h3>
        ${led ? renderToggle(hass, led) : ""}
        ${reboot
          ? html`
              <button class="reboot-btn" @click=${handleReboot}>
                ${localize("settings_restart_router")}
              </button>
            `
          : ""}
      </div>

      <div class="config-header">
        <h2>${localize("settings_integration_config")}</h2>
      </div>

      <div class="section">
        <h3>${localize("settings_integration_options")}</h3>

        <div class="setting-row">
          <span>${localize("setting_panel_active")}</span>
          <label class="switch">
            <input type="checkbox" id="panel_active" .checked=${currentPanel} />
            <span class="slider"></span>
          </label>
        </div>

        <div class="select-block">
          <label>${localize("setting_speed_unit")}</label>
          <select id="speed_unit">
            ${["Mbps", "B/s"].map(unit => html`
              <option value="${unit}" ?selected=${unit === currentUnit}>${unit}</option>
            `)}
          </select>
        </div>

        <div class="select-block">
          <label>${localize("setting_log_level")}</label>
          <select id="log_level">
            ${["debug", "info", "warning"].map(level => html`
              <option value="${level}" ?selected=${level === currentLog}>${level}</option>
            `)}
          </select>
        </div>

        <div style="margin-top: 20px;">
          <button class="reboot-btn" @click=${() => {
              const confirmMsg = localize("settings_confirm_restart") || "Are you sure you want to apply the changes? This will temporarily restart the MiWiFi integration.";
              if (confirm(confirmMsg)) {
                const event = new CustomEvent("miwifi-apply-settings", {
                  bubbles: true,
                  composed: true,
                });
                window.dispatchEvent(event);
                logToBackend(hass, "info", "⚙️ [settings.js] User clicked 'Apply changes' in panel.");
              }
            }}>
              💾 ${localize("settings_apply_changes") || "Apply changes"}
            </button>
        </div>
      </div>

      <div class="section">
        <h2>${localize("settings_integration_title")}</h2>
        <div style="margin-top: 16px;">
          <a
            class="miwifi-issue-link"
            href="https://github.com/${REPOSITORY_PANEL}/issues/new?title=[MiWiFi%20Panel%20Feedback]"
            target="_blank"
            rel="noopener"
          >
            💬 ${localize("settings_feedback_button")}
          </a>
        </div>
      </div>
    </div>
  `;
}
