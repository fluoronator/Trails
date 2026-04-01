// ---------------------------
// GPS + User Location Handling
// ---------------------------

let userMarker = null;
let hasCentered = false;

// ---------------------------
// Helper: safely update mode label
// ---------------------------
function setModeLabel(text) {
  const modeBox = document.getElementById("modeBox");
  if (modeBox) {
    modeBox.innerHTML = text;
  }
}

// ---------------------------
// Start Geolocation Tracking
// ---------------------------
if (navigator.geolocation) {
  navigator.geolocation.watchPosition(
    (position) => {

      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      const userLocation = [lat, lon];

      // Create or update user marker
      if (!userMarker) {
        userMarker = L.circleMarker(userLocation, {
          radius: 8,
          color: '#007AFF',
          fillColor: '#007AFF',
          fillOpacity: 1
        }).addTo(map);
      } else {
        userMarker.setLatLng(userLocation);
      }

      // ---------------------------
      // Mode Logic
      // ---------------------------
      if (window.trailCenter && !window.userMovedMap) {

        let distance = map.distance(userLocation, window.trailCenter);

        // Within park → Hiking Mode
        if (distance < 3200) {
          map.setView(userLocation, 17);
          setModeLabel("Hiking Mode");
        } else {
          setModeLabel("Browse Mode");
        }
      }

      // Initial centering (only once)
      if (!hasCentered) {
        map.setView(userLocation, 14);
        hasCentered = true;

        setModeLabel("Browse Mode");
      }

    },
    (err) => {
      console.warn("GPS error:", err);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    }
  );
}

// ---------------------------
// Detect manual map movement (FIXED)
// ---------------------------
window.userMovedMap = false;

map.on('movestart', function (e) {
  // Only count actual user interaction
  if (e.originalEvent) {
    window.userMovedMap = true;
  }
});