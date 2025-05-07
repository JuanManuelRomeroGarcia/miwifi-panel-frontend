const MIWIFI_VERSION = "__MIWIFI_VERSION__";

async function loadPage(module) {
  return (await import(`./pages/${module}.js?v=${MIWIFI_VERSION}`));
}

export const router = {
  "/status": (hass) => loadPage("status").then((mod) => mod.renderStatus(hass)),
  "/topologia": (hass) => loadPage("topologia").then((mod) => mod.renderTopologia(hass)),
  "/miwifi-devices": (hass) => loadPage("miwifi-devices").then((mod) => mod.renderDevicesCards(hass)),
  "/mesh": (hass) => loadPage("mesh").then((mod) => mod.renderMesh(hass)),
  "/settings": (hass) => loadPage("settings").then((mod) => mod.renderSettings(hass)),
  "/error": (hass) => loadPage("error").then((mod) => mod.renderError(hass)),
};

let _currentPath = "/status";

export function navigate(path) {
  _currentPath = path;
  window.dispatchEvent(new CustomEvent("miwifi-navigate", { detail: { path } }));
}

export function currentPath() {
  return _currentPath;
}
