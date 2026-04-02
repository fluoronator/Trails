// gps.js — GPS tracking, mode detection, and navigation logic

// ── CONFIG ────────────────────────────────────────────────────────────────────

// Distance in meters from trail center to trigger Hiking Mode.
// Set large for testing so Hiking Mode triggers even from far away.
window.MODE_DISTANCE = 90000;

// How long (ms) of map inactivity before auto-recentering in Hiking Mode.
const RECENTER_DELAY_MS = 4000;

// ── STATE ─────────────────────────────────────────────────────────────────────

let userMarker        = null;
let userPulseMarker   = null;
let userLatLng        = null;
let hasCentered       = false;
let isHikingMode      = false;
let userMovedMap      = false;   // true while user has panned away in hiking mode
let recenterTimer     = null;
let browseAtPark      = false;   // tracks browse button state
let suppressMoveEvent = false;   // prevents programmatic pans from setting userMovedMap

// ── PROGRAMMATIC FLY / PAN ────────────────────────────────────────────────────
// Always use these wrappers so the movestart handler ignores our own movements.

function flyTo(latlng, zoom) {
    suppressMoveEvent = true;
    map.flyTo(latlng, zoom, { duration: 1.2 });
}

function panTo(latlng) {
    suppressMoveEvent = true;
    map.panTo(latlng, { animate: true, duration: 0.5 });
}

// ── UI HELPERS ────────────────────────────────────────────────────────────────

function setMode(mode) {
    const modeBox  = document.getElementById("modeBox");
    const modeIcon = document.getElementById("modeIcon");
    const modeText = document.getElementById("modeText");

    isHikingMode = (mode === "hiking");
    window.isHikingMode = isHikingMode;

    if (isHikingMode) {
        modeBox.className    = "hiking";
        modeIcon.textContent = "🥾";
        modeText.textContent = "Hiking Mode";
        document.getElementById("browseNavBtn").classList.add("hidden");
        document.getElementById("recenterBtn").classList.add("hidden");
    } else {
        modeBox.className    = "browse";
        modeIcon.textContent = "🗺";
        modeText.textContent = "Browse Mode";
        // Reset map rotation — no compass in browse mode
        const wrapper = document.getElementById("map-rotate-wrapper");
        if (wrapper) wrapper.style.transform = "scale(2) rotate(0deg)";
        window.mapRotationDeg = 0;
        // Hide hiking recenter, show browse nav button
        document.getElementById("recenterBtn").classList.add("hidden");
        updateBrowseNavBtn("findme");
        document.getElementById("browseNavBtn").classList.remove("hidden");
        // Clear any pending hiking recenter
        clearTimeout(recenterTimer);
        userMovedMap = false;
    }
}

// ── BROWSE NAV BUTTON ─────────────────────────────────────────────────────────
// Toggles between "Find Me" (fly to user) and "Go to Park" (fly to trail).

function updateBrowseNavBtn(state) {
    const btn   = document.getElementById("browseNavBtn");
    const label = document.getElementById("browseNavLabel");
    const icon  = document.getElementById("browseNavIcon");

    if (state === "atpark") {
        browseAtPark = true;
        btn.classList.add("at-park");
        label.textContent = "Go to Park";
        icon.innerHTML = `
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="none" stroke="currentColor" stroke-width="2"/>
            <circle cx="12" cy="9" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/>`;
    } else {
        browseAtPark = false;
        btn.classList.remove("at-park");
        label.textContent = "Find Me";
        icon.innerHTML = `
            <circle cx="12" cy="12" r="4"/>
            <line x1="12" y1="2" x2="12" y2="6"/>
            <line x1="12" y1="18" x2="12" y2="22"/>
            <line x1="2" y1="12" x2="6" y2="12"/>
            <line x1="18" y1="12" x2="22" y2="12"/>`;
    }
}

function browseNavTap() {
    if (browseAtPark) {
        // Fly back to the park/trail area
        if (window.trailCenter) {
            flyTo(window.trailCenter, 14);
        }
        updateBrowseNavBtn("findme");
    } else {
        // Fly to user location
        if (userLatLng) {
            flyTo(userLatLng, Math.max(map.getZoom(), 15));
        }
        updateBrowseNavBtn("atpark");
    }
}

// ── RECENTER (hiking mode) ────────────────────────────────────────────────────

function showRecenterBtn(show) {
    document.getElementById("recenterBtn").classList.toggle("hidden", !show);
}

function recenterToUser() {
    if (!userLatLng) return;
    flyTo(userLatLng, Math.max(map.getZoom(), 15));
    userMovedMap = false;
    showRecenterBtn(false);
}

// ── INACTIVITY RECENTER TIMER (hiking mode only) ──────────────────────────────

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

// ── CREATE / UPDATE USER MARKER ───────────────────────────────────────────────

function updateUserMarker(latlng) {
    if (!userMarker) {
        const pulseIcon = L.divIcon({
            html: '<div class="user-location-pulse"></div>',
            className: '',
            iconSize:   [16, 16],
            iconAnchor: [8, 8]
        });
        userPulseMarker = L.marker(latlng, { icon: pulseIcon, zIndexOffset: 900 }).addTo(map);

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
                const dist       = userLatLng.distanceTo(window.trailCenter);
                const shouldHike = dist <= window.MODE_DISTANCE;
                const wasHiking  = isHikingMode;

                setMode(shouldHike ? "hiking" : "browse");

                // On first entry into hiking mode, snap to user
                if (shouldHike && !wasHiking && !hasCentered) {
                    flyTo(userLatLng, 15);
                    hasCentered = true;
                }
            } else {
                document.getElementById("modeText").textContent = "Locating…";
            }

            // ── AUTO-CENTER on very first GPS fix ──────────────────────────────
            if (!hasCentered) {
                flyTo(userLatLng, 15);
                hasCentered = true;
            }

            // ── AUTO-FOLLOW in hiking mode ─────────────────────────────────────
            if (isHikingMode && !userMovedMap) {
                panTo(userLatLng);
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

// ── DETECT MANUAL MAP INTERACTION ─────────────────────────────────────────────
// 'movestart' fires for both drag and programmatic moves. suppressMoveEvent
// lets us ignore our own flyTo/panTo calls so only genuine user touches count.

map.on('movestart', function() {
    if (suppressMoveEvent) return;
    if (isHikingMode) {
        userMovedMap = true;
        showRecenterBtn(true);
        resetRecenterTimer();
    }
});

map.on('moveend', function() {
    // Clear suppress flag once the programmatic move has fully settled
    suppressMoveEvent = false;
});

map.on('drag', function() {
    if (isHikingMode && userMovedMap) resetRecenterTimer();
});

map.on('dragend', function() {
    if (isHikingMode && userMovedMap) resetRecenterTimer();
});

// Pinch-to-zoom by user — treat as manual interaction in hiking mode
map.on('zoomstart', function(e) {
    if (suppressMoveEvent) return;
    if (e.originalEvent && isHikingMode) {
        userMovedMap = true;
        showRecenterBtn(true);
        resetRecenterTimer();
    }
});
