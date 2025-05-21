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
const _history = ["/status"];

export function navigate(path) {
  if (_currentPath !== path) {
    _history.push(path);
  }
  _currentPath = path;
  window.dispatchEvent(new CustomEvent("miwifi-navigate", { detail: { path } }));
}

export function goBack() {
  if (_history.length <= 1) {
    // No hay historial interno: salir del panel
    window.history.back();
  } else {
    _history.pop(); // quita la actual
    const previous = _history.pop() || "/status"; // vuelve atrás uno más
    navigate(previous);
  }
}

export function currentPath() {
  return _currentPath;
}
