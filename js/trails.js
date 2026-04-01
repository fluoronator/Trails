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
  .then(res => {
    if (!res.ok) {
      throw new Error("Failed to load GeoJSON: " + res.status);
    }
    return res.json();
  })
  .then(data => {

    // ---------------------------
    // Create Trails Layer
    // ---------------------------
    trailsLayer = L.geoJSON(data, {
      style: function(feature) {
        return {
          color: '#3388ff',
          weight: 4
        };
      },
      onEachFeature: function(feature, layer) {

        // ---------------------------
        // Restore Labels (IMPORTANT)
        // ---------------------------
        if (feature.properties && feature.properties.name) {

          layer.bindTooltip(feature.properties.name, {
            permanent: true,
            direction: "center",
            className: "trail-label"
          });
        }
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
      console.log("Trail center set:", window.trailCenter);

      // Fit map to trails initially
      map.fitBounds(bounds);
    } else {
      console.warn("Bounds invalid — trailCenter not set");
    }

    // ---------------------------
    // Ensure label updates from Loading
    // ---------------------------
    const modeBox = document.getElementById("modeBox");
    if (modeBox) {
      modeBox.innerHTML = "Browse Mode";
    }

  })
  .catch(err => {
    console.error("Error loading trails:", err);

    const modeBox = document.getElementById("modeBox");
    if (modeBox) {
      modeBox.innerHTML = "Browse Mode";
    }
  });