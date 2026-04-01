// ---------------------------
// GPS + User Location Handling
// ---------------------------

let userMarker = null;
let hasCentered = false;

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
      // Mode Logic (RESTORED)
      // ---------------------------
      if (window.trailCenter && !window.userMovedMap) {

        let distance = map.distance(userLocation, window.trailCenter);

        // Within park → Hiking Mode
// ****************************************** restore distance to 3200 after testing
        if (distance < 90000) {
          map.setView(userLocation, 17);
          document.getElementById("modeBox").innerHTML = "Hiking Mode";
        } else {
          // Outside park → Browse Mode
          document.getElementById("modeBox").innerHTML = "Browse Mode";
        }
      }

      // Initial centering (only once)
      if (!hasCentered) {
        map.setView(userLocation, 14);
        hasCentered = true;
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

map.on('movestart', function () {
  window.userMovedMap = true;
});