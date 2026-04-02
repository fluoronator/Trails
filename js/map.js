// map.js — Map initialization and basemap switching

// ── BASE LAYERS ───────────────────────────────────────────────────────────────

const standardLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 21,
        attribution: "© OpenStreetMap contributors"
    }
);

const topoLayer = L.tileLayer(
    "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    {
        maxNativeZoom: 17,
        maxZoom: 21,
        attribution: "© OpenTopoMap contributors"
    }
);

const satelliteLayer = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
        maxZoom: 21,
        attribution: "Tiles © Esri"
    }
);

// ── MAP INIT ──────────────────────────────────────────────────────────────────

const map = L.map("map", {
    center: [34.7, -86.9],
    zoom: 14,
    maxZoom: 21,
    layers: [standardLayer],
    zoomControl: false,
    attributionControl: true
});

// Track current layer
let currentBaseLayer = standardLayer;

// ── BASEMAP SWITCHER ──────────────────────────────────────────────────────────

const layerMap = {
    standard:  standardLayer,
    topo:      topoLayer,
    satellite: satelliteLayer
};

function switchBasemap(name, btn) {
    const newLayer = layerMap[name];
    if (!newLayer || newLayer === currentBaseLayer) return;

    map.removeLayer(currentBaseLayer);
    map.addLayer(newLayer);
    currentBaseLayer = newLayer;

    // Update active button state
    document.querySelectorAll('.basemap-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}
