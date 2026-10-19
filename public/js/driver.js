const socket = io();
let map;
let passengerMarkers = {};
let activeRequestsData = {};
let driverCoords = [22.4658, 89.0080];
let currentDriverSpeedKmH = 0;
let routeLine = null;

// ইংরেজি সংখ্যাকে বাংলায় রূপান্তর করার হেলপার ফাংশন
function toBanglaNumber(n) {
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return n.toString().replace(/\d/g, (x) => banglaDigits[x]);
}

function initMap() {
    map = L.map('map').setView(driverCoords, 15);

    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20
    }).addTo(map);

    if (navigator.geolocation) {
        navigator.geolocation.watchPosition((pos) => {
            driverCoords = [pos.coords.latitude, pos.coords.longitude];
            
            if (pos.coords.speed !== null && pos.coords.speed > 0) {
                currentDriverSpeedKmH = pos.coords.speed * 3.6;
            } else {
                currentDriverSpeedKmH = 0;
            }

            if (!window.driverMarker) {
                const driverAutoIcon = L.divIcon({
                    className: 'auto-marker-icon',
                    html: '🛺',
                    iconSize: [32, 32]
                });
                window.driverMarker = L.marker(driverCoords, {icon: driverAutoIcon}).addTo(map).bindPopup("আপনার অবস্থান (ইজিবাইক)");
            } else {
                window.driverMarker.setLatLng(driverCoords);
            }
            renderAllRequests();
        }, (err) => console.log(err), { enableHighAccuracy: true });
    }
}

function calculateDistanceAndETA(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distKm = R * c;

    let activeSpeed = (currentDriverSpeedKmH > 5) ? currentDriverSpeedKmH : 18;
    const timeMinutes = Math.ceil((distKm / activeSpeed) * 60);

    let formattedETA = "";
    if (timeMinutes <= 1) {
        formattedETA = "১ মিনিটের কম";
    } else {
        formattedETA = `${toBanglaNumber(timeMinutes)} মিনিট`;
    }

    return {
        dist: toBanglaNumber(distKm.toFixed(1)),
        etaText: formattedETA
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
    const countBn = toBanglaNumber(req.passengerCount || 1);
    speakText(`${countBn} জন নতুন প্যাসেঞ্জার পাওয়া গেছে`);
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
        listDiv.innerHTML = '<p style="color:#777; text-align:center;">আশেপাশে কোনো যাত্রী রিকোয়েস্ট করেনি...</p>';
        return;
    }

    requestKeys.forEach((id) => {
        const req = activeRequestsData[id];
        const routeData = calculateDistanceAndETA(driverCoords[0], driverCoords[1], req.pickup.lat, req.pickup.lng);
        const countBn = toBanglaNumber(req.passengerCount || 1);
        const speedBn = toBanglaNumber(Math.round(currentDriverSpeedKmH));

        if (!passengerMarkers[id]) {
            const marker = L.marker([req.pickup.lat, req.pickup.lng])
                .addTo(map)
                .bindPopup(`<b>প্যাসেঞ্জার: ${countBn} জন</b><br>গন্তব্য: ${req.destination}`);
            passengerMarkers[id] = marker;
        }

        const card = document.createElement('div');
        card.className = 'passenger-card';
        card.innerHTML = `
            <div class="passenger-info">
                <div class="person-badge">👤 ${countBn} জন</div>
                <div>
                    <div style="font-weight:bold; color:#333;">গন্তব্য: ${req.destination}</div>
                    <div style="font-size:12px; color:#666;">দূরত্ব: ${routeData.dist} কিমি | গতি: ${speedBn} কিমি/ঘণ্টা</div>
                </div>
            </div>
            <div class="eta-time">
                ${routeData.etaText}
                <span>পৌঁছাতে লাগবে</span>
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
