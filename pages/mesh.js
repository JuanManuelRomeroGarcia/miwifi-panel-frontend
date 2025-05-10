import { html } from "https://unpkg.com/lit@2.7.5/index.js?module";
import { renderToggle, renderSelects } from "./utils.js?v=__MIWIFI_VERSION__";
import { localize } from "../translations/localize.js?v=__MIWIFI_VERSION__";

const REPOSITORY = "JuanManuelRomeroGarcia/hass-miwifi";
const REPOSITORY_PANEL = "JuanManuelRomeroGarcia/miwifi-panel-frontend";
const DEFAULT_MESH_ICON = "https://cdn-icons-png.flaticon.com/512/1946/1946488.png";

function getConnectionLabel(connection) {
  switch ((connection || "").toLowerCase()) {
    case "lan": return "LAN";
    case "2.4g": return "2.4G";
    case "5g": return "5G";
    case "5g game": return "5G Game";
    case "guest": return "Guest";
    default: return "Unknown";
  }
}

export function renderMesh(hass) {
  const sensorIds = Object.keys(hass.states).filter((id) =>
    id.startsWith("sensor.topologia_miwifi")
  );

  let mainGraph = null;

  for (const id of sensorIds) {
    const sensor = hass.states[id];
    if (sensor && sensor.attributes?.graph && Number(sensor.attributes.graph.mode) === 0) {
      mainGraph = sensor.attributes.graph;
      break;
    }
  }

  if (!mainGraph) {
    return html`
      <div class="content text-center" style="color: #ccc;">
        ❗ ${localize("topology_main_not_found")}
      </div>
    `;
  }

  const meshSensors = Object.values(hass.states).filter(
    (s) =>
      s.entity_id.startsWith("sensor.topologia_miwifi") &&
      s.attributes?.graph?.mode === 3
  );

  return html`
    <div class="content">
      <div class="miwifi-mesh-group">
        ${mainGraph.leafs.map((leaf) => {
          const sensor = meshSensors.find((s) => s.attributes.graph.ip === leaf.ip);
          const mac = sensor?.attributes.graph.mac?.toLowerCase().replace(/:/g, "_");

          const icon = leaf.hardware
            ? `https://raw.githubusercontent.com/${REPOSITORY}/main/images/${leaf.hardware}.png`
            : DEFAULT_MESH_ICON;

          const switches = mac
            ? Object.values(hass.states).filter((e) =>
                e.entity_id.startsWith("switch.miwifi_" + mac)
              )
            : [];

          const selects = mac
            ? Object.values(hass.states).filter((e) =>
                e.entity_id.startsWith("select.miwifi_" + mac)
              )
            : [];

          const led = mac ? hass.states[`light.miwifi_${mac}_led`] : null;
          const reboot = mac ? hass.states[`button.miwifi_${mac}_reboot`] : null;

          const connectedDevices = Object.values(hass.states).filter(
            (e) =>
              e.entity_id.startsWith("device_tracker.miwifi_") &&
              e.state === "home" &&
              e.attributes.router_mac?.toLowerCase() === leaf.mac?.toLowerCase()
          );

          const groupedDevices = {};
          connectedDevices.forEach((device) => {
            const conn = getConnectionLabel(device.attributes.connection);
            if (!groupedDevices[conn]) groupedDevices[conn] = [];
            groupedDevices[conn].push(device);
          });

          return html`
            <div class="mesh-card">
              <img src="${icon}" class="topo-icon" alt="Nodo Mesh" />
              <div class="mesh-name">${leaf.name}</div>
              <div class="mesh-info">
                IP: ${leaf.ip}<br />
                Modelo: ${leaf.hardware}<br />
                Estado: 🟢 Online
              </div>

              ${mac
                ? html`
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
                            <button
                              class="reboot-btn"
                              @click=${() =>
                                hass.callService("button", "press", {
                                  entity_id: reboot.entity_id,
                                })}
                            >
                              ${localize("mesh_node_restart")}
                            </button>
                          `
                        : ""}
                    </div>

                    ${connectedDevices.length > 0
                      ? html`
                          <div class="section">
                            <h3>📶 ${localize("devices_connected_title")}</h3>
                            ${Object.entries(groupedDevices).map(
                              ([type, devs]) => html`
                                <div class="section-title">
                                  ${localize("section_" + type) || type}
                                </div>
                                <div class="device-grid">
                                  ${devs.map((device) => html`
                                    <div class="device-card">
                                      <div class="device-name">${device.attributes.friendly_name}</div>
                                      <div class="device-info">IP: ${device.attributes.ip}</div>
                                      <div class="device-info">MAC: ${device.attributes.mac}</div>
                                      <div class="device-info">Señal: ${device.attributes.signal ?? "N/D"}</div>
                                      <div class="device-info">↓ ${device.attributes.down_speed ?? "0 B/s"}</div>
                                      <div class="device-info">↑ ${device.attributes.up_speed ?? "0 B/s"}</div>
                                    </div>
                                  `)}
                                </div>
                              `
                            )}
                          </div>
                        `
                      : ""}
                  `
                : html`
                    <div class="section">
                      ${localize("mesh_node_not_found")}
                    </div>
                  `}
            </div>
          `;
        })}
      </div>
    </div>
  `;
}
