const socket = io();
let map, marker;
let userCoords = null;
let expiryTimer = null;
let secondsLeft = 300;
let driverMarkers = {}; // Ase pase thaka drivers marker store korar jonno

function initMap() {
    map = L.map('map').setView([22.4658, 89.0080], 15);
    
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20
    }).addTo(map);

    if (navigator.geolocation) {
        navigator.geolocation.watchPosition((pos) => {
            userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            
            if (!marker) {
                map.setView([userCoords.lat, userCoords.lng], 16);
                marker = L.marker([userCoords.lat, userCoords.lng]).addTo(map).bindPopup("Apnar Obosthan").openPopup();
            } else {
                marker.setLatLng([userCoords.lat, userCoords.lng]);
            }
        });
    }
}

// 1. Sob Active Driver-der Map-e render kora
socket.on('current_drivers', (drivers) => {
    Object.values(drivers).forEach(driver => updateDriverOnMap(driver));
});

// 2. Kono driver er location change holei live map-e icon move korbe
socket.on('driver_location_changed', (driver) => {
    updateDriverOnMap(driver);
});

// 3. Driver offline gele map theke soriye fela
socket.on('driver_offline', (driverId) => {
    if (driverMarkers[driverId]) {
        map.removeLayer(driverMarkers[driverId]);
        delete driverMarkers[driverId];
    }
});

function updateDriverOnMap(driver) {
    const driverIcon = L.divIcon({
        className: 'auto-marker-icon',
        html: '🛺',
        iconSize: [30, 30]
    });

    if (!driverMarkers[driver.id]) {
        driverMarkers[driver.id] = L.marker([driver.lat, driver.lng], { icon: driverIcon })
            .addTo(map)
            .bindPopup("Ase pase thaka EasyBike");
    } else {
        driverMarkers[driver.id].setLatLng([driver.lat, driver.lng]);
    }
}

function requestRide() {
    const destination = document.getElementById('destination').value;
    const passengerCountElem = document.getElementById('passengerCount');
    const selectedCount = passengerCountElem ? parseInt(passengerCountElem.value, 10) : 1;

    if (!destination) {
        alert('Anugraha kare gontobbo likhun');
        return;
    }
    if (!userCoords) {
        alert('Apnar GPS on karun');
        return;
    }

    socket.emit('new_ride_request', {
        pickup: userCoords,
        destination: destination,
        passengerCount: selectedCount
    });

    document.getElementById('requestBtn').style.display = 'none';
    document.getElementById('cancelBtn').style.display = 'block';

    startTimer();
}

function startTimer() {
    secondsLeft = 300;
    clearInterval(expiryTimer);

    expiryTimer = setInterval(() => {
        secondsLeft--;
        let mins = Math.floor(secondsLeft / 60);
        let secs = secondsLeft % 60;
        
        document.getElementById('statusBox').innerHTML = 
            `🟢 <b>Request Chalu Ase!</b><br>Chalokra apnake map-e dekhten.<br>Auto off hobe: <b>${mins}:${secs < 10 ? '0' : ''}${secs}</b> minute-e.`;

        if (secondsLeft <= 0) {
            clearInterval(expiryTimer);
            cancelRide(true);
        }
    }, 1000);
}

function cancelRide(isAuto = false) {
    clearInterval(expiryTimer);
    socket.emit('cancel_ride_request');
    
    document.getElementById('requestBtn').style.display = 'block';
    document.getElementById('cancelBtn').style.display = 'none';

    if (isAuto) {
        document.getElementById('statusBox').innerHTML = "⏰ 5 minute par hōẏāẏ request bondho kora hoyese.";
    } else {
        document.getElementById('statusBox').innerHTML = "✅ Apni request off korechen.";
    }
}

window.onload = initMap;
