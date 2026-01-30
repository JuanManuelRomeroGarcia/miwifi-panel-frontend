import { LitElement, html, css } from "https://unpkg.com/lit@2.7.5/index.js?module";
import { localize } from "../translations/localize.js?v=__MIWIFI_VERSION__";

class MiWiFiDeviceCards extends LitElement {
  static properties = {
    hass: {},
    _showOffline: { state: true },
  };

  constructor() {
    super();
    this._showOffline = false;
  }

  render() {
    const all = Object.values(this.hass?.states || {}).filter((s) =>
      String(s?.entity_id || "").startsWith("device_tracker.miwifi_")
    );

    const st = (d) => String(d.state || "").toLowerCase();
    const disconnected = all.filter((d) => ["not_home", "unknown", "unavailable"].includes(st(d)));
    const connected = all.filter((d) => st(d) === "home");

    const topo = this._getTopologyInfo();
    const breakdown = this._buildNodeBreakdown(connected, topo);

    // Agrupar SOLO conectados por tipo de conexión
    const grouped = {};
    for (const device of connected) {
      const key = this._getConnectionKey(device.attributes?.connection);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(device);
    }

    const breakdownText = (breakdown.perNode || [])
      .map((n) => `${n.name}: ${n.count}`)
      .join(" | ");

    const totalDevices = all.length;
    const totalConnected = connected.length;

    return html`
      <div class="content">
        <h2>${localize("devices_connected_title")}</h2>

        <div class="counts">
          ${localize("devices_total") || localize("devices_total_connected")}: <strong>${totalDevices}</strong>
          &nbsp;|&nbsp; ${localize("devices_connected")}: <strong>${totalConnected}</strong>
          &nbsp;|&nbsp; ${localize("badge_main")}: <strong>${breakdown.mainCount}</strong>
          &nbsp;|&nbsp; ${localize("badge_mesh")}: <strong>${breakdown.meshCount}</strong>
        </div>

        ${breakdownText ? html`<div class="counts-sub">${breakdownText}</div>` : ""}

        ${Object.entries(grouped).map(([key, devs]) =>
          this._renderGroup(key, devs, topo, breakdown)
        )}

        <div class="offline-toggle">
          <button class="miwifi-button" @click=${this._toggleOffline}>
            ${this._showOffline
              ? (localize("toggle_offline_hide") || "Hide offline devices")
              : (localize("toggle_offline_show") || "Show offline devices")}
            ${disconnected.length ? html` <span class="pill">${disconnected.length}</span>` : ""}
          </button>
        </div>

        ${this._showOffline && disconnected.length
          ? html`
              <div class="section-title" style="margin-top: 18px;">
                 ${localize("status_disconnected") || localize("toggle_offline_show") || "Offline devices"}
              </div>
              <div class="device-grid">
                ${disconnected.map((device) => this._renderCard(device, topo, breakdown))}
              </div>
            `
          : ""}
      </div>
    `;
  }

  _toggleOffline() {
    this._showOffline = !this._showOffline;
    this.requestUpdate();
  }

  _normalizeMac(mac) {
    if (!mac) return "";
    return String(mac).trim().toLowerCase();
  }

  _getTopologyInfo() {
    const routersByMac = {};
    let mainMac = "";
    let mainName = "";

    const states = Object.values(this.hass?.states || {});
    for (const s of states) {
      const eid = String(s?.entity_id || "");
      if (!eid.startsWith("sensor.miwifi_topology")) continue;

      const g = s.attributes?.graph;
      if (!g) continue;

      const gMac = this._normalizeMac(g.mac);
      if (gMac) routersByMac[gMac] = (g.name || g.locale || gMac);

      if (g.is_main === true) {
        mainMac = gMac || mainMac;
        mainName = (g.name || g.locale || mainName || "Main");
      }
    }

    return { mainMac, mainName, routersByMac };
  }

  _getViaMac(device) {
    const a = device?.attributes || {};
    return this._normalizeMac(a.connected_via_router_mac || a.router_mac || "");
  }

  _getViaEntryId(device) {
    const a = device?.attributes || {};
    return String(a.connected_via_entry_id || a.updater_entry_id || "").trim();
  }

  _buildNodeBreakdown(connectedDevices, topo) {
    const counts = new Map(); // entryId -> count
    const entryIdToViaMac = new Map(); // entryId -> viaMac (primero que encontremos)

    for (const dev of connectedDevices) {
      const entryId = this._getViaEntryId(dev) || "unknown";
      counts.set(entryId, (counts.get(entryId) || 0) + 1);

      if (!entryIdToViaMac.has(entryId)) {
        entryIdToViaMac.set(entryId, this._getViaMac(dev));
      }
    }

    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

    // 1) MAIN por mac real del router (topo.mainMac) si se puede
    let mainEntryId = "";
    if (topo?.mainMac) {
      for (const [entryId] of sorted) {
        const viaMac = entryIdToViaMac.get(entryId);
        if (viaMac && viaMac === topo.mainMac) {
          mainEntryId = entryId;
          break;
        }
      }
    }

    // 2) fallback: el más frecuente
    if (!mainEntryId) mainEntryId = sorted[0]?.[0] || "";

    let mainCount = 0;
    let meshCount = 0;

    const perNode = sorted.map(([entryId, count], idx) => {
      const isMain = mainEntryId && entryId === mainEntryId;
      if (isMain) mainCount += count;
      else meshCount += count;

      // Nombre de nodo:
      // - main => topo.mainName
      // - mesh => por mac del nodo si la tenemos, o fallback Mesh N
      const viaMac = entryIdToViaMac.get(entryId) || "";
      const viaName = (topo?.routersByMac && viaMac && topo.routersByMac[viaMac]) ? topo.routersByMac[viaMac] : "";

      const name = isMain
        ? (topo?.mainName || "Main")
        : (viaName || `Mesh ${Math.max(1, idx)}`);

      return { entryId, count, name, isMain, viaMac };
    });

    return { mainEntryId, mainCount, meshCount, perNode };
  }

  _getConnectionKey(connection) {
    const c = String(connection || "").toLowerCase().trim();
    if (c === "lan") return "lan";
    if (c === "2.4g" || c === "2.4" || c.includes("2.4")) return "g24";
    if (c === "5g game" || c === "game" || c.includes("game")) return "g5_game";
    if (c === "5g" || c.includes("5g")) return "g5";
    if (c === "guest") return "guest";
    return "unknown";
  }

  _getConnectionTitle(key) {
    // Keys nuevas (las añadimos al i18n luego)
    const map = {
      lan: localize("section_LAN") || "LAN",
      g24: localize("section_2.4G") || "2.4G",
      g5: localize("section_5G") || "5G",
      g5_game: localize("section_5G Game") || "5G Game",
      guest: localize("section_Guest") || "Guest",
      unknown: localize("section_Unknown") || "Unknown",
    };
    return map[key] || key;
  }

  _translateSignalQuality(quality) {
    switch (quality) {
      case "very_strong":
        return localize("signal_quality_very_strong");
      case "strong":
        return localize("signal_quality_strong");
      case "fair":
        return localize("signal_quality_fair");
      case "weak":
        return localize("signal_quality_weak");
      case "very_weak":
        return localize("signal_quality_very_weak");
      case "no_signal":
        return localize("signal_quality_no_signal") || localize("signal_quality_unknown");
      default:
        return localize("signal_quality_unknown");
    }
  }

  _renderGroup(key, devices, topo, breakdown) {
    return html`
      <div class="section-title">${this._getConnectionTitle(key)}</div>
      <div class="device-grid">
        ${devices.map((device) => this._renderCard(device, topo, breakdown))}
      </div>
    `;
  }

  _renderCard(device, topo, breakdown) {
    const isOffline = String(device.state).toLowerCase() === "not_home";
    const a = device.attributes || {};

    const viaEntryId = this._getViaEntryId(device);
    const mainEntryId = breakdown?.mainEntryId || "";

    const isMesh = mainEntryId && viaEntryId && viaEntryId !== mainEntryId;
    const badge = viaEntryId ? (isMesh ? localize("badge_mesh") || "MESH" : localize("badge_main") || "MAIN") : "";

    let viaLabel = "";
    if (viaEntryId) {
      const node = (breakdown?.perNode || []).find((n) => n.entryId === viaEntryId);
      const viaName = node?.name || viaEntryId;

      viaLabel = isMesh
        ? `${localize("connected_via_mesh")}: ${viaName}`
        : `${localize("connected_via_main")}: ${viaName}`;
    }

    return html`
      <div class="device-card ${isOffline ? "disconnected" : ""}">
        <div class="card-header">
          <div class="device-name" title=${a.friendly_name || device.entity_id}>
            ${a.friendly_name || device.entity_id}
          </div>
          ${badge ? html`<div class="badge ${isMesh ? "mesh" : "main"}">${badge}</div>` : ""}
        </div>

        <div class="device-info">${localize("ip")}: ${a.ip || "-"}</div>
        <div class="device-info">${localize("mac_address")}: ${a.mac || "-"}</div>
        ${viaLabel ? html`<div class="device-info">${viaLabel}</div>` : ""}

        <div class="device-status ${isOffline ? "offline" : ""}">
          ${isOffline ? (localize("status_disconnected") || "Disconnected") : (localize("status_connected") || "Connected")}
        </div>

        ${String(a.connection || "").toLowerCase() !== "lan"
          ? html`
              <div class="device-info">${localize("signal")}: ${a.signal ?? "-"}</div>
              <div class="device-info">${localize("signal_quality")}: ${this._translateSignalQuality(a.signal_quality)}</div>
            `
          : ""}

        <div class="device-info">↑ ${a.up_speed ?? "0 B/s"}</div>
        <div class="device-info">↓ ${a.down_speed ?? "0 B/s"}</div>
        <div class="device-info">${localize("last_activity")}: ${a.last_activity ?? "-"}</div>

        <div class="device-info">
          ${localize("wan_access")}:
          ${a.internet_blocked
            ? html`<span class="wan-blocked">${localize("wan_blocked")}</span>`
            : html`<span class="wan-allowed">${localize("wan_allowed")}</span>`}
        </div>

        <div class="device-info-wan">
          <span>${localize("wan_unblock_button")}</span>
          <ha-switch
            .checked=${a.internet_blocked}
            @change=${(ev) => this._toggleWAN(device, ev.target.checked)}
          ></ha-switch>
          <span>${localize("wan_block_button")}</span>
        </div>
      </div>
    `;
  }

  async _toggleWAN(device, checked) {
    try {
      if (!device?.entity_id) {
        // eslint-disable-next-line no-console
        console.warn("[MiWiFi] Missing entity_id for device:", device);
        return;
      }

      await this.hass.callService("miwifi", "block_device", {
        entity_id: device.entity_id,
        allow: !checked,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[MiWiFi] Failed toggling WAN:", err);
    }
  }


  static styles = css`
    .content { text-align: center; }

    .device-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 18px;
      margin-top: 14px;
    }

    .section-title {
      font-size: 20px;
      font-weight: 700;
      margin: 28px 0 6px;
    }

    .device-card {
      background: rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 16px 14px;
      box-shadow: 0 6px 16px rgba(0,0,0,0.25);
      border: 1px solid rgba(255,255,255,0.07);
      position: relative;
      overflow: hidden;
    }

    .device-card.disconnected {
      opacity: 0.85;
      filter: grayscale(0.25);
    }

    .card-header {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
      flex-wrap: nowrap;
    }

    /* ✅ una línea */
    .device-name {
      font-size: 22px;
      font-weight: 700;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    .badge {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.4px;
      padding: 3px 8px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.25);
      background: rgba(0,0,0,0.18);
      user-select: none;
      white-space: nowrap;
      flex: 0 0 auto;
    }

    .badge.main { background: rgba(0,0,0,0.18); }
    .badge.mesh { background: rgba(0,0,0,0.18); }

    .device-info {
      font-size: 14px;
      margin-top: 6px;
      line-height: 1.2;
    }

    .device-info-wan {
      margin-top: 12px;
      display: inline-flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
    }

    .device-status.offline { color: #ffb3b3; }

    .counts {
      margin-top: 8px;
      opacity: 0.95;
      font-size: 14px;
      white-space: nowrap; /* ✅ una línea */
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .counts strong { font-weight: 800; }

    .counts-sub {
      margin-top: 4px;
      opacity: 0.9;
      font-size: 13px;
      white-space: nowrap; /* ✅ una línea */
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .offline-toggle { margin-top: 12px; }

    .pill {
      display: inline-block;
      margin-left: 6px;
      padding: 0 8px;
      border-radius: 999px;
      background: rgba(255,255,255,0.14);
      border: 1px solid rgba(255,255,255,0.12);
      font-size: 12px;
      font-weight: 800;
    }

    .wan-allowed { color: lightgreen; }
    .wan-blocked { color: #ff6b6b; }
  `;
}

customElements.define("miwifi-device-cards", MiWiFiDeviceCards);
