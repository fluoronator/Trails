// ---------------------------
// Trails Layer
// ---------------------------

let trailsLayer = null;

// Global center for gps.js
window.trailCenter = null;

// ---------------------------
// Load Trails
// ---------------------------
fetch('data/trails.geojson')
  .then(res => res.json())
  .then(data => {

    // ---------------------------
    // ORIGINAL TRAILS LAYER (unchanged behavior)
    // ---------------------------
    trailsLayer = L.geoJSON(data, {
      onEachFeature: function(feature, layer) {

        // Preserve your original label behavior
        if (feature.properties && feature.properties.name) {
          layer.bindTooltip(feature.properties.name, {
            permanent: true,
            direction: "center",
            className: "trail-label"
          });
        }

      },
      style: function(feature) {

        // Preserve your original color logic
        if (feature.properties && feature.properties.color) {
          return {
            color: feature.properties.color,
            weight: 4
          };
        }

        // fallback
        return {
          color: '#3388ff',
          weight: 4
        };
      }
    }).addTo(map);

    // ---------------------------
    // ADD THIS ONLY: Compute center
    // ---------------------------
    let bounds = L.latLngBounds();

    trailsLayer.eachLayer(function(layer) {
      if (layer.getBounds) {
        bounds.extend(layer.getBounds());
      }
    });

    if (bounds.isValid()) {
      window.trailCenter = bounds.getCenter();
      console.log("Trail center set:", window.trailCenter);
    }

  })
  .catch(err => {
    console.error("Error loading trails:", err);
  });