import { html } from "https://unpkg.com/lit@2.7.5/index.js?module";

export function renderMesh(hass) {
  const sensorIds = Object.keys(hass.states).filter((id) =>
    id.startsWith("sensor.topologia_miwifi")
  );

  let mainGraph = null;

  for (const id of sensorIds) {
    const sensor = hass.states[id];
    if (sensor && sensor.attributes && sensor.attributes.graph) {
      const graph = sensor.attributes.graph;
      if (Number(graph.mode) === 0) {
        mainGraph = graph;
        break;
      }
    }
  }

  if (!mainGraph) {
    return html`
      <div style="color: gray; margin-top: 16px; text-align: center;">
        ❗ No se encontró router principal.<br />
        Asegúrate de que la topología ha sido cargada correctamente.
      </div>
    `;
  }

  return html`
    <style>
      .mesh-list {
        background: #1a73e8;
        padding: 20px;
        border-radius: 12px;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 20px;
        color: white;
        animation: fadeIn 1s ease;
      }
      .mesh-card {
        background: #2366d1;
        padding: 16px;
        border-radius: 10px;
        width: 250px;
        text-align: center;
        box-shadow: 0px 4px 8px rgba(0,0,0,0.3);
        transition: transform 0.3s, box-shadow 0.3s;
      }
      .mesh-card:hover {
        transform: scale(1.05);
        box-shadow: 0px 6px 14px rgba(0,0,0,0.5);
      }
      .mesh-name {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 8px;
      }
      .mesh-info {
        font-size: 14px;
        color: #d0d0d0;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    </style>

    <div class="mesh-list">
      ${mainGraph.leafs.map(
        (leaf) => html`
          <div class="mesh-card">
            <div class="mesh-name">${leaf.name}</div>
            <div class="mesh-info">
              IP: ${leaf.ip}<br />
              Modelo: ${leaf.hardware}<br />
              Estado: 🟢 Online
            </div>
          </div>
        `
      )}
    </div>
  `;
}