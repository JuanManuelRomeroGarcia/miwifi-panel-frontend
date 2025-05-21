// ✅ miwifi-topologia.js actualizado con conteo desde sensores
import { LitElement, html, css } from "https://unpkg.com/lit@2.7.5/index.js?module";
import { localize } from "../translations/localize.js?v=__MIWIFI_VERSION__";
import { navigate } from "../router.js?v=__MIWIFI_VERSION__";

const REPOSITORY = "JuanManuelRomeroGarcia/hass-miwifi";
const REPOSITORY_PANEL = "JuanManuelRomeroGarcia/miwifi-panel-frontend";
const DEFAULT_MESH_ICON = "https://cdn-icons-png.flaticon.com/512/1946/1946488.png";

export class MiwifiTopologia extends LitElement {
  static properties = {
    data: { type: Object },
    devices: { type: Array },
    nodes: { type: Array },
    hass: { type: Object },
  };

  _getMacForNode(ip) {
    return this.nodes?.find((s) => s.attributes?.graph?.ip === ip)?.attributes?.graph?.mac ?? null;
  }

  _getDeviceCountFromSensor(mac) {
    if (!mac) return "0";
    const id = `sensor.miwifi_${mac.toLowerCase().replace(/:/g, "_")}_devices`;
    return this.hass?.states?.[id]?.state ?? "0";
  }

  static styles = css`
    :host {
      display: block;
      padding: 2rem;
      color: white;
      background-color: #1a73e8;
      font-family: 'Segoe UI', sans-serif;
      text-align: center;
    }
    h2 {
      margin-bottom: 2rem;
    }
    .topo-box {
      display: inline-block;
      margin: 1rem;
      text-align: center;
      transition: transform 0.3s ease;
    }
    .topo-box:hover {
      transform: scale(1.05);
    }
    .topo-icon {
      width: 50px;
      height: 50px;
    }
    .topo-icon-lg {
      width: 90px;
      height: 90px;
    }
    .topo-name {
      font-weight: bold;
      margin-top: 0.5rem;
    }
    .topo-ip {
      font-size: 0.9rem;
      color: #e0e0e0;
    }
    .message {
      color: #eee;
      font-size: 1.2rem;
    }
    .tree, .tree ul {
      padding-top: 20px;
      position: relative;
    }
    .tree ul {
      display: flex;
      justify-content: center;
      padding-left: 0;
      flex-wrap: wrap;
    }
    .tree li {
      list-style-type: none;
      text-align: center;
      position: relative;
      padding: 15px 0px 0 0px;
    }
    .tree li::before,
    .tree li::after {
      content: '';
      position: absolute;
      top: 0;
      width: 50%;
      height: 20px;
      border-top: 2px solid #0f3;
    }
    .tree li::before {
      left: 0;
      border-right: 2px solid #0f3;
    }
    .tree li::after {
      right: 0;
      border-left: 2px solid #0f3;
    }
    .tree li:only-child::before,
    .tree li:only-child::after {
      display: none;
    }
    .tree li:only-child {
      padding-top: 0;
    }
    .tree li:first-child::before,
    .tree li:last-child::after {
      border: 0 none;
    }
    .tree li:last-child::before {
      border-right: 2px solid #0f3;
      border-radius: 0 5px 0 0;
    }
    .tree li:first-child::after {
      border-left: 2px solid #0f3;
      border-radius: 5px 0 0 0;
    }
    .line-pulse-vertical {
      width: 2px;
      height: 20px;
      background-color: #0f3;
      margin: 0 auto;
      animation: pulse 2s infinite;
    }
    .topo-icon-container {
      position: relative;
      display: inline-block;
    }
    .device-count-badge {
      position: absolute;
      top: -6px;
      right: -6px;
      background: red;
      color: white;
      font-size: 12px;
      font-weight: bold;
      border-radius: 50%;
      padding: 4px 7px;
      box-shadow: 0 0 4px rgba(0,0,0,0.3);
    }
    @keyframes pulse {
      0%, 100% {
        background-color: #0f3;
      }
      50% {
        background-color: #0b0;
      }
    }
    @media (max-width: 600px) {
      .tree ul {
        flex-wrap: nowrap;
        overflow-x: auto;
        padding-left: 0;
        margin: 0;
        gap: 0;
      }
      .topo-box {
        margin: 0.5rem;
        transform: scale(0.85);
      }
    }
  `;

  render() {
    if (!this.data) {
      return html`<div class="message">❗ ${localize("topology_main_not_found")}</div>`;
    }

    const routerIcon = this.data.hardware
      ? `https://raw.githubusercontent.com/${REPOSITORY}/main/images/${this.data.hardware}.png`
      : DEFAULT_MESH_ICON;

    const internetIcon = `https://raw.githubusercontent.com/${REPOSITORY_PANEL}/main/assets/icon_internet.png`;

    return html`
      <h2>${localize("topology_router_network")}</h2>
      <div class="tree">
        <ul>
          <li>
            <div class="topo-box">
              <img src="${internetIcon}" class="topo-icon" />
              <div class="topo-name">Internet</div>
            </div>
            <div class="line-pulse-vertical"></div>
            <ul>
              <li>
                <div class="topo-box" style="cursor: pointer;" @click=${() => navigate("/settings")}>
                  <div class="topo-icon-container">
                    <img src="${routerIcon}" class="topo-icon-lg" />
                    <div class="device-count-badge">
                      ${this._getDeviceCountFromSensor(this.data.mac)}
                    </div>
                  </div>
                  <div class="topo-name">${this.data.name} (Gateway)</div>
                  <div class="topo-ip">${this.data.ip}</div>
                </div>
                <div class="line-pulse-vertical"></div>
                ${this.data.leafs?.length
                  ? html`<ul>
                      ${this.data.leafs.map((child) => this._renderNode(child))}
                    </ul>`
                  : ""}
              </li>
            </ul>
          </li>
        </ul>
      </div>
    `;
  }

  _renderNode(node) {
    const icon = node.hardware
      ? `https://raw.githubusercontent.com/${REPOSITORY}/main/images/${node.hardware}.png`
      : DEFAULT_MESH_ICON;

    return html`
      <li>
        <div class="topo-box" style="cursor: pointer;" @click=${() => navigate("/mesh")}>
          <div class="topo-icon-container">
            <img src="${icon}" class="topo-icon" />
            <div class="device-count-badge">
              ${this._getDeviceCountFromSensor(this._getMacForNode(node.ip))}
            </div>
          </div>
          <div class="topo-name">${node.name}</div>
          <div class="topo-ip">${node.ip}</div>
        </div>
      </li>
    `;
  }
}

customElements.define("miwifi-topologia", MiwifiTopologia);
