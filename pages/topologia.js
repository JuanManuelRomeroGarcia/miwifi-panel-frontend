import { html } from "https://unpkg.com/lit@2.7.5/index.js?module";

const REPOSITORY = "JuanManuelRomeroGarcia/hass-miwifi";
const INTERNET_ICON = "https://cdn-icons-png.flaticon.com/512/483/483361.png";
const DEFAULT_MESH_ICON = "https://cdn-icons-png.flaticon.com/512/1946/1946488.png";

export function renderTopologia(hass) {
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

  const routerIcon = `https://raw.githubusercontent.com/${REPOSITORY}/main/images/${mainGraph.hardware}.png`;

  return html`
    <style>
      .miwifi-tree {
        background: #1a73e8;
        padding: 24px;
        border-radius: 12px;
        text-align: center;
        color: white;
        animation: fadeIn 1s ease;
      }
      .miwifi-node {
        display: flex;
        flex-direction: column;
        align-items: center;
        background: #2366d1;
        padding: 12px;
        border-radius: 10px;
        box-shadow: 0px 4px 8px rgba(0,0,0,0.3);
        transition: transform 0.3s, box-shadow 0.3s;
      }
      .miwifi-node:hover {
        transform: scale(1.05);
        box-shadow: 0px 6px 14px rgba(0,0,0,0.5);
      }
      .miwifi-line-vertical {
        height: 30px;
        border-left: 2px solid lime;
        margin: 0 auto;
      }
      .miwifi-mesh-group {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 20px;
        margin-top: 20px;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @media (max-width: 600px) {
        .miwifi-mesh-group {
          flex-direction: column;
          align-items: center;
        }
      }
    </style>

    <div class="miwifi-tree">
      <div style="margin-bottom: 20px;">
        <img src="${INTERNET_ICON}" style="width: 60px; height: 60px; margin-bottom: 8px;" alt="Internet" />
        <div>Internet</div>
        <div class="miwifi-line-vertical"></div>
      </div>

      <div style="margin-bottom: 20px;">
        <img src="${routerIcon}" style="width: 80px; height: 80px; margin-bottom: 8px;" alt="Router" />
        <div style="font-weight: bold;">${mainGraph.name} (Gateway)</div>
        <div style="font-size: 14px;">${mainGraph.ip}</div>
        <div class="miwifi-line-vertical"></div>
      </div>

      <div class="miwifi-mesh-group">
        ${mainGraph.leafs.map(
          (leaf) => {
            const leafIcon = leaf.hardware
              ? `https://raw.githubusercontent.com/${REPOSITORY}/main/images/${leaf.hardware}.png`
              : DEFAULT_MESH_ICON;
            return html`
              <div class="miwifi-node">
                <img src="${leafIcon}" style="width: 50px; height: 50px; margin-bottom: 6px;" alt="Nodo Mesh" />
                <div style="font-weight: bold;">${leaf.name}</div>
                <div style="font-size: 14px;">${leaf.ip}</div>
              </div>
            `;
          }
        )}
      </div>
    </div>
  `;
}