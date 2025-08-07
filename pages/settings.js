import { html } from "https://unpkg.com/lit@2.7.5/index.js?module";
import "../components/miwifi-settings.js?v=__MIWIFI_VERSION__";
import { logToBackend } from "./utils.js?v=__MIWIFI_VERSION__";

async function findMainRouter(hass, retries = 3, delay = 500) {
  for (let i = 0; i < retries; i++) {
    const sensor = Object.values(hass.states).find((s) => {
      const g = s.attributes?.graph;
      return g?.is_main === true;
    });
    if (sensor) return sensor;
    await new Promise((res) => setTimeout(res, delay));
  }
  return null;
}

export async function renderSettings(hass) {
  const mainRouter = await findMainRouter(hass);

  if (!mainRouter) {
    logToBackend(hass, "warning", "❌ [settings.js] No router found with is_main or fallback logic.");
  }

  return html`
    <miwifi-settings
      .hass=${hass}
      .routerSensor=${mainRouter}
    ></miwifi-settings>
  `;
}
