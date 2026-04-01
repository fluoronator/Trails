// ---------------------------
// Trails Layer
// ---------------------------

let trailsLayer = null;

// Make trail center globally available for gps.js
window.trailCenter = null;

// ---------------------------
// Load Trails
// ---------------------------
fetch('data/trails.geojson')
  .then(res => res.json())
  .then(data => {

    // Create trails layer
    trailsLayer = L.geoJSON(data, {
      style: function(feature) {
        return {
          color: '#3388ff',
          weight: 4
        };
      }
    }).addTo(map);

    // ---------------------------
    // Compute trail center (FIX)
    // ---------------------------
    let bounds = L.latLngBounds();

    trailsLayer.eachLayer(function(layer) {
      if (layer.getBounds) {
        bounds.extend(layer.getBounds());
      }
    });

    if (bounds.isValid()) {
      window.trailCenter = bounds.getCenter();
    }

    // Optional: fit map to trails initially
    map.fitBounds(bounds);

  })
  .catch(err => {
    console.error("Error loading trails:", err);
  });