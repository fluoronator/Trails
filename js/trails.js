
// Create map
window.map = L.map('map', {
    zoomControl: false,
    attributionControl: false
}).setView([0,0], 15);

// Tiles
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
}).addTo(map);
