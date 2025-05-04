import { html } from "https://unpkg.com/lit@2.7.5/index.js?module";
import { localize } from "../translations/localize.js?v=__MIWIFI_VERSION__";

export function rendermiwifidevices(hass) {
  const devices = Object.values(hass.states).filter((state) =>
    state.entity_id.startsWith("device_tracker.miwifi_")
  );

  const onlineDevices = devices.filter((device) => device.state === "home");
  const offlineDevices = devices.filter((device) => device.state !== "home");

  const renderCard = (device) => {
    const isOffline = device.state !== "home";
    return html`
      <div class="device-card ${isOffline ? "disconnected" : ""}">
        <div class="device-name">${device.attributes.friendly_name || device.entity_id}</div>
        <div class="device-info">IP: ${device.attributes.ip || "-"}</div>
        <div class="device-info">MAC: ${device.attributes.mac || "-"}</div>
        <div class="device-status ${isOffline ? "offline" : "online"}">
          ${isOffline ? localize("status_disconnected") : localize("status_connected")}
        </div>
      </div>
    `;
  };

  return html`
 
    <div class="content text-center">
      <h2>${localize("devices_connected_title")}</h2>
      <p>
        ${localize("devices_total_connected")}: ${devices.length} |
        ${localize("devices_connected")}: ${onlineDevices.length}
      </p>

      <div class="device-grid">
        ${onlineDevices.map(renderCard)}
        ${offlineDevices.map(renderCard)}
      </div>
    </div>
  `;
}