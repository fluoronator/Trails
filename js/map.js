// map.js

// --- Base Layers ---
const standardLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 21,
        attribution: "&copy; OpenStreetMap contributors"
    }
);

const topoLayer = L.tileLayer(
    "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    {
        maxNativeZoom: 17, // actual tile limit
        maxZoom: 21,       // allow zoom beyond (stretch)
        attribution: "&copy; OpenTopoMap contributors"
    }
);

const satelliteLayer = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
        maxZoom: 21,
        attribution: "Tiles &copy; Esri"
    }
);

// --- Map Init ---
const map = L.map("map", {
    center: [34.7, -86.9],
    zoom: 13,
    maxZoom: 21,
    layers: [standardLayer],
    zoomControl: false
});

// Move zoom control to bottom right
L.control.zoom({ position: "bottomright" }).addTo(map);

// --- Layer Control ---
const baseMaps = {
    "Standard": standardLayer,
    "Topo": topoLayer,
    "Satellite": satelliteLayer
};

L.control.layers(baseMaps, null, {
    position: "topright",
    collapsed: true
}).addTo(map);