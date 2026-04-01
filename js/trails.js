// trails.js

fetch("data/parks.json")
    .then(res => res.json())
    .then(parks => {

        let park = parks[0];

        // Load trail GeoJSON
        fetch(`data/trails/${park.file}`)
            .then(res => res.json())
            .then(data => {

                const trailLayer = L.geoJSON(data, {

                    style: function (feature) {
                        const p = feature.properties || {};
                        return {
                            color: p.stroke || "#00ff88",
                            weight: Number(p["stroke-width"]) || 4,
                            opacity: p["stroke-opacity"] || 1
                        };
                    },

                    pointToLayer: function (feature, latlng) {
                        const p = feature.properties || {};

                        const marker = L.marker(latlng);

                        if (p.title) {
                            marker.bindTooltip(p.title, {
                                permanent: false,
                                direction: "right",
                                offset: [10, 0],
                                className: "poi-label"
                            });
                        }

                        return marker;
                    },

                    onEachFeature: function (feature, layer) {
                        const p = feature.properties || {};

                        // Trail labels (curved)
                        if (feature.geometry.type === "LineString" && p.title) {
                            layer.setText(p.title, {
                                repeat: false,
                                center: true,
                                offset: 6,
                                attributes: {
                                    fill: p.stroke || "#00ff88",
                                    "font-size": "14",
                                    "font-weight": "bold",
                                    "letter-spacing": "1",
                                    "word-spacing": "2",
                                    "text-shadow": "0 0 3px white"
                                }
                            });
                        }
                    }

                }).addTo(map);

                // Fit map to trails
                map.fitBounds(trailLayer.getBounds());

                // --- POI label visibility ---
                function updatePOILabels() {
                    const zoom = map.getZoom();

                    trailLayer.eachLayer(layer => {
                        if (layer.getTooltip) {
                            if (zoom >= 16) {
                                layer.openTooltip();
                            } else {
                                layer.closeTooltip();
                            }
                        }
                    });
                }

                map.on("zoomend", updatePOILabels);
                updatePOILabels();

                // =====================================================
                // ✅ MODE DETECTION (NEW - SAFE ADDITION)
                // =====================================================

                const modeBox = document.getElementById("modeBox");

                // Use park center if available, otherwise fallback to bounds center
                const parkCenter = park.center
                    ? L.latLng(park.center[0], park.center[1])
                    : trailLayer.getBounds().getCenter();

                const MODE_DISTANCE = 3200; // meters *************************************** change back to 3200 after testing

                function updateMode() {
                    const mapCenter = map.getCenter();
                    const distance = mapCenter.distanceTo(parkCenter);

                    if (distance <= MODE_DISTANCE) {
                        modeBox.innerText = "Hiking Mode";
                    } else {
                        modeBox.innerText = "Browse Mode";
                    }
                }

                // Update on movement
                map.on("moveend", updateMode);

                // Initial set
                updateMode();

            });
    });