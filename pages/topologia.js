import { html } from "https://unpkg.com/lit@2.7.5/index.js?module";
import "../components/miwifi-topologia.js?v=__MIWIFI_VERSION__";

export function renderTopologia(hass) {
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
