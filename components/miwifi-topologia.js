import { LitElement, html, css } from "https://unpkg.com/lit@2.7.5/index.js?module";
import { localize } from "../translations/localize.js?v=__MIWIFI_VERSION__";

const REPOSITORY = "JuanManuelRomeroGarcia/hass-miwifi";
const REPOSITORY_PANEL = "JuanManuelRomeroGarcia/miwifi-panel-frontend";
const DEFAULT_MESH_ICON = "https://cdn-icons-png.flaticon.com/512/1946/1946488.png";

export class MiwifiTopologia extends LitElement {
  static properties = {
    data: { type: Object }
  };

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

    .node-connection-wrapper {
        position: relative;
        overflow-x: auto;
        width: 100%;
        padding-bottom: 1rem;
    }

    .node-connection-wrapper ul {
        min-width: 450px;
        display: flex;
        justify-content: center;
        padding-left: 0;
        margin-top: 0.5rem;
    }

    .line-pulse-horizontal {
        height: 2px;
        background-color: #0f3;
        width: 100%;
        animation: pulse 2s infinite;
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
      return html`
        <div class="message">❗ ${localize("topology_main_not_found")}</div>
      `;
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
                <div class="topo-box">
                  <img src="${routerIcon}" class="topo-icon-lg" />
                  <div class="topo-name">${this.data.name} (Gateway)</div>
                  <div class="topo-ip">${this.data.ip}</div>
                </div>
                <div class="line-pulse-vertical"></div>
                ${this.data.leafs?.length
                  ? html`
                      <ul>
                        ${this.data.leafs.map((child) => this._renderNode(child))}
                      </ul>
                    `
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
        <div class="topo-box">
          <img src="${icon}" class="topo-icon" />
          <div class="topo-name">${node.name}</div>
          <div class="topo-ip">${node.ip}</div>
        </div>
      </li>
    `;
  }
}

customElements.define("miwifi-topologia", MiwifiTopologia);
