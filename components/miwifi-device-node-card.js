import { LitElement, html, css } from "https://unpkg.com/lit@2.7.5/index.js?module";
import { localize } from "../translations/localize.js?v=__MIWIFI_VERSION__";

class MiWiFiNodeDeviceCard extends LitElement {
  static properties = {
    hass: {},
    devices: { type: Array },
  };

  render() {
    const connected = this.devices?.filter((d) => d.state === "home") ?? [];
    if (!connected.length) return html``;

    const grouped = {};
    connected.forEach((device) => {
      const conn = this._getConnectionLabel(device.attributes.connection);
      if (!grouped[conn]) grouped[conn] = [];
      grouped[conn].push(device);
    });

    return html`
      <div class="section">
        <h3>📶 ${localize("devices_connected_title")}</h3>
        ${Object.entries(grouped).map(([type, devs]) => html`
          <div class="section-title">${localize("section_" + type) || type}</div>
          <div class="device-grid">
            ${devs.map((d) => this._renderCard(d))}
          </div>
        `)}
      </div>
    `;
  }

  _getConnectionLabel(connection) {
    switch ((connection || "").toLowerCase()) {
      case "lan": return "LAN";
      case "2.4g": return "2.4G";
      case "5g": return "5G";
      case "5g game": return "5G Game";
      case "guest": return "Guest";
      default: return "Unknown";
    }
  }

  _renderCard(device) {
    const a = device.attributes;
    return html`
      <div class="device-card">
        <div class="device-name">${a.friendly_name}</div>
        <div class="device-info">IP: ${a.ip}</div>
        <div class="device-info">MAC: ${a.mac}</div>
        <div class="device-info">Señal: ${a.signal ?? "N/D"}</div>
        <div class="device-info">↑ ${a.up_speed ?? "0 B/s"}</div>
        <div class="device-info">↓ ${a.down_speed ?? "0 B/s"}</div>
        <div class="device-info">Última actividad: ${a.last_activity ?? "-"}</div>
      </div>
    `;
  }

  static styles = css`
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

    .device-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 8px;
    }

    .device-info {
      font-size: 14px;
      margin-bottom: 4px;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
}

customElements.define("miwifi-device-node-card", MiWiFiNodeDeviceCard);