// trails.js — Load GeoJSON trails and POIs onto the map

window.trailCenter = null;

// ── LOAD TRAILS ───────────────────────────────────────────────────────────────

fetch('data/parks.json')
    .then(r => r.json())
    .then(parks => {
        const park = parks[0];
        return fetch(park.file);
    })
    .then(r => r.json())
    .then(data => {

        const trails = L.geoJSON(data, {

            // ── LINE STYLING from GeoJSON properties ──────────────────────────
            style: function(feature) {
                const p = feature.properties || {};
                return {
                    color:   p.stroke          || "#00ff88",
                    weight:  Number(p["stroke-width"]) || 4,
                    opacity: p["stroke-opacity"] !== undefined ? p["stroke-opacity"] : 1,
                    lineJoin: "round",
                    lineCap:  "round"
                };
            },

            // ── POI MARKERS ────────────────────────────────────────────────────
            pointToLayer: function(feature, latlng) {
                const p = feature.properties || {};

                // Custom SVG pin using the trail color or default red
                const color = p.stroke || "#e74c3c";
                const svgPin = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
                        <path d="M14 0C6.27 0 0 6.27 0 14c0 9.94 14 22 14 22S28 23.94 28 14C28 6.27 21.73 0 14 0z"
                              fill="${color}" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>
                        <circle cx="14" cy="14" r="6" fill="white" fill-opacity="0.9"/>
                    </svg>`;

                const icon = L.divIcon({
                    html: svgPin,
                    className: '',
                    iconSize:   [28, 36],
                    iconAnchor: [14, 36],
                    popupAnchor: [0, -36]
                });

                return L.marker(latlng, { icon });
            },

            // ── POPUPS & LABELS ────────────────────────────────────────────────
            onEachFeature: function(feature, layer) {
                const p = feature.properties || {};

                // POI points
                if (feature.geometry.type === "Point") {
                    const title = p.title || p.name || "";
                    if (title.trim()) {
                        // Tooltip label (shown when zoomed in)
                        layer.bindTooltip(title.trim(), {
                            permanent: false,
                            direction:  "right",
                            offset:     [10, -18],
                            className:  "poi-label"
                        });

                        // Popup with description
                        const desc = p.description || p.desc || "";
                        const popupContent = `
                            <div style="font-family:'Inter',sans-serif; min-width:140px;">
                                <b style="font-family:'Rajdhani',sans-serif; font-size:15px;">${title.trim()}</b>
                                ${desc ? `<p style="margin:6px 0 0; font-size:12px; color:#555;">${desc}</p>` : ""}
                            </div>`;
                        layer.bindPopup(popupContent);
                    }
                }

                // Trail lines — draw name along path
                if (feature.geometry.type === "LineString") {
                    const title = p.title || p.name || "";
                    if (title.trim() && layer.setText) {
                        layer.setText(title.trim(), {
                            repeat:      false,
                            center:      true,
                            offset:      -5,
                            orientation: "flip",
                            attributes: {
                                fill:           p.stroke || "#00ff88",
                                "font-family":  "Rajdhani, sans-serif",
                                "font-size":    "13",
                                "font-weight":  "700",
                                "letter-spacing": "1",
                                "paint-order":  "stroke",
                                "stroke":       "rgba(0,0,0,0.7)",
                                "stroke-width": "3"
                            }
                        });
                    }

                    // Popup on trail click
                    const name = p.title || p.name || "Trail";
                    if (name.trim()) {
                        layer.bindPopup(`<b style="font-family:'Rajdhani',sans-serif; font-size:15px;">${name.trim()}</b>`);
                    }
                }
            }

        }).addTo(map);

        // Store trail center for mode detection
        const bounds = trails.getBounds();
        if (bounds.isValid()) {
            window.trailCenter = bounds.getCenter();
            map.fitBounds(bounds, { padding: [40, 40] });
        }

        // ── POI LABEL VISIBILITY by zoom ───────────────────────────────────────
        function updatePOILabels() {
            const zoom = map.getZoom();
            trails.eachLayer(layer => {
                if (layer.getTooltip) {
                    const tt = layer.getTooltip();
                    if (tt) {
                        if (zoom >= 15) {
                            layer.openTooltip();
                        } else {
                            layer.closeTooltip();
                        }
                    }
                }
            });
        }

        updatePOILabels();
        map.on("zoomend", updatePOILabels);
    })
    .catch(err => {
        console.error("Error loading trails:", err);
        document.getElementById("modeText").textContent = "Error loading trails";
    });
