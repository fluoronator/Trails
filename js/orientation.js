// orientation.js — Compass-based map rotation (Hiking Mode only)
//
// APPROACH:
//   Instead of trying to rotate Leaflet's internal canvas (which breaks tile
//   seams and doesn't work well), we rotate the entire #map-rotate-wrapper div.
//   The wrapper is oversized (150vmax) so corners never show through when rotated.
//   All UI controls live in #ui-overlay which is NOT rotated, so they stay upright.
//   The north arrow rotates counter to the map so it always points true north.

let currentHeading  = 0;
let targetHeading   = 0;
let smoothingActive = false;

const mapWrapper = document.getElementById("map-rotate-wrapper");
const northArrow  = document.getElementById("northArrow");

// ── SMOOTH ROTATION ────────────────────────────────────────────────────────────

function shortestAngleDelta(from, to) {
    let delta = ((to - from + 540) % 360) - 180;
    return delta;
}

function applyRotation(heading) {
    // Rotate wrapper so that the heading direction points "up" (away from user)
    // A heading of 90° (East) should rotate the map -90° so East is up.
    mapWrapper.style.transform =
        `translate(-50%, -50%) rotate(${-heading}deg)`;

    // Counter-rotate the north arrow so N always visually points north on screen
    // The arrow SVG has N pointing up by default. We need to rotate it by +heading
    // so it "undoes" the map rotation and keeps pointing at true north.
    northArrow.style.transform = `rotate(${heading}deg)`;
}

// ── HEADING HANDLER ────────────────────────────────────────────────────────────

function handleOrientation(event) {
    // Only rotate map in Hiking Mode
    if (!window.isHikingMode) {
        // Restore north-up
        if (mapWrapper) {
            mapWrapper.style.transform = 'translate(-50%, -50%) rotate(0deg)';
        }
        return;
    }

    let heading;

    // iOS (webkit) gives compassHeading directly — most reliable
    if (typeof event.webkitCompassHeading === 'number' &&
        event.webkitCompassHeading >= 0) {
        heading = event.webkitCompassHeading;
    }
    // Android/standard: alpha is degrees from north, counterclockwise
    // Convert to clockwise heading: heading = (360 - alpha) % 360
    else if (event.alpha !== null && event.alpha !== undefined) {
        heading = (360 - event.alpha) % 360;
    }

    if (heading === undefined) return;

    targetHeading = heading;

    // Smooth interpolation to avoid jitter
    if (!smoothingActive) {
        smoothingActive = true;
        smoothRotation();
    }
}

function smoothRotation() {
    const delta = shortestAngleDelta(currentHeading, targetHeading);

    if (Math.abs(delta) < 0.3) {
        // Close enough — snap and stop
        currentHeading = targetHeading;
        applyRotation(currentHeading);
        smoothingActive = false;
        return;
    }

    // Ease toward target (0.15 = smooth; increase for faster response)
    currentHeading += delta * 0.15;
    currentHeading  = ((currentHeading % 360) + 360) % 360;

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
