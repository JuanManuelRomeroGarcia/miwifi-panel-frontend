import { html } from "https://unpkg.com/lit@2.7.5/index.js?module";
import { getMainRouterMac, formatSignal } from "./utils.js?v=__MIWIFI_VERSION__";
import { localize } from "../translations/localize.js?v=__MIWIFI_VERSION__";

const SENSOR_SUFFIXES = {
  temperature: "temperature",
  memory_usage: "memory_usage",
  memory_total: "memory_total",
  uptime: "uptime",
  vpn_uptime: "vpn_uptime",
  wan_download: "wan_download_speed",
  wan_upload: "wan_upload_speed",
  wan_ip: "wan_ip_address",
  wan_type: "wan_type",
  mode: "mode",
  ap_signal_2g: "_wifi_2_4g_signal_strength",
  ap_signal_5g: "_wifi_5g_signal_strength",
  ap_signal_5g_game: "_wifi_5g_game_signal_strength",
  devices: "devices",
  devices_lan: "devices_lan",
  devices_2g: "devices_2_4g",
  devices_5g: "devices_5g",
  devices_guest: "devices_guest",
  devices_5g_game: "devices_5g_game",
};

export function renderStatus(hass) {
  const mac = getMainRouterMac(hass);
  if (!mac) {
    return html`<div style="text-align:center; padding:24px; color:white">❌ ${localize("topology_main_not_found")}</div>`;
  }

  const getSensorValue = (suffix) => {
    const sensorId = `sensor.miwifi_${mac}_${suffix}`;
    return hass.states[sensorId]?.state ?? "unavailable";
  };

  const getSelectValue = (suffix) => {
    const entityId = `select.miwifi_${mac}_${suffix}`;
    return hass.states[entityId]?.state ?? "unavailable";
  };

  const topoSensor = Object.values(hass.states).find((s) =>
    s.entity_id.startsWith("sensor.topologia_miwifi") && s.attributes?.graph?.mode === 0
  );

  const graph = topoSensor?.attributes?.graph ?? {};

  const systemItems = [
    { label: localize("label_model"), value: graph.hardware || "unknown" },
    { label: localize("label_name"), value: graph.name || "unknown" },
    { label: localize("label_local_ip"), value: graph.ip || "unknown" },
    { label: localize("label_memory_usage"), value: getSensorValue(SENSOR_SUFFIXES.memory_usage) + "%" },
    { label: localize("label_memory_total"), value: getSensorValue(SENSOR_SUFFIXES.memory_total) + " MB" },
    { label: localize("label_uptime"), value: getSensorValue(SENSOR_SUFFIXES.uptime) },
    { label: localize("label_vpn_uptime"), value: getSensorValue(SENSOR_SUFFIXES.vpn_uptime) },
    { label: localize("label_net_mode"), value: getSensorValue(SENSOR_SUFFIXES.mode) },
  ];

  const internetItems = [
    { label: localize("label_wan_ip"), value: getSensorValue(SENSOR_SUFFIXES.wan_ip) },
    { label: localize("label_wan_type"), value: getSensorValue(SENSOR_SUFFIXES.wan_type) },
    { label: localize("label_wan_download"), value: getSensorValue(SENSOR_SUFFIXES.wan_download) },
    { label: localize("label_wan_upload"), value: getSensorValue(SENSOR_SUFFIXES.wan_upload) },
    { label: localize("label_signal_2g"), value: formatSignal(getSelectValue("wifi_2_4g_signal_strength")) },
    { label: localize("label_signal_5g"), value: formatSignal(getSelectValue("wifi_5g_signal_strength")) },
    { label: localize("label_signal_5g_game"), value: formatSignal(getSelectValue("wifi_5g_game_signal_strength")) },
  ];

  const devicesItems = [
    { label: localize("label_devices_total"), value: getSensorValue(SENSOR_SUFFIXES.devices) },
    { label: localize("label_devices_lan"), value: getSensorValue(SENSOR_SUFFIXES.devices_lan) },
    { label: localize("label_devices_2g"), value: getSensorValue(SENSOR_SUFFIXES.devices_2g) },
    { label: localize("label_devices_5g"), value: getSensorValue(SENSOR_SUFFIXES.devices_5g) },
    { label: localize("label_devices_guest"), value: getSensorValue(SENSOR_SUFFIXES.devices_guest) },
    { label: localize("label_devices_5g_game"), value: getSensorValue(SENSOR_SUFFIXES.devices_5g_game) },
  ];

  const renderSection = (title, items) => html`
    <div class="section-title">${title}</div>
    <div class="status-grid">
      ${items.map((item) => {
        const isUnavailable = item.value.includes("unavailable");
        const value = isUnavailable ? localize("status_unavailable") : item.value;
        return html`
          <div class="status-card">
            <div class="status-label">${item.label}</div>
            <div class="status-value ${isUnavailable ? 'unavailable' : ''}">
              ${value}
            </div>
          </div>
        `;
      })}
    </div>
  `;

  return html`
    ${renderSection(localize("section_system"), systemItems)}
    ${renderSection(localize("section_internet"), internetItems)}
    ${renderSection(localize("section_devices"), devicesItems)}
  `;
}
