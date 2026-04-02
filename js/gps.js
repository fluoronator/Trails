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
        if (wrapper) wrapper.style.transform = 'scale(1.5) rotate(0deg)';
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

// ── ROTATION-AWARE PANNING ────────────────────────────────────────────────────
//
// Problem: Leaflet's drag handler operates in screen-pixel space and has no
// knowledge that the map tile layer is CSS-rotated. A finger moving "up" always
// tells Leaflet to pan north, even when north is to the left on the rotated map.
//
// Fix: disable Leaflet's built-in drag entirely and replace it with our own
// pointer-event handler that:
//   1. Tracks the raw screen-pixel delta between each pointer move.
//   2. Rotates that delta vector by the current map heading.
//   3. Calls map.panBy() with the corrected delta.
//
// This is more reliable than monkey-patching Leaflet internals because we
// control the full delta computation — there's no internal state to fight.

(function installRotationAwareDrag() {

    // Disable Leaflet's own drag so they don't conflict
    map.dragging.disable();

    const container = map.getContainer();

    let isDragging  = false;
    let lastX       = 0;
    let lastY       = 0;

    // ── helpers ──────────────────────────────────────────────────────────────

    function getPoint(e) {
        // Normalise mouse and touch events to a single {x, y}
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    function rotateDelta(dx, dy, deg) {
        // The map is visually rotated by -deg (we applied rotate(-heading)).
        // To make the finger movement feel correct in the rotated frame we
        // rotate the screen-space delta by +deg back to map-space.
        const rad = (deg * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        return {
            dx:  dx * cos + dy * sin,
            dy: -dx * sin + dy * cos
        };
    }

    // ── pointer down ─────────────────────────────────────────────────────────

    function onStart(e) {
        // Ignore multi-touch (pinch zoom) — only handle single finger/mouse
        if (e.touches && e.touches.length !== 1) return;

        isDragging = true;
        const pt = getPoint(e);
        lastX = pt.x;
        lastY = pt.y;

        // Notify the rest of the app that the user started moving the map
        userMovedMap = true;
        if (isHikingMode) showRecenterBtn(true);
        resetRecenterTimer();

        map.fire('dragstart');
    }

    // ── pointer move ─────────────────────────────────────────────────────────

    function onMove(e) {
        if (!isDragging) return;
        if (e.touches && e.touches.length !== 1) {
            // Multi-touch started mid-drag — abort our drag
            isDragging = false;
            return;
        }

        e.preventDefault();   // prevent page scroll on touch

        const pt  = getPoint(e);
        const sdx = pt.x - lastX;   // raw screen delta
        const sdy = pt.y - lastY;
        lastX = pt.x;
        lastY = pt.y;

        const deg = window.mapRotationDeg || 0;

        let mdx, mdy;
        if (deg === 0) {
            // No rotation — pass straight through (avoids float noise)
            mdx = sdx;
            mdy = sdy;
        } else {
            const rotated = rotateDelta(sdx, sdy, deg);
            mdx = rotated.dx;
            mdy = rotated.dy;
        }

        // panBy expects [x, y] where positive x = pan right, positive y = pan down
        // We negate because dragging right should move the map left (pan left = content moves right)
        map.panBy([-mdx, -mdy], { animate: false });

        resetRecenterTimer();
    }

    // ── pointer up ───────────────────────────────────────────────────────────

    function onEnd(e) {
        if (!isDragging) return;
        isDragging = false;
        map.fire('dragend');
        resetRecenterTimer();
    }

    // ── attach events (touch + mouse) ─────────────────────────────────────────

    // Touch
    container.addEventListener('touchstart',  onStart, { passive: true  });
    container.addEventListener('touchmove',   onMove,  { passive: false }); // must be non-passive to preventDefault
    container.addEventListener('touchend',    onEnd,   { passive: true  });
    container.addEventListener('touchcancel', onEnd,   { passive: true  });

    // Mouse (for desktop testing)
    container.addEventListener('mousedown', onStart);
    window   .addEventListener('mousemove', onMove);
    window   .addEventListener('mouseup',   onEnd);

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
