import { html } from "https://unpkg.com/lit@2.7.5/index.js?module";
import { renderToggle, renderSelects } from "./utils.js?v=__MIWIFI_VERSION__";
import { localize } from "../translations/localize.js?v=__MIWIFI_VERSION__";
import { logToBackend } from "./utils.js?v=__MIWIFI_VERSION__";
import "../components/miwifi-device-node-card.js?v=__MIWIFI_VERSION__";

const REPOSITORY = "JuanManuelRomeroGarcia/hass-miwifi";
const REPOSITORY_PANEL = "JuanManuelRomeroGarcia/miwifi-panel-frontend";
const DEFAULT_MESH_ICON = "https://cdn-icons-png.flaticon.com/512/1946/1946488.png";

export function renderMesh(hass) {
  const sensorIds = Object.keys(hass.states).filter((id) =>
    id.startsWith("sensor.topologia_miwifi")
  );

  let mainGraph = null;

  for (const id of sensorIds) {
    const sensor = hass.states[id];
    const graph = sensor?.attributes?.graph;

    if (graph?.is_main === true) {
      mainGraph = graph;
      logToBackend(hass, "debug", `✅ [mesh.js] Main router detected: ${graph.name} (${graph.mac})`);
      break;
    }

    if (graph?.show === 1 && graph?.assoc === 1) {
      mainGraph = graph;
      logToBackend(hass, "debug", `🧠 [mesh.js] Fallback router by show+assoc: ${graph.name} (${graph.mac})`);
      break;
    }

    if (graph?.mode === 0) {
      mainGraph = graph;
      logToBackend(hass, "debug", `⚠️ [mesh.js] Fallback router by mode=0 only: ${graph.name || id}`);
      break;
    }
  }

  if (!mainGraph) {
    logToBackend(hass, "warning", "❌ [mesh.js] No router found with is_main or fallback logic.");
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

  const normalizeMac = (mac) => mac?.toLowerCase().replace(/[:\-]/g, "");
  const leafs = Array.isArray(mainGraph.leafs) ? mainGraph.leafs : [];

  return html`
    <div class="content">
      <div class="miwifi-mesh-group">
        ${leafs.map((leaf) => {
          try {
            const sensor = meshSensors.find((s) => s.attributes.graph.ip === leaf.ip);
            const leafMac = leaf.mac || sensor?.attributes.graph.mac || "";
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
                normalizeMac(e.attributes.router_mac) === normalizeMac(leafMac)
            );

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

                      <miwifi-device-node-card .hass=${hass} .devices=${connectedDevices}></miwifi-device-node-card>
                    `
                  : html`
                      <div class="section">
                        ${localize("mesh_node_not_found")}
                      </div>
                    `}
              </div>
            `;
          } catch (err) {
            logToBackend(hass, "error", `❌ [mesh.js] Error rendering mesh node '${leaf.name}': ${err.message}`);
            return html`
              <div class="mesh-card">
                <div class="mesh-name">${leaf.name}</div>
                <div class="mesh-info" style="color: red;">
                  ❗ Error loading node data: ${err.message}
                </div>
              </div>
            `;
          }
        })}
      </div>
    </div>
  `;
}