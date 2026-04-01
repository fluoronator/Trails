// Initialize map
var map = L.map('map', {
    zoomControl: false,
    maxZoom: 21,   // 👈 allow deeper zoom
    minZoom: 3
});

// Add zoom control (bottom right for mobile friendliness)
L.control.zoom({
    position: 'bottomright'
}).addTo(map);

// Add tile layer (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,   // 👈 tile limit
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);