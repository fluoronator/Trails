// gps.js — GPS tracking, mode detection, and return-to-location logic

// ── CONFIG ────────────────────────────────────────────────────────────────────

window.MODE_DISTANCE = 90000; // change to 3200 later
const RECENTER_DELAY_MS = 4000;

// ── STATE ─────────────────────────────────────────────────────────────────────

let userMarker        = null;
let userPulseMarker   = null;
let userLatLng        = null;
let hasCentered       = false;
let isHikingMode      = false;

let userMovedMap      = false;
let isUserInteracting = false;
let recenterTimer     = null;

// expose globally for orientation.js
window.isUserInteracting = false;
window.userMovedMap = false;
window.isHikingMode = false;

// ── UI HELPERS ────────────────────────────────────────────────────────────────

function setMode(mode) {
    const modeBox  = document.getElementById("modeBox");
    const modeIcon = document.getElementById("modeIcon");
    const modeText = document.getElementById("modeText");

    isHikingMode = (mode === "hiking");
    window.isHikingMode = isHikingMode;

    if (isHikingMode) {
        modeBox.className = "hiking";
        modeIcon.textContent = "🥾";
        modeText.textContent = "Hiking Mode";
    } else {
        modeBox.className = "browse";
        modeIcon.textContent = "🗺";
        modeText.textContent = "Browse Mode";

        // reset rotation when leaving hiking mode
        const wrapper = document.getElementById("map-rotate-wrapper");
        if (wrapper) wrapper.style.transform = 'scale(2) rotate(0deg)';
        window.mapRotationDeg = 0;
    }
}

function showRecenterBtn(show) {
    const btn = document.getElementById("recenterBtn");
    if (!btn) return;

    if (show) btn.classList.remove("hidden");
    else btn.classList.add("hidden");
}

// ── RECENTER ──────────────────────────────────────────────────────────────────

function recenterToUser() {
    if (!userLatLng) return;

    map.flyTo(userLatLng, Math.max(map.getZoom(), 15), {
        duration: 1.2
    });

    userMovedMap = false;
    window.userMovedMap = false;

    showRecenterBtn(false);
}

// ── USER MARKER ───────────────────────────────────────────────────────────────

function updateUserMarker(latlng) {
    if (!userMarker) {
        const pulseIcon = L.divIcon({
            html: '<div class="user-location-pulse"></div>',
            className: '',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });

        userPulseMarker = L.marker(latlng, {
            icon: pulseIcon,
            zIndexOffset: 900
        }).addTo(map);

        userMarker = L.circleMarker(latlng, {
            radius: 8,
            color: '#ffffff',
            weight: 2.5,
            fillColor: '#007AFF',
            fillOpacity: 1,
            zIndexOffset: 1000
        }).addTo(map);
    } else {
        userMarker.setLatLng(latlng);
        userPulseMarker.setLatLng(latlng);
    }
}

// ── INTERACTION HANDLING ──────────────────────────────────────────────────────

function startUserInteraction() {
    isUserInteracting = true;
    window.isUserInteracting = true;

    userMovedMap = true;
    window.userMovedMap = true;

    if (isHikingMode) {
        showRecenterBtn(true);
    }

    clearTimeout(recenterTimer);
}

function stopUserInteractionSoon() {
    clearTimeout(recenterTimer);

    recenterTimer = setTimeout(() => {
        isUserInteracting = false;
        window.isUserInteracting = false;

        if (isHikingMode && userMovedMap) {
            recenterToUser();
        }
    }, RECENTER_DELAY_MS);
}

// detect ALL meaningful interactions
map.on('mousedown', startUserInteraction);
map.on('touchstart', startUserInteraction);
map.on('wheel', startUserInteraction);

map.on('dragstart', startUserInteraction);
map.on('zoomstart', startUserInteraction);

// interaction end
map.on('dragend', stopUserInteractionSoon);
map.on('zoomend', stopUserInteractionSoon);

// ── GEOLOCATION ───────────────────────────────────────────────────────────────

if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            userLatLng = L.latLng(lat, lon);

            updateUserMarker(userLatLng);

            // ── MODE DETECTION ────────────────────────────────────────────────
            if (window.trailCenter) {
                const dist = userLatLng.distanceTo(window.trailCenter);
                const shouldHike = dist <= window.MODE_DISTANCE;
                const wasHiking = isHikingMode;

                setMode(shouldHike ? "hiking" : "browse");

                if (shouldHike && !wasHiking && !hasCentered) {
                    map.setView(userLatLng, 15);
                    hasCentered = true;
                }
            } else {
                const el = document.getElementById("modeText");
                if (el) el.textContent = "Locating…";
            }

            // ── INITIAL CENTER ───────────────────────────────────────────────
            if (!hasCentered) {
                map.setView(userLatLng, 15);
                hasCentered = true;
            }

            // ── AUTO FOLLOW (FIXED) ──────────────────────────────────────────
            if (isHikingMode && !userMovedMap && !isUserInteracting) {
                map.panTo(userLatLng, {
                    animate: true,
                    duration: 0.5
                });
            }
        },
        (err) => {
            console.warn("GPS error:", err.message);

            if (!hasCentered) {
                const el = document.getElementById("modeText");
                if (el) el.textContent = "GPS unavailable";
            }
        },
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 15000
        }
    );
} else {
    const el = document.getElementById("modeText");
    if (el) el.textContent = "GPS not supported";
}