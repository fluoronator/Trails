let mapWrapper = document.getElementById("mapWrapper");

function rotateMap(deg) {
    mapWrapper.style.transform = "rotate(" + (-deg) + "deg)";
}

function isHikingMode() {
    let modeBox = document.getElementById("modeBox");
    return modeBox && modeBox.innerText.includes("Hiking");
}

function handleOrientation(event) {

    let heading;

    if (event.webkitCompassHeading !== undefined) {
        heading = event.webkitCompassHeading;
    }
    else if (event.alpha !== null) {
        heading = 360 - event.alpha;
    }

    if (heading !== undefined) {
        if (isHikingMode()) {
            rotateMap(heading);
        } else {
            rotateMap(0);
        }
    }
}

// permission (unchanged)
if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    document.body.addEventListener("click", function() {
        DeviceOrientationEvent.requestPermission()
        .then(function(permissionState) {
            if (permissionState === 'granted') {
                window.addEventListener("deviceorientation", handleOrientation);
            }
        });
    }, { once: true });
} else {
    window.addEventListener("deviceorientation", handleOrientation);
}