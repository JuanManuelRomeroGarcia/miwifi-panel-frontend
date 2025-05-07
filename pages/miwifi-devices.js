import { html } from "https://unpkg.com/lit@2.7.5/index.js?module";
import "../components/miwifi-device-cards.js?v=__MIWIFI_VERSION__";

export function renderDevicesCards(hass) {
  const devices = Object.values(hass.states).filter((state) =>
    state.entity_id.startsWith("device_tracker.miwifi_")
  );

  return html`
    <miwifi-device-cards .hass=${hass} .devices=${devices}></miwifi-device-cards>
  `;
}
