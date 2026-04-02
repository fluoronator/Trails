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
        // In browse mode, no rotation
        setMapRotation(0);
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

// ── ROTATION-AWARE PANNING ────────────────────────────────────────────────────
//
// Problem: when the map wrapper is CSS-rotated, Leaflet still thinks the map is
// north-up. A finger drag that moves "up" on screen tells Leaflet to pan north —
// but if the map is rotated 90° (facing East), "up on screen" is actually East,
// so the map pans in the wrong direction.
//
// Fix: patch Leaflet's internal drag handler to rotate the pixel movement vector
// by the current map heading before Leaflet interprets it.  We do this by
// monkey-patching the Dragging handler's _move method right after the map loads.

(function patchLeafletDrag() {
    const dragging = map.dragging;

    // Wait one tick so Leaflet has fully initialised its handlers
    setTimeout(() => {
        const handler = dragging._draggable;
        if (!handler) return;

        const originalOnMove = handler._onMove.bind(handler);

        handler._onMove = function(e) {
            const deg = window.mapRotationDeg || 0;

            // Only correct when the map is actually rotated
            if (deg === 0) {
                return originalOnMove(e);
            }

            // Clone the event so we don't mutate the real one
            const rad = (deg * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            // Leaflet reads clientX/clientY from the event to compute the drag delta.
            // We need to rotate those coordinates around the map's center point so
            // that screen-space movement maps correctly to geographic movement.
            const mapContainer = map.getContainer();
            const rect = mapContainer.getBoundingClientRect();

            // Use the visual center of the viewport (not the rotated container)
            const cx = window.innerWidth  / 2;
            const cy = window.innerHeight / 2;

            // Extract the raw pointer position
            const touches = e.touches || e.changedTouches;
            const source  = touches ? touches[0] : e;
            const px = source.clientX - cx;
            const py = source.clientY - cy;

            // Rotate the pointer position by -deg (inverse of map rotation)
            const rx =  px * cos + py * sin;
            const ry = -px * sin + py * cos;

            // Build a synthetic event with the corrected coordinates
            const fakeEvent = new Proxy(e, {
                get(target, prop) {
                    if (prop === 'clientX') return rx + cx;
                    if (prop === 'clientY') return ry + cy;
                    if (prop === 'touches' || prop === 'changedTouches') {
                        // Wrap the touches array with corrected values
                        const orig = target[prop];
                        if (!orig) return orig;
                        return new Proxy(orig, {
                            get(tarr, tidx) {
                                if (tidx === '0' || tidx === 0) {
                                    return new Proxy(tarr[0], {
                                        get(tt, tp) {
                                            if (tp === 'clientX') return rx + cx;
                                            if (tp === 'clientY') return ry + cy;
                                            return tt[tp];
                                        }
                                    });
                                }
                                return tarr[tidx];
                            }
                        });
                    }
                    const val = target[prop];
                    return typeof val === 'function' ? val.bind(target) : val;
                }
            });

            return originalOnMove(fakeEvent);
        };
    }, 0);
})();

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
