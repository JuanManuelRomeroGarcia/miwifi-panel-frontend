import { logToBackend } from "./pages/utils.js?v=__MIWIFI_VERSION__";

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
  logToBackend(window?.hass, "debug", `➡️ [router.js] Navigated to: ${path}`);

}

export function goBack() {
  if (_history.length <= 1) {
    logToBackend(window?.hass, "warning", "🔙 [router.js] goBack() called with no internal history. Using browser back.");
    window.history.back();
  } else {
    _history.pop(); 
    const previous = _history.pop() || "/status"; 
    navigate(previous);
    logToBackend(window?.hass, "debug", `🔙 [router.js] Going back to previous route: ${previous}`);
  }
}

export function currentPath() {
  return _currentPath;
}
