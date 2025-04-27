const MIWIFI_VERSION = "2.4";

async function loadPage(module) {
  return (await import(`./pages/${module}.js?v=${MIWIFI_VERSION}`));
}

export const router = {
  "/topologia": (hass) => loadPage("topologia").then((mod) => mod.renderTopologia(hass)),
  "/dispositivos": (hass) => loadPage("dispositivos").then((mod) => mod.renderDispositivos(hass)),
  "/velocidades": (hass) => loadPage("velocidades").then((mod) => mod.renderVelocidades(hass)),
  "/mesh": (hass) => loadPage("mesh").then((mod) => mod.renderMesh(hass)),
  "/settings": (hass) => loadPage("settings").then((mod) => mod.renderSettings(hass)),
  "/error": (hass) => loadPage("error").then((mod) => mod.renderError(hass)),
};

export function navigate(path) {
  window.history.pushState({}, "", `/miwifi${path}`);
  window.dispatchEvent(new Event("location-changed"));
}

export function currentPath() {
  const path = window.location.pathname.replace("/miwifi", "");
  return path || "/topologia";
}