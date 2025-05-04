const version = "__MIWIFI_VERSION__";

let translations = {};
let currentLang = "en";

export async function loadTranslations(hass) {
  currentLang = hass.language || "en";
  try {
    const res = await fetch(`/local/miwifi/translations/${currentLang}.json?v=${version}`);
    translations = await res.json();
  } catch (e) {
    console.warn(`No translation for ${currentLang}, falling back to English`);
    const res = await fetch(`/local/miwifi/translations/en.json?v=${version}`);
    translations = await res.json();
  }
}

export function localize(key) {
  return translations[key] || key;
}
