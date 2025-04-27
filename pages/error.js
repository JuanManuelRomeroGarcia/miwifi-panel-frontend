import { html } from "https://unpkg.com/lit@2.7.5/index.js?module";

export function renderError(hass) {
  return html`
  <div style="color: gray; margin-top: 16px; text-align: center;">
    <p style="color: red;">❌ Página no encontrada</p>
  </div>
  `;
}