// map.js

// --- Base Layers ---
const standardLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
    }
);

const topoLayer = L.tileLayer(
    "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 17,
        attribution: "&copy; OpenTopoMap contributors"
    }
);

const satelliteLayer = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
        maxZoom: 19,
        attribution: "Tiles &copy; Esri"
    }
);

// --- Map Init ---
const map = L.map("map", {
    center: [34.7, -86.9],
    zoom: 13,
    layers: [standardLayer], // default layer
    zoomControl: false
});

// Move zoom control to bottom right
L.control.zoom({ position: "bottomright" }).addTo(map);

// --- Layer Control (top right "stack" button) ---
const baseMaps = {
    "Standard": standardLayer,
    "Topo": topoLayer,
    "Satellite": satelliteLayer
};

L.control.layers(baseMaps, null, {
    position: "topright",
    collapsed: true
}).addTo(map);