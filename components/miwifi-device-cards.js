import { LitElement, html, css } from "https://unpkg.com/lit@2.7.5/index.js?module";
import { localize } from "../translations/localize.js?v=__MIWIFI_VERSION__";

class MiWiFiDeviceCards extends LitElement {
  static properties = {
    hass: {},
  };

  render() {
    const devices = Object.values(this.hass.states).filter((state) =>
      state.entity_id.startsWith("device_tracker.miwifi_")
    );

    const grouped = {};
    devices.forEach((device) => {
      const conn = this._getConnectionLabel(device.attributes.connection);
      if (!grouped[conn]) grouped[conn] = [];
      grouped[conn].push(device);
    });

    return html`
      <div class="content text-center">
        <h2>${localize("devices_connected_title")}</h2>
        <p>
          ${localize("devices_total_connected")}: ${devices.length} |
          ${localize("devices_connected")}: ${devices.filter(d => d.state === "home").length}
        </p>

        ${Object.entries(grouped).map(([type, devs]) =>
          html`${this._renderGroup(type, devs)}`
        )}
      </div>
    `;
  }

  _getConnectionLabel(connection) {
    switch ((connection || "").toLowerCase()) {
      case "lan": return "LAN";
      case "2.4g": return "2.4G";
      case "5g": return "5G";
      case "5g_game": return "5G Game";
      case "guest": return "Guest";
      default: return "Unknown";
    }
  }

  _renderGroup(type, devices) {
    return html`
      <div class="section-title">${localize("section_" + type) || type}</div>
      <div class="device-grid">
        ${devices.map((device) => this._renderCard(device))}
      </div>
    `;
  }

  _renderCard(device) {
    const isOffline = device.state !== "home";
    const a = device.attributes;
    return html`
      <div class="device-card ${isOffline ? "disconnected" : ""}">
        <div class="device-name">${a.friendly_name || device.entity_id}</div>
        <div class="device-info">IP: ${a.ip || "-"}</div>
        <div class="device-info">MAC: ${a.mac || "-"}</div>
        <div class="device-info">${localize("status_connected")}: ${!isOffline ? "Sí" : "No"}</div>
        <div class="device-info">Señal: ${a.signal ?? "N/D"}</div>
        <div class="device-info">↓ ${a.down_speed ?? "0 B/s"}</div>
        <div class="device-info">↑ ${a.up_speed ?? "0 B/s"}</div>
        <div class="device-info">Última actividad: ${a.last_activity ?? "-"}</div>
        <div class="device-status ${isOffline ? "offline" : "online"}">
          ${isOffline ? localize("status_disconnected") : localize("status_connected")}
        </div>
      </div>
    `;
  }

  static styles = css`
    .content {
      text-align: center;
      color: white;
    }

    .section-title {
      font-size: 20px;
      font-weight: bold;
      color: white;
      margin-top: 24px;
      text-align: center;
    }

    .device-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
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

    .device-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 8px;
    }

    .device-info {
      font-size: 14px;
      margin-bottom: 4px;
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

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
}

customElements.define("miwifi-device-cards", MiWiFiDeviceCards);
