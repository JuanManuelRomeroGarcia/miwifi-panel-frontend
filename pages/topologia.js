import { html } from "https://unpkg.com/lit@2.7.5/index.js?module";
import "../components/miwifi-topologia.js?v=__MIWIFI_VERSION__";
import { logToBackend } from "./utils.js?v=__MIWIFI_VERSION__";


async function findMainGraph(hass, retries = 3, delay = 500) {
  for (let i = 0; i < retries; i++) {
    const sensor = Object.values(hass.states).find(
      (s) => s.entity_id.startsWith("sensor.miwifi_topology") && s.attributes?.graph?.is_main === true
    );
    if (sensor?.attributes?.graph) return sensor.attributes.graph;
    await new Promise((res) => setTimeout(res, delay));
  }
  return null;
}

export async function renderTopologia(hass) {
  let mainGraph = await findMainGraph(hass);

 // If there is no main router, try fallback logic
  if (!mainGraph) {
    const sensorIds = Object.keys(hass.states).filter((id) =>
      id.startsWith("sensor.miwifi_topology")
    );
    for (const id of sensorIds) {
      const sensor = hass.states[id];
      const graph = sensor?.attributes?.graph;

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
  }

  if (mainGraph) {
    logToBackend(hass, "debug", `✅ [topologia.js] Main router detected: ${mainGraph.name} (${mainGraph.mac})`);
  } else {
    logToBackend(hass, "warning", "❌ [topologia.js] No router found with is_main or fallback logic.");
  }

  const connectedDevices = Object.values(hass.states).filter(
    (e) =>
      e.entity_id.startsWith("device_tracker.miwifi_") &&
      e.state === "home"
  );

  const meshSensors = Object.values(hass.states).filter(
    (s) =>
      s.entity_id.startsWith("sensor.miwifi_topology") &&
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
