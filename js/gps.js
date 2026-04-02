// gps.js — GPS tracking, mode detection, and return-to-location logic

// ── CONFIG ────────────────────────────────────────────────────────────────────

// Distance in meters from trail center to trigger Hiking Mode
// Set large for testing so Hiking Mode triggers even from far away
window.MODE_DISTANCE = 90000;

// How long (ms) of map inactivity before auto-recentering in Hiking Mode
const RECENTER_DELAY_MS = 4000;

// ── STATE ─────────────────────────────────────────────────────────────────────

let userMarker       = null;
let userPulseMarker  = null;
let userLatLng       = null;
let hasCentered      = false;
let isHikingMode     = false;
let userMovedMap     = false;
let recenterTimer    = null;

// ── UI HELPERS ────────────────────────────────────────────────────────────────

function setMode(mode) {
    const modeBox  = document.getElementById("modeBox");
    const modeIcon = document.getElementById("modeIcon");
    const modeText = document.getElementById("modeText");
    const northArrow = document.getElementById("northArrow");

    isHikingMode = (mode === "hiking");
    window.isHikingMode = isHikingMode;

    if (isHikingMode) {
        modeBox.className  = "hiking";
        modeIcon.textContent = "🥾";
        modeText.textContent = "Hiking Mode";
        northArrow.classList.remove("hidden");
    } else {
        modeBox.className  = "browse";
        modeIcon.textContent = "🗺";
        modeText.textContent = "Browse Mode";
        northArrow.classList.add("hidden");
        // In browse mode, reset rotation
        const wrapper = document.getElementById("map-rotate-wrapper");
        if (wrapper) wrapper.style.transform = 'scale(2) rotate(0deg)';
        window.mapRotationDeg = 0;
    }
}

function showRecenterBtn(show) {
    const btn = document.getElementById("recenterBtn");
    if (show) {
        btn.classList.remove("hidden");
    } else {
        btn.classList.add("hidden");
    }
}

// ── PUBLIC: called by recenter button ─────────────────────────────────────────
function recenterToUser() {
    if (!userLatLng) return;
    map.setView(userLatLng, Math.max(map.getZoom(), 15));
    userMovedMap = false;
    showRecenterBtn(false);
}

// ── CREATE / UPDATE USER MARKER ───────────────────────────────────────────────

function updateUserMarker(latlng) {
    if (!userMarker) {
        // Accuracy/pulse ring
        const pulseIcon = L.divIcon({
            html: '<div class="user-location-pulse"></div>',
            className: '',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });
        userPulseMarker = L.marker(latlng, { icon: pulseIcon, zIndexOffset: 900 }).addTo(map);

        // Main dot
        userMarker = L.circleMarker(latlng, {
            radius:      8,
            color:       '#ffffff',
            weight:      2.5,
            fillColor:   '#007AFF',
            fillOpacity: 1,
            zIndexOffset: 1000
        }).addTo(map);
    } else {
        userMarker.setLatLng(latlng);
        userPulseMarker.setLatLng(latlng);
    }
}

// ── INACTIVITY RECENTER TIMER ─────────────────────────────────────────────────

function resetRecenterTimer() {
    clearTimeout(recenterTimer);
    if (isHikingMode && userMovedMap) {
        recenterTimer = setTimeout(() => {
            if (userMovedMap && isHikingMode) {
                recenterToUser();
            }
        }, RECENTER_DELAY_MS);
    }
}

// ── GEOLOCATION TRACKING ──────────────────────────────────────────────────────

if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            userLatLng = L.latLng(lat, lon);

            updateUserMarker(userLatLng);

            // ── MODE DETECTION ─────────────────────────────────────────────────
            if (window.trailCenter) {
                const dist = userLatLng.distanceTo(window.trailCenter);
                const shouldHike = dist <= window.MODE_DISTANCE;
                const wasHiking = isHikingMode;

                setMode(shouldHike ? "hiking" : "browse");

                // On entering hiking mode, snap to user location
                if (shouldHike && !wasHiking && !hasCentered) {
                    map.setView(userLatLng, 15);
                    hasCentered = true;
                }
            } else {
                // Trails not loaded yet — show locating
                document.getElementById("modeText").textContent = "Locating…";
            }

            // ── AUTO-CENTER (first fix) ────────────────────────────────────────
            if (!hasCentered) {
                map.setView(userLatLng, 15);
                hasCentered = true;
            }

            // ── AUTO-FOLLOW in hiking mode ─────────────────────────────────────
            if (isHikingMode && !userMovedMap) {
                map.panTo(userLatLng, { animate: true, duration: 0.5 });
            }
        },
        (err) => {
            console.warn("GPS error:", err.message);
            if (!hasCentered) {
                document.getElementById("modeText").textContent = "GPS unavailable";
            }
        },
        {
            enableHighAccuracy: true,
            maximumAge:         0,
            timeout:            15000
        }
    );
} else {
    document.getElementById("modeText").textContent = "GPS not supported";
}


// ── DETECT MANUAL MAP MOVEMENT ────────────────────────────────────────────────

map.on('dragstart', function(e) {
    userMovedMap = true;
    if (isHikingMode) {
        showRecenterBtn(true);
    }
    resetRecenterTimer();
});

map.on('drag', function() {
    resetRecenterTimer();
});

map.on('dragend', function() {
    resetRecenterTimer();
});

// On zoom, if user zoomed manually, also pause follow
map.on('zoomstart', function(e) {
    if (e.originalEvent) {
        userMovedMap = true;
        if (isHikingMode) showRecenterBtn(true);
        resetRecenterTimer();
    }
});
