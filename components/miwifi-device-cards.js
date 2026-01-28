import { LitElement, html, css } from "https://unpkg.com/lit@2.7.5/index.js?module";
import { localize } from "../translations/localize.js?v=__MIWIFI_VERSION__";

class MiWiFiDeviceCards extends LitElement {
  static properties = {
    hass: {},
    showOffline: { type: Boolean },
  };

  constructor() {
    super();
    this.showOffline = false;
  }

  render() {
    const devices = Object.values(this.hass?.states || {}).filter((state) =>
      String(state?.entity_id || "").startsWith("device_tracker.miwifi_")
    );

    const topo = this._getTopologyInfo();

    // ✅ Online/Offline robusto para UI (evita perder 5G Game si HA lo marca not_home)
    const connected = devices.filter((d) => this._isDeviceOnline(d));
    const disconnected = devices.filter((d) => !this._isDeviceOnline(d));

    const breakdown = this._buildNodeBreakdown(connected, topo);

    const grouped = {};
    connected.forEach((device) => {
      const conn = this._getConnectionLabel(device.attributes?.connection);
      if (!grouped[conn]) grouped[conn] = [];
      grouped[conn].push(device);
    });

    const breakdownText = (breakdown.perNode || [])
      .map((n) => `${n.name}: ${n.count}`)
      .join(" | ");

    return html`
      <div class="content">
        <h2>${localize("devices_connected_title")}</h2>

        <div class="counts">
          ${localize("devices_total_connected")}: <strong>${devices.length}</strong>
          &nbsp;|&nbsp; ${localize("devices_connected")}: <strong>${connected.length}</strong>
          &nbsp;|&nbsp; ${localize("devices_main")}: <strong>${breakdown.mainCount}</strong>
          &nbsp;|&nbsp; ${localize("devices_mesh")}: <strong>${breakdown.meshCount}</strong>
        </div>

        ${breakdownText ? html`<div class="counts-sub">${breakdownText}</div>` : ""}

        ${Object.entries(grouped).map(
          ([type, devs]) => html`${this._renderGroup(type, devs, topo, breakdown)}`
        )}

        <!-- ✅ Toggle offline (botón real) -->
        ${disconnected.length > 0
          ? html`
              <div class="offline-toggle">
                <button class="offline-btn" @click=${this._toggleOffline}>
                  ${this.showOffline
                    ? localize("toggle_offline_hide")
                    : localize("toggle_offline_show")}
                  (${disconnected.length})
                </button>
              </div>

              ${this.showOffline
                ? html`
                    <div class="section-title" style="margin-top: 18px;">
                      🔴 ${localize("toggle_offline_show")}
                    </div>
                    <div class="device-grid">
                      ${disconnected.map((device) => this._renderCard(device, topo, breakdown))}
                    </div>
                  `
                : ""}
            `
          : ""}
      </div>
    `;
  }

  _toggleOffline() {
    this.showOffline = !this.showOffline;
  }

  _normalizeMac(mac) {
    if (!mac) return "";
    return String(mac).trim().toLowerCase();
  }

  _parseLastActivity(value) {
    if (!value) return null;
    const t = Date.parse(String(value));
    return Number.isFinite(t) ? t : null;
  }

  // ✅ Considera online si:
  // - state === home
  // - o last_activity reciente (grace) -> evita perder 5G Game cuando HA lo marca not_home erróneo
  _isDeviceOnline(device) {
    const state = String(device?.state || "").toLowerCase();
    if (state === "home") return true;

    const a = device?.attributes || {};
    const last = this._parseLastActivity(a.last_activity);
    if (!last) return false;

    // Ajuste conservador: 4 horas
    const ONLINE_GRACE_MS = 4 * 60 * 60 * 1000;
    return Date.now() - last <= ONLINE_GRACE_MS;
  }

  _getTopologyInfo() {
    const routersByMac = {};
    let mainMac = "";
    let mainName = "";
    const meshLeafNames = [];

    const states = Object.values(this.hass?.states || {});

    for (const s of states) {
      const eid = String(s?.entity_id || "");
      if (!eid.startsWith("sensor.miwifi_topology")) continue;

      const a = s.attributes || {};
      const g = a.graph || a.topo_graph?.graph || a.topology?.graph;
      if (!g) continue;

      const gMac = this._normalizeMac(g.mac);
      if (gMac) routersByMac[gMac] = (g.name || g.locale || gMac);

      if (g.is_main === true) {
        mainMac = gMac || mainMac;
        mainName = (g.name || g.locale || mainName || "Main");

        if (Array.isArray(g.leafs)) {
          for (const leaf of g.leafs) {
            const leafName = (leaf?.name || leaf?.locale || "").toString().trim();
            if (leafName) meshLeafNames.push(leafName);

            const leafMac = this._normalizeMac(leaf?.mac);
            if (leafMac) routersByMac[leafMac] = leafName || leafMac;
          }
        }
      }
    }

    return { mainMac, mainName, meshLeafNames, routersByMac };
  }

  _getViaMac(device) {
    const a = device?.attributes || {};
    return this._normalizeMac(a.connected_via_router_mac || a.router_mac || "");
  }

  _getViaEntryId(device) {
    const a = device?.attributes || {};
    return String(a.connected_via_entry_id || a.updater_entry_id || "").trim();
  }

  // ✅ Breakdown robusto:
  // - mainEntryId: el más común entre dispositivos cuyo viaMac == topo.mainMac
  // - nombre de nodo: routersByMac[viaMac] si existe
  _buildNodeBreakdown(connectedDevices, topo) {
    const nodes = new Map(); // entryId -> { count, viaMac }

    for (const dev of connectedDevices) {
      const entryId = this._getViaEntryId(dev) || "unknown";
      const viaMac = this._getViaMac(dev) || "";
      const prev = nodes.get(entryId) || { count: 0, viaMac };
      prev.count += 1;
      if (!prev.viaMac && viaMac) prev.viaMac = viaMac;
      nodes.set(entryId, prev);
    }

    const perNodeRaw = Array.from(nodes.entries()).map(([entryId, data]) => ({
      entryId,
      count: data.count,
      viaMac: data.viaMac,
    }));

    // Determinar mainEntryId por MAC del router principal
    let mainEntryId = "";
    const mainCandidates = perNodeRaw
      .filter((n) => topo?.mainMac && n.viaMac && n.viaMac === topo.mainMac)
      .sort((a, b) => b.count - a.count);

    if (mainCandidates.length) mainEntryId = mainCandidates[0].entryId;
    else {
      // fallback: el entryId con más dispositivos
      const sortedByCount = [...perNodeRaw].sort((a, b) => b.count - a.count);
      mainEntryId = sortedByCount[0]?.entryId || "";
    }

    let mainCount = 0;
    let meshCount = 0;

    const perNode = perNodeRaw
      .sort((a, b) => b.count - a.count)
      .map((n, idx) => {
        const isMain = mainEntryId && n.entryId === mainEntryId;
        if (isMain) mainCount += n.count;
        else meshCount += n.count;

        // nombre preferente: routersByMac por viaMac
        let name = topo?.routersByMac?.[n.viaMac] || "";

        // fallback por leaf index (si no hay mac mapping)
        if (!name && !isMain) {
          name = topo?.meshLeafNames?.[idx - 1] || "";
        }

        // fallback final
        if (!name) name = isMain ? (topo?.mainName || "Main") : `Mesh ${Math.max(1, idx)}`;

        return { entryId: n.entryId, count: n.count, name, isMain, viaMac: n.viaMac };
      });

    return { mainEntryId, mainCount, meshCount, perNode };
  }

  _getConnectionLabel(connection) {
    switch (String(connection || "").toLowerCase()) {
      case "lan":
        return "LAN";
      case "2.4g":
        return "2.4G";
      case "5g":
        return "5G";
      case "5g game":
        return "5G Game";
      case "guest":
        return "Guest";
      default:
        return "Unknown";
    }
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
      default:
        return localize("signal_quality_unknown");
    }
  }

  _renderGroup(type, devices, topo, breakdown) {
    return html`
      <div class="section-title">${localize("section_" + type)}</div>
      <div class="device-grid">
        ${devices.map((device) => this._renderCard(device, topo, breakdown))}
      </div>
    `;
  }

  _renderCard(device, topo, breakdown) {
    const a = device.attributes || {};

    const isOffline = !this._isDeviceOnline(device);

    const viaEntryId = this._getViaEntryId(device);
    const viaMac = this._getViaMac(device);

    const mainEntryId = breakdown?.mainEntryId || "";
    const mainMac = topo?.mainMac || "";

    const isMesh = (mainMac && viaMac && viaMac !== mainMac) || (mainEntryId && viaEntryId && viaEntryId !== mainEntryId);
    const badge = viaEntryId ? (isMesh ? "MESH" : "MAIN") : "";

    let viaLabel = "";
    if (viaEntryId || viaMac) {
      const node = (breakdown?.perNode || []).find((n) => n.entryId === viaEntryId);
      const viaName =
        (viaMac && topo?.routersByMac?.[viaMac]) ||
        node?.name ||
        viaEntryId ||
        viaMac;

      viaLabel = isMesh
        ? `${localize("connected_via_mesh")}: ${viaName}`
        : `${localize("connected_via_main")}: ${viaName}`;
    }

    return html`
      <div class="device-card ${isOffline ? "disconnected" : ""}">
        <div class="card-header">
          <div class="device-name">${a.friendly_name || device.entity_id}</div>
          ${badge ? html`<div class="badge ${badge === "MESH" ? "mesh" : "main"}">${badge}</div>` : ""}
        </div>

        <div class="device-info">${localize("ip")}: ${a.ip || "-"}</div>
        <div class="device-info">${localize("mac_address")}: ${a.mac || "-"}</div>

        ${viaLabel ? html`<div class="device-info">${viaLabel}</div>` : ""}

        <div class="device-info">
          ${localize("status_connected")}:
          ${isOffline ? localize("status_disconnected") : localize("status_connected_yes")}
        </div>

        ${String(a.connection || "").toLowerCase() !== "lan"
          ? html`
              <div class="device-info">${localize("signal")}: ${a.signal ?? "N/D"}</div>
              <div class="device-info">${localize("signal_quality")}: ${this._translateSignalQuality(a.signal_quality)}</div>
            `
          : ""}

        <div class="device-info">↑ ${a.up_speed ?? "0 B/s"}</div>
        <div class="device-info">↓ ${a.down_speed ?? "0 B/s"}</div>
        <div class="device-info">${localize("last_activity")}: ${a.last_activity ?? "-"}</div>

        <div class="device-info">
          ${localize("wan_access")}:
          ${a.internet_blocked
            ? html`<span class="wan-bad">${localize("wan_blocked")}</span>`
            : html`<span class="wan-ok">${localize("wan_allowed")}</span>`}
        </div>

        <div class="device-info-wan">
          <span>${localize("wan_unblock_button")}</span>
          <ha-switch
            .checked=${a.internet_blocked}
            @change=${(ev) => this._toggleWAN(device, ev.target.checked)}
          ></ha-switch>
          <span>${localize("wan_block_button")}</span>
        </div>

        <div class="device-info status-dot">
          ● ${isOffline ? localize("status_disconnected") : localize("status_connected")}
        </div>
      </div>
    `;
  }

  async _toggleWAN(device, checked) {
    try {
      const deviceId = device.attributes?.device_id;
      await this.hass.callService("miwifi", "block_device", {
        device_id: deviceId,
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
      flex-wrap: wrap;
    }

    .device-name {
      font-size: 22px;
      font-weight: 700;
      line-height: 1.2;
      word-break: break-word;
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
    }

    .badge.main { background: rgba(0, 0, 0, 0.18); }
    .badge.mesh { background: rgba(0, 0, 0, 0.18); }

    .device-info {
      font-size: 14px;
      margin-top: 6px;
      line-height: 1.2;
    }

    /* ✅ WAN toggle en una sola línea */
    .device-info-wan {
      margin-top: 12px;
      display: inline-flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
      flex-wrap: nowrap;
      white-space: nowrap;
    }
    .device-info-wan span { white-space: nowrap; }
    .device-info-wan ha-switch { transform: scale(0.95); }

    .wan-ok { color: lightgreen; }
    .wan-bad { color: red; }

    .counts {
      margin-top: 8px;
      opacity: 0.95;
      font-size: 14px;
    }

    .counts strong { font-weight: 800; }

    .counts-sub {
      margin-top: 4px;
      opacity: 0.9;
      font-size: 13px;
    }

    .offline-toggle {
      margin-top: 18px;
    }

    .offline-btn {
      border: 1px solid rgba(255,255,255,0.25);
      background: rgba(0,0,0,0.18);
      color: white;
      padding: 8px 12px;
      border-radius: 10px;
      cursor: pointer;
      font-weight: 700;
    }

    .status-dot {
      margin-top: 8px;
      color: lightgreen;
    }
  `;
}

customElements.define("miwifi-device-cards", MiWiFiDeviceCards);
