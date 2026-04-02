// orientation.js — Compass-based map rotation (Hiking Mode only)
//
// APPROACH:
//   Instead of trying to rotate Leaflet's internal canvas (which breaks tile
//   seams and doesn't work well), we rotate the entire #map-rotate-wrapper div.
//   The wrapper is oversized (150vmax) so corners never show through when rotated.
//   All UI controls live in #ui-overlay which is NOT rotated, so they stay upright.
//   The north arrow rotates counter to the map so it always points true north.

// currentHeading is kept as an UNBOUNDED float (can go beyond 360 or below 0).
// This prevents the north-crossing spin: instead of normalizing to [0,360) and
// letting the interpolation pick the long way around, we always accumulate the
// shortest-angle delta so the value smoothly crosses the 0/360 boundary.
let currentHeading  = 0;   // unbounded — do NOT normalize to [0,360)
let targetHeading   = 0;   // also unbounded, updated each sensor event
let smoothingActive = false;

const mapWrapper = document.getElementById("map-rotate-wrapper");
const northArrow  = document.getElementById("northArrow");

// ── SMOOTH ROTATION ────────────────────────────────────────────────────────────

// Returns the shortest signed delta to go from angle `from` to angle `to`,
// both treated as compass degrees. Result is always in (-180, +180].
function shortestAngleDelta(from, to) {
    return ((to - from + 540) % 360) - 180;
}

function applyRotation(heading) {
    // scale(2) keeps corners covered at all angles on any phone aspect ratio.
    // rotate() spins the map. The wrapper is 100vw×100vh in layout space so
    // it never inflates vw/vh calculations for the UI overlay.
    mapWrapper.style.transform = `scale(2) rotate(${-heading}deg)`;

    // North arrow counter-rotates to always visually point true north.
    const normalizedHeading = ((heading % 360) + 360) % 360;
    northArrow.style.transform = `rotate(${normalizedHeading}deg)`;

    // Expose the current visual rotation so gps.js can correct drag vectors.
    window.mapRotationDeg = ((heading % 360) + 360) % 360;
}

// ── HEADING HANDLER ────────────────────────────────────────────────────────────

function handleOrientation(event) {
    if (!window.isHikingMode) {
        if (mapWrapper) {
            mapWrapper.style.transform = 'scale(2) rotate(0deg)';
        }
        window.mapRotationDeg = 0;
        return;
    }

    let rawHeading;

    // iOS: webkitCompassHeading is clockwise degrees from magnetic north — ideal.
    if (typeof event.webkitCompassHeading === 'number' &&
        event.webkitCompassHeading >= 0) {
        rawHeading = event.webkitCompassHeading;
    }
    // Android/standard: alpha is CCW degrees from north. Convert to CW.
    else if (event.alpha !== null && event.alpha !== undefined) {
        rawHeading = (360 - event.alpha) % 360;
    }

    if (rawHeading === undefined) return;

    // Instead of assigning rawHeading directly to targetHeading,
    // advance targetHeading by the shortest delta from its current value.
    // This keeps targetHeading unbounded and prevents wrap-around jumps.
    const delta = shortestAngleDelta(targetHeading, rawHeading);
    targetHeading += delta;

    if (!smoothingActive) {
        smoothingActive = true;
        smoothRotation();
    }
}

function smoothRotation() {
    // delta is always in (-180, +180] because both values are unbounded and
    // currentHeading tracks targetHeading closely — no wrap-around possible.
    const delta = targetHeading - currentHeading;

    if (Math.abs(delta) < 0.3) {
        currentHeading = targetHeading;
        applyRotation(currentHeading);
        smoothingActive = false;
        return;
    }

    // Ease toward target — 0.15 keeps motion smooth without lag
    currentHeading += delta * 0.15;

    applyRotation(currentHeading);
    requestAnimationFrame(smoothRotation);
}

// ── PERMISSION & EVENT LISTENER ────────────────────────────────────────────────

function startOrientationTracking() {
    window.addEventListener("deviceorientation", handleOrientation, true);
}

// iOS 13+ requires an explicit permission request on user gesture
if (typeof DeviceOrientationEvent !== 'undefined' &&
    typeof DeviceOrientationEvent.requestPermission === 'function') {

    // Show a subtle prompt the first time the user taps the screen
    let permissionGranted = false;

    document.body.addEventListener("touchend", function requestPermission() {
        if (permissionGranted) return;

        DeviceOrientationEvent.requestPermission()
            .then(state => {
                if (state === 'granted') {
                    permissionGranted = true;
                    startOrientationTracking();
                }
            })
            .catch(console.error);

        // Only fire once; remove after first attempt
        document.body.removeEventListener("touchend", requestPermission);
    }, { passive: true });

} else {
    // Android and desktop — just start listening
    startOrientationTracking();
}

// ── EXPOSE isHikingMode to window for orientation.js ─────────────────────────
// gps.js sets window.isHikingMode by toggling the module-level var;
// we read it here. It's set via the setMode() function in gps.js.
// Ensure the variable exists to avoid reference errors on first load.
if (typeof window.isHikingMode === 'undefined') {
    window.isHikingMode = false;
}
