const socket = io();
let map, marker;
let userCoords = null;
let expiryTimer = null;
let secondsLeft = 300;

function initMap() {
    map = L.map('map').setView([22.4658, 89.0080], 15);
    
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20
    }).addTo(map);

    if (navigator.geolocation) {
        navigator.geolocation.watchPosition((pos) => {
            userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            map.setView([userCoords.lat, userCoords.lng], 16);
            
            if (!marker) {
                marker = L.marker([userCoords.lat, userCoords.lng]).addTo(map).bindPopup("আপনার অবস্থান").openPopup();
            } else {
                marker.setLatLng([userCoords.lat, userCoords.lng]);
            }
        });
    }
}

function requestRide() {
    const destination = document.getElementById('destination').value;
    const passengerCountElem = document.getElementById('passengerCount');
    const selectedCount = passengerCountElem ? parseInt(passengerCountElem.value, 10) : 1;

    if (!destination) {
        alert('অনুগ্রহ করে গন্তব্য লিখুন');
        return;
    }
    if (!userCoords) {
        alert('আপনার GPS অন করুন');
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
            `🟢 <b>রিকোয়েস্ট চালু আছে!</b><br>চালকরা আপনাকে ম্যাপে দেখছেন।<br>স্বয়ংক্রিয়ভাবে বন্ধ হবে: <b>${mins}:${secs < 10 ? '0' : ''}${secs}</b> মিনিটে।`;

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
        document.getElementById('statusBox').innerHTML = "⏰ ৫ মিনিট পার হওয়ায় রিকোয়েস্টটি বন্ধ করা হয়েছে।";
    } else {
        document.getElementById('statusBox').innerHTML = "✅ আপনি রিকোয়েস্ট অফ করেছেন।";
    }
}

window.onload = initMap;
