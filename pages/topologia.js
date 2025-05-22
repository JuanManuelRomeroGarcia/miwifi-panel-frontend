import { html } from "https://unpkg.com/lit@2.7.5/index.js?module";
import "../components/miwifi-topologia.js?v=__MIWIFI_VERSION__";
import { logToBackend } from "./utils.js?v=__MIWIFI_VERSION__";


export function renderTopologia(hass) {
  const sensorIds = Object.keys(hass.states).filter((id) =>
    id.startsWith("sensor.topologia_miwifi")
  );

  let mainGraph = null;

  for (const id of sensorIds) {
    const sensor = hass.states[id];
    const graph = sensor?.attributes?.graph;

    if (graph?.is_main === true) {
      mainGraph = graph;
      logToBackend(hass, "debug", `✅ [topologia.js] Main router detected: ${graph.name} (${graph.mac})`);
      break;
    }

    if (graph?.show === 1 && graph?.assoc === 1) {
      mainGraph = graph;
      logToBackend(hass, "debug", `🧠 [topologia.js] Fallback router by show+assoc: ${graph.name} (${graph.mac})`);
      break;
    }

    if (graph?.mode === 0) {
      mainGraph = graph;
      logToBackend(hass, "debug", `⚠️ [topologia.js] Fallback router by mode=0 only: ${graph.name || id}`);
      break;
    }
  }

  if (!mainGraph) {
    logToBackend(hass, "warning", "❌ [topologia.js] No router found with is_main or fallback logic.");
  }


  const connectedDevices = Object.values(hass.states).filter(
    (e) =>
      e.entity_id.startsWith("device_tracker.miwifi_") &&
      e.state === "home"
  );

  const meshSensors = Object.values(hass.states).filter(
    (s) =>
      s.entity_id.startsWith("sensor.topologia_miwifi") &&
      s.attributes?.graph?.mode === 3
  );
  
  return html`
    <miwifi-topologia
      .data=${mainGraph}
      .devices=${connectedDevices}
      .nodes=${meshSensors}
      .hass=${hass}
    ></miwifi-topologia>
  `;
}
