import { html, css, LitElement } from "https://unpkg.com/lit@2.7.5/index.js?module";
import { until } from "https://unpkg.com/lit-html@2.7.5/directives/until.js?module"; // 👉 IMPORTAR until

const MIWIFI_VERSION = "2.4";

class MiWiFiPanel extends LitElement {
  static properties = {
    hass: {},
    narrow: {},
    isWide: {},
    _currentPage: { state: true },
    _router: { state: true },
  };

  constructor() {
    super();
    this._currentPage = "/";
    this._router = null;
    this._loadRouter();
  }

  async _loadRouter() {
    const module = await import(`./router.js?v=${MIWIFI_VERSION}`);
    this._router = module;
    this._currentPage = this._router.currentPath();
    window.addEventListener("location-changed", () => {
      this._currentPage = this._router.currentPath();
    });
    this.requestUpdate();
  }

  static styles = css`
    ha-app-layout {
      display: block;
      height: 100%;
    }
    .content {
      padding: 16px;
    }
    .button-group {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }
    button {
      padding: 8px 16px;
      font-size: 14px;
      cursor: pointer;
    }
  `;

  render() {
    if (!this._router) {
      return html`<p>Cargando MiWiFi...</p>`;
    }

    const PageComponent = this._router.router[this._currentPage] || this._router.router["/error"];
    const pagePromise = PageComponent(this.hass);

    return html`
      <ha-app-layout>
        <ha-top-app-bar-fixed slot="header">
          <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
          <div main-title>MiWiFi (XiaoHack Edition)</div>
        </ha-top-app-bar-fixed>

        <div class="content">
          <div class="button-group">
            <button @click=${() => this._router.navigate("/topologia")}>🗺️ Topología</button>
            <button @click=${() => this._router.navigate("/dispositivos")}>🖥️ Dispositivos</button>
            <button @click=${() => this._router.navigate("/velocidades")}>🚀 Velocidades</button>
            <button @click=${() => this._router.navigate("/mesh")}>🛰️ Mesh Nodes</button>
            <button @click=${() => this._router.navigate("/settings")}>⚙️ Configuración</button>
          </div>

          ${until(pagePromise, html`<p>Cargando sección...</p>`)}
        </div>
      </ha-app-layout>
    `;
  }
}

customElements.define("miwifi-panel", MiWiFiPanel);
