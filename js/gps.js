// ---------------------------
// GPS + User Location Handling
// ---------------------------

// 🔧 EASY TESTING CONTROL
// Set to 90000 to force Hiking Mode from far away
// Set to 3200 for real behavior
window.MODE_DISTANCE = 90000;

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

      const userLocation = L.latLng(lat, lon);

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
      // ✅ MODE LOGIC (SINGLE SOURCE)
      // ---------------------------
      if (window.trailCenter) {

        let distance = userLocation.distanceTo(window.trailCenter);

        if (distance <= window.MODE_DISTANCE) {
          setModeLabel("Hiking Mode");
        } else {
          setModeLabel("Browse Mode");
        }
      }

      // Initial centering (only once)
      if (!hasCentered) {
        map.setView(userLocation, 14);
        hasCentered = true;

        setModeLabel("Browse Mode centering from gps.js");
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
// Detect manual map movement
// ---------------------------
window.userMovedMap = false;

map.on('movestart', function (e) {
  if (e.originalEvent) {
    window.userMovedMap = true;
  }
});