window.trailCenter = null;

// Load parks list
fetch('data/parks.json')
.then(r => r.json())
.then(parks => {

    // For now just load the first park
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

        // 📍 Default red Leaflet markers for POIs
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

        // 🏷 Attach popups using title
        onEachFeature: function(feature, layer) {
            let p = feature.properties || {};

            if (p.title) {

   		 // Always available on click (optional fallback)
    		layer.bindPopup("<b>" + p.title + "</b>");

    		// Label next to marker
    		layer.bindTooltip(p.title, {
        	permanent: true,
        	direction: "right",
        	offset: [10, 0],
        	className: "poi-label"
    		});
	}
        }

    }).addTo(map);

    let bounds = trails.getBounds();
    window.trailCenter = bounds.getCenter();

    map.fitBounds(bounds);

    document.getElementById("modeBox").innerHTML = "Browse Mode";

})
.catch(err => {
    document.getElementById("modeBox").innerHTML = "Error loading trails";
    console.log(err);
});