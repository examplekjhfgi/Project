const socket = io();
let map;
let passengerMarkers = {};
let activeRequestsData = {};
let driverCoords = [22.4658, 89.0080]; // Default location
let currentDriverSpeedKmH = 0; // Live speed tracker
let routeLine = null;

function initMap() {
    map = L.map('map').setView(driverCoords, 15);

    // Google Maps Light Style
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20
    }).addTo(map);

    if (navigator.geolocation) {
        navigator.geolocation.watchPosition((pos) => {
            driverCoords = [pos.coords.latitude, pos.coords.longitude];
            
            // Convert m/s to km/h (pos.coords.speed meter per second a thake)
            if (pos.coords.speed !== null && pos.coords.speed > 0) {
                currentDriverSpeedKmH = pos.coords.speed * 3.6; // m/s -> km/h
            } else {
                currentDriverSpeedKmH = 0; // Thamiye thakle
            }

            if (!window.driverMarker) {
                const driverAutoIcon = L.divIcon({
                    className: 'auto-marker-icon',
                    html: '🛺',
                    iconSize: [32, 32]
                });
                window.driverMarker = L.marker(driverCoords, {icon: driverAutoIcon}).addTo(map).bindPopup("Apnar Obosthan (EasyBike)");
            } else {
                window.driverMarker.setLatLng(driverCoords);
            }
            renderAllRequests();
        }, (err) => console.log(err), { enableHighAccuracy: true });
    }
}

// Live speed and distance dependent ETA Calculation Function
function calculateDistanceAndETA(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distKm = R * c;

    // Live Speed Logic:
    // Jodi driver er current speed > 5 km/h hoy tobe exact speed calculation hobe
    // Ar jodi gari thame ba aaste thake, tobe average 18 km/h fallback speed dhora hobe
    let activeSpeed = (currentDriverSpeedKmH > 5) ? currentDriverSpeedKmH : 18;

    const timeMinutes = Math.ceil((distKm / activeSpeed) * 60);

    return {
        dist: distKm.toFixed(1),
        eta: timeMinutes < 1 ? "1 er kam" : timeMinutes
    };
}

function speakText(text) {
    if ('speechSynthesis' in window) {
        const speech = new SpeechSynthesisUtterance(text);
        speech.lang = 'bn-BD';
        speech.rate = 0.9;
        window.speechSynthesis.speak(speech);
    }
}

socket.on('current_requests', (requests) => {
    activeRequestsData = requests;
    renderAllRequests();
});

socket.on('passenger_requested', (req) => {
    activeRequestsData[req.id] = req;
    renderAllRequests();
    speakText(`${req.passengerCount || 1} jon notun passenger pawa geche`);
});

socket.on('ride_expired_or_cancelled', (requestId) => {
    if (activeRequestsData[requestId]) {
        delete activeRequestsData[requestId];
        if (passengerMarkers[requestId]) {
            map.removeLayer(passengerMarkers[requestId]);
            delete passengerMarkers[requestId];
        }
        if (routeLine) map.removeLayer(routeLine);
        renderAllRequests();
    }
});

function renderAllRequests() {
    const listDiv = document.getElementById('requestsList');
    const requestKeys = Object.keys(activeRequestsData);

    listDiv.innerHTML = '';

    if (requestKeys.length === 0) {
        listDiv.innerHTML = '<p style="color:#777; text-align:center;">Aasapase kono passenger request koreni...</p>';
        return;
    }

    requestKeys.forEach((id) => {
        const req = activeRequestsData[id];

        // Live speed base kora distance ebong ETA calculation
        const routeData = calculateDistanceAndETA(driverCoords[0], driverCoords[1], req.pickup.lat, req.pickup.lng);

        // Map Marker
        if (!passengerMarkers[id]) {
            const marker = L.marker([req.pickup.lat, req.pickup.lng])
                .addTo(map)
                .bindPopup(`<b>Passenger: ${req.passengerCount || 1} jon</b><br>Gontobbo: ${req.destination}`);
            passengerMarkers[id] = marker;
        }

        // Card Display Layout
        const card = document.createElement('div');
        card.className = 'passenger-card';
        card.innerHTML = `
            <div class="passenger-info">
                <div class="person-badge">👤 ${req.passengerCount || 1} jon</div>
                <div>
                    <div style="font-weight:bold; color:#333;">Gontobbo: ${req.destination}</div>
                    <div style="font-size:12px; color:#666;">Distance: ${routeData.dist} km | Speed: ${Math.round(currentDriverSpeedKmH)} km/h</div>
                </div>
            </div>
            <div class="eta-time">
                ${routeData.eta} min
                <span>pouchate lagbe</span>
            </div>
        `;

        card.onclick = () => focusAndDrawRoute(id, req.pickup.lat, req.pickup.lng);
        listDiv.appendChild(card);
    });
}

function focusAndDrawRoute(requestId, lat, lng) {
    map.flyTo([lat, lng], 17);

    if (routeLine) map.removeLayer(routeLine);
    routeLine = L.polyline([driverCoords, [lat, lng]], {
        color: '#1565c0',
        weight: 5,
        opacity: 0.8,
        dashArray: '10, 10'
    }).addTo(map);

    passengerMarkers[requestId].openPopup();
}

window.onload = initMap;
