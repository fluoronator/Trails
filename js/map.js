// map.js — Map initialization and basemap switching

// ── BASE LAYERS ───────────────────────────────────────────────────────────────

const standardLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 21,
        attribution: "© OpenStreetMap contributors"
    }
);

const topoLayer = L.tileLayer(
    "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    {
        maxNativeZoom: 17,
        maxZoom: 21,
        attribution: "© OpenTopoMap contributors"
    }
);

const satelliteLayer = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
        maxZoom: 21,
        attribution: "Tiles © Esri"
    }
);

// ── ROTATION-AWARE DRAG PATCH ─────────────────────────────────────────────────
// Must run BEFORE L.map() so the patched prototype is used when Leaflet
// creates its internal Draggable instance during map initialization.
//
// When the wrapper is CSS-rotated by -heading, Leaflet drags in screen space
// but the pane lives in rotated wrapper-local space. A finger moving "up"
// on screen moves the pane "up" in wrapper space, but wrapper "up" = screen
// "right" when heading=90°. We fix this by rotating the pointer delta by
// +heading (the inverse of the wrapper rotation) before Leaflet uses it.
//
// Leaflet's _onMove reads the pointer position and computes:
//   _newPos = _startPos + (currentPointer - _startPoint)
// We rotate (currentPointer - _startPoint) by +heading, then reconstruct
// a fake event with adjusted clientX/Y so Leaflet sees the corrected delta.

(function patchDraggableOnMove() {

    const _origOnMove = L.Draggable.prototype._onMove;

    L.Draggable.prototype._onMove = function(e) {
        const deg = window.mapRotationDeg || 0;

        if (deg === 0) {
            return _origOnMove.call(this, e);
        }

        // Extract raw pointer position
        const src = (e.touches && e.touches.length > 0) ? e.touches[0] : e;
        const rawX = src.clientX;
        const rawY = src.clientY;

        // Delta from drag start in screen space
        const sdx = rawX - this._startPoint.x;
        const sdy = rawY - this._startPoint.y;

        // Rotate delta by +heading → converts screen-space movement into
        // wrapper-local movement (wrapper is rotated by -heading)
        const rad = (deg * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const rdx =  sdx * cos + sdy * sin;
        const rdy = -sdx * sin + sdy * cos;

        // Fake clientX/Y so Leaflet computes the rotated delta
        const fakeX = this._startPoint.x + rdx;
        const fakeY = this._startPoint.y + rdy;

        // Wrap the event with overridden coordinates
        const fakeEvent = Object.create(e);
        Object.defineProperty(fakeEvent, 'clientX', { value: fakeX, configurable: true });
        Object.defineProperty(fakeEvent, 'clientY', { value: fakeY, configurable: true });

        if (e.touches && e.touches.length > 0) {
            const origTouch = e.touches[0];
            const fakeTouch = Object.create(origTouch);
            Object.defineProperty(fakeTouch, 'clientX', { value: fakeX, configurable: true });
            Object.defineProperty(fakeTouch, 'clientY', { value: fakeY, configurable: true });

            // touches is a live TouchList — create a plain wrapper
            const fakeTouchList = { 0: fakeTouch, length: e.touches.length, item: (i) => i === 0 ? fakeTouch : e.touches.item(i) };
            Object.defineProperty(fakeEvent, 'touches', { value: fakeTouchList, configurable: true });
        }

        return _origOnMove.call(this, fakeEvent);
    };

})();

// ── MAP INIT ──────────────────────────────────────────────────────────────────

const map = L.map("map", {
    center: [34.7, -86.9],
    zoom: 14,
    maxZoom: 21,
    layers: [standardLayer],
    zoomControl: false,
    attributionControl: true
});

// Track current layer
let currentBaseLayer = standardLayer;

// ── BASEMAP SWITCHER ──────────────────────────────────────────────────────────

const layerMap = {
    standard:  standardLayer,
    topo:      topoLayer,
    satellite: satelliteLayer
};

function switchBasemap(name, btn) {
    const newLayer = layerMap[name];
    if (!newLayer || newLayer === currentBaseLayer) return;

    map.removeLayer(currentBaseLayer);
    map.addLayer(newLayer);
    currentBaseLayer = newLayer;

    // Update active button state
    document.querySelectorAll('.basemap-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}
