window.trailCenter = null;

// Load parks list
fetch('data/parks.json')
.then(r => r.json())
.then(parks => {

    let park = parks[0];
    return fetch(park.file);

})
.then(r => r.json())
.then(data => {

    let trails = L.geoJSON(data, {

        // 🎨 Use CalTopo styling
        style: function(feature) {
            let p = feature.properties || {};

            return {
                color: p.stroke || "#00ff88",
                weight: Number(p["stroke-width"]) || 4,
                opacity: p["stroke-opacity"] || 1
            };
        },

        // 📍 Default red pins
        pointToLayer: function(feature, latlng) {

            let redIcon = L.icon({
                iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",

                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });

            return L.marker(latlng, { icon: redIcon });
        },

        onEachFeature: function(feature, layer) {
            let p = feature.properties || {};

            // 🟢 POIs
            if (feature.geometry.type === "Point") {

                if (p.title) {

                    layer.bindTooltip(p.title, {
                        permanent: false,
                        direction: "right",
                        offset: [10, 0],
                        className: "poi-label"
                    });

                    layer.bindPopup("<b>" + p.title + "</b>");
                }
            }

            // 🟡 TRAILS — curved text
            if (feature.geometry.type === "LineString") {

                if (p.title && layer.setText) {

                    layer.setText(p.title, {
                        repeat: false,
                        center: true,
                        offset: 6,
                        orientation: 0,

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
        }

    }).addTo(map);

    let bounds = trails.getBounds();
    window.trailCenter = bounds.getCenter();

    map.fitBounds(bounds);

    document.getElementById("modeBox").innerHTML = "Browse Mode";

    // 🔍 POI label visibility
    function updatePOILabels() {
        let zoom = map.getZoom();

        trails.eachLayer(layer => {
            if (layer.getTooltip()) {
                if (zoom >= 16) {
                    layer.openTooltip();
                } else {
                    layer.closeTooltip();
                }
            }
        });
    }

    updatePOILabels();
    map.on("zoomend", updatePOILabels);

})
.catch(err => {
    document.getElementById("modeBox").innerHTML = "Error loading trails";
    console.log(err);
});