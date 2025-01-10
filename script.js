document.addEventListener('DOMContentLoaded', function() {
    // Initialize map (centered on Cleveland for this example)
    const map = L.map('map').setView([41.49932, -81.69436], 13);

    // Add a simple base map
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 20
    }).addTo(map);

    let currentGeoJsonLayer; // To keep track of the currently loaded GeoJSON layer
    let selectedParcels = []; // Array to store selected parcel features
    let totalSelectedAcres = 0; // To track total acreage

    // Event listener for neighborhood selection
    document.getElementById('neighborhood').addEventListener('change', function() {
        const selectedNeighborhood = this.value;
        if (selectedNeighborhood) {
            loadGeoJson(selectedNeighborhood);
        } else {
            // Clear the map if no neighborhood is selected
            if (currentGeoJsonLayer) {
                map.removeLayer(currentGeoJsonLayer);
                currentGeoJsonLayer = null;
                selectedParcels = [];
                totalSelectedAcres = 0;
                updateSelectedParcelsList();
            }
     // Trigger simulation for the selected neighborhood
    const selectedNeighborhood = neighborhoods.find(n => n.id === this.value);
    if (selectedNeighborhood) {
        const params = {
            currentPopulation: selectedNeighborhood.population2020,
            currentVacantLand: selectedNeighborhood.vacantLand2023,
            minPopChange: 0, // Set default min population change
            maxPopChange: 100, // Set default max population change
            minHouseholdSize: 2, // Set default min household size
            maxHouseholdSize: 4, // Set default max household size
            minDensity: 4, // Set default min density
            maxDensity: 12 // Set default max density
        };
        runSimulation(params);
        }
    });

    // Event listener for development limit change
    document.getElementById('devLimit').addEventListener('change', function() {
        const devLimit = parseFloat(this.value);

        if (totalSelectedAcres > devLimit) {
            alert("You have exceeded the development limit. Deselect parcels to continue.");
            this.value = totalSelectedAcres; // Reset to the current total acreage
        }
    });

    // Function to load GeoJSON data for the selected neighborhood
    function loadGeoJson(neighborhood) {
        // Clear any existing GeoJSON layer and reset selections
        if (currentGeoJsonLayer) {
            map.removeLayer(currentGeoJsonLayer);
            selectedParcels = [];
            // Consider whether you want to reset totalSelectedAcres here or not:
            // totalSelectedAcres = 0; 
            updateSelectedParcelsList();
        }

        // Fetch and add the new GeoJSON layer
        fetch(`https://raw.githubusercontent.com/timothydehm/growthlimit/main/data/${neighborhood}.geojson`)
            .then(response => response.json())
            .then(data => {
                currentGeoJsonLayer = L.geoJSON(data, {
                    onEachFeature: function (feature, layer) {
                        layer.on('click', function (e) {
                            toggleParcelSelection(feature, layer);
                        });

                        // Add a tooltip (simplified content creation)
                        layer.bindTooltip(`Parcel ID: ${feature.properties.parcelpin}<br>Acres: ${feature.properties.acres}<br>TOD Score: ${feature.properties.TOD_Index}`);
                    }
                }).addTo(map);
            })
            .catch(error => {
                console.error('Error loading GeoJSON:', error);
                alert('Error loading parcel data. Please make sure the neighborhood data exists.');
            });
    }

    // Function to toggle parcel selection
    function toggleParcelSelection(feature, layer) {
        const devLimit = parseFloat(document.getElementById('devLimit').value);
        const parcelAcreage = parseFloat(feature.properties.acres);

        // Check if the parcel is already selected
        const parcelIndex = selectedParcels.findIndex(p => p.properties.parcelpin === feature.properties.parcelpin);

        if (parcelIndex > -1) {
            // Deselect the parcel
            selectedParcels.splice(parcelIndex, 1);
            totalSelectedAcres -= parcelAcreage;
            layer.setStyle({ fillColor: '#3388ff', fillOpacity: 0.5 }); // Reset to default style (or similar)
        } else {
            // Select the parcel only if it doesn't exceed the limit
            if (totalSelectedAcres + parcelAcreage <= devLimit) {
                selectedParcels.push(feature);
                totalSelectedAcres += parcelAcreage;
                layer.setStyle({ fillColor: 'red', fillOpacity: 0.7 }); // Highlight selected parcel
            } else {
                alert("Adding this parcel would exceed the development limit.");
            }
        }

        updateSelectedParcelsList();
    }

    // Function to update the list of selected parcels in the sidebar
    function updateSelectedParcelsList() {
        const list = document.getElementById('selectedParcels');
        list.innerHTML = ''; // Clear the list

        selectedParcels.forEach(parcel => {
            const listItem = document.createElement('li');
            listItem.textContent = `Parcel ID: ${parcel.properties.parcelpin}, Acres: ${parcel.properties.acres}, TOD Score: ${parcel.properties.TOD_Index}`;
            list.appendChild(listItem);
        });
    }

    // Event listener for the download button
    document.getElementById('downloadButton').addEventListener('click', function() {
        downloadSelectedParcels();
    });

    // Function to download selected parcels as GeoJSON
    function downloadSelectedParcels() {
        if (selectedParcels.length === 0) {
            alert('No parcels selected for download.');
            return;
        }

        const geojson = {
            type: "FeatureCollection",
            features: selectedParcels
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(geojson));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "selected_parcels.geojson");
        document.body.appendChild(downloadAnchorNode); // Required for Firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }
});
