import { html } from "https://unpkg.com/lit@2.7.5/index.js?module";
import { logToBackend } from "./utils.js?v=__MIWIFI_VERSION__";
import { localize } from "../translations/localize.js?v=__MIWIFI_VERSION__";
import "../components/miwifi-portforwarding.js?v=__MIWIFI_VERSION__";

export const renderPortForwarding = (hass) => {
  try {
    if (!hass) {
      logToBackend(null, "warning", "[MiWiFi] ⚠️ Hass object not received while rendering panel");
      return html`
        <div style="color: red;">
          ⚠️ ${localize("panel.error_no_hass") || "Cannot load panel: hass not defined."}
        </div>`;
    }

    logToBackend(hass, "info", "[panel-portforwarding.js] Rendering port forwarding panel");

    return html`<miwifi-portforwarding .hass=${hass}></miwifi-portforwarding>`;

  } catch (err) {
    logToBackend(hass, "error", `[panel-portforwarding.js] Error: ${err.message}`);
    return html`
      <div style="color: red; text-align: center;">
        ⚠️ ${localize("panel.error_portforwarding") || "Error loading port forwarding panel."}
      </div>`;
  }
};
