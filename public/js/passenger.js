const socket = io();
let map, marker;
let userCoords = null;
let expiryTimer = null;
let secondsLeft = 300; // ৫ মিনিট (৩০০ সেকেন্ড)

// Leaflet.js দিয়ে ফ্রি ওপেনস্ট্রিটম্যাপ ইনিশিয়ালাইজ করা
function initMap() {
    map = L.map('map').setView([23.8103, 90.4125], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
    }).addTo(map);

    if (navigator.geolocation) {
        navigator.geolocation.watchPosition((pos) => {
            userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            map.setView([userCoords.lat, userCoords.lng], 15);
            if (!marker) {
                marker = L.marker([userCoords.lat, userCoords.lng]).addTo(map).bindPopup("আপনার লোকেশন").openPopup();
            } else {
                marker.setLatLng([userCoords.lat, userCoords.lng]);
            }
        });
    }
}

function requestRide() {
    const destination = document.getElementById('destination').value;
    if (!destination) {
        alert('অনুগ্রহ করে গন্তব্য লিখুন');
        return;
    }
    if (!userCoords) {
        alert('আপনার জিওলোকেশন পাওয়া যাচ্ছে না, অনুগ্রহ করে GPS অন করুন।');
        return;
    }

    socket.emit('new_ride_request', {
        pickup: userCoords,
        destination: destination
    });

    document.getElementById('requestBtn').style.display = 'none';
    document.getElementById('cancelBtn').style.display = 'block';

    startTimer();
}

function startTimer() {
    secondsLeft = 300; // ৩০০ সেকেন্ড
    clearInterval(expiryTimer);

    expiryTimer = setInterval(() => {
        secondsLeft--;
        let mins = Math.floor(secondsLeft / 60);
        let secs = secondsLeft % 60;
        
        document.getElementById('statusBox').innerHTML = 
            `🟢 <b>রিকোয়েস্ট চালু আছে!</b><br>চালকরা ম্যাপে আপনাকে দেখছেন।<br>স্বয়ংক্রিয়ভাবে বন্ধ হবে: <b>${mins}:${secs < 10 ? '0' : ''}${secs}</b> মিনিটে।`;

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
        document.getElementById('statusBox').innerHTML = "⏰ ৫ মিনিট পার হওয়ায় রিকোয়েস্টটি সয়ংক্রিয়ভাবে বন্ধ করা হয়েছে।";
    } else {
        document.getElementById('statusBox').innerHTML = "✅ আপনি রিকোয়েস্ট অফ করেছেন (গাড়িতে উঠেছেন)।";
    }
}

window.onload = initMap;