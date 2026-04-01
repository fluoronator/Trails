// ---------------------------
// Map Initialization
// ---------------------------
const map = L.map('map', {
  zoomControl: true,
  maxZoom: 21,
  minZoom: 3
}).setView([34.6, -86.98], 14); // Default fallback

// ---------------------------
// Tile Layers
// ---------------------------

// OpenStreetMap
const osmLayer = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }
);

// Topographic (recommended default)
const topoLayer = L.tileLayer(
  'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  {
    maxZoom: 17,
    attribution: '© OpenTopoMap contributors'
  }
);

// Satellite (Esri)
const satelliteLayer = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/' +
  'World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    attribution: 'Tiles © Esri'
  }
);

// Default layer
topoLayer.addTo(map);

// Layer control
L.control.layers({
  "Topo": topoLayer,
  "Satellite": satelliteLayer,
  "Standard": osmLayer
}).addTo(map);

// ---------------------------
// IMPORTANT: Do NOT add anything else here
// ---------------------------
// Your app relies on:
//   - trails.js (draws trails)
//   - gps.js (handles location)
//   - orientation.js
//
// This file should ONLY handle the base map.