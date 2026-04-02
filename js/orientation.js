// orientation.js

let mapPane = null;

function getMapPane() {
    if (!mapPane && map) {
        mapPane = map.getPane('mapPane');
    }
    return mapPane;
}

function rotateMap(deg) {
    const pane = getMapPane();

    if (pane) {
        pane.style.transformOrigin = "50% 50%";
        pane.style.transform = "rotate(" + (-deg) + "deg)";
    }
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

// permission handling
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