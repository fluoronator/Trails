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
    // Compute bounds safely
    // ---------------------------
    let bounds = L.latLngBounds();

    trailsLayer.eachLayer(function(layer) {
      if (layer.getBounds) {
        bounds.extend(layer.getBounds());
      }
    });

    // ---------------------------
    // Set trail center if valid
    // ---------------------------
    if (bounds.isValid()) {
      window.trailCenter = bounds.getCenter();

      // Fit map to trails
      map.fitBounds(bounds);

      console.log("Trail center set:", window.trailCenter);
    } else {
      console.warn("Bounds invalid — trailCenter not set");
    }

    // ---------------------------
    // Ensure label updates from "Loading..."
    // ---------------------------
    const modeBox = document.getElementById("modeBox");
    if (modeBox) {
      modeBox.innerHTML = "Browse Mode";
    }

  })
  .catch(err => {
    console.error("Error loading trails:", err);

    // Prevent UI from getting stuck
    const modeBox = document.getElementById("modeBox");
    if (modeBox) {
      modeBox.innerHTML = "Browse Mode";
    }
  });