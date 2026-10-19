const socket = io();
let map;
let passengerMarkers = {};

function initMap() {
    map = L.map('map').setView([23.8103, 90.4125], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
    }).addTo(map);
}

// বাংলা ভয়েস অ্যালার্ট ফাংশন
function speakText(text) {
    if ('speechSynthesis' in window) {
        const speech = new SpeechSynthesisUtterance(text);
        speech.lang = 'bn-BD'; // বাংলা ভয়েস
        speech.rate = 0.9;
        window.speechSynthesis.speak(speech);
    }
}

// বর্তমান রিকোয়েস্টসমূহ
socket.on('current_requests', (requests) => {
    Object.values(requests).forEach(req => addPassengerToMap(req));
});

// নতুন প্যাসেঞ্জার যুক্ত হলে
socket.on('passenger_requested', (req) => {
    addPassengerToMap(req);
    speakText("নতুন প্যাসেঞ্জার পাওয়া গেছে!");
});

// প্যাসেঞ্জার রাইড ক্যানসেল বা পিকড-আপ হলে
socket.on('ride_expired_or_cancelled', (requestId) => {
    removePassengerFromMap(requestId);
});

function addPassengerToMap(req) {
    if (passengerMarkers[req.id]) return;

    // ম্যাপে মার্কার যোগ
    const marker = L.marker([req.pickup.lat, req.pickup.lng])
        .addTo(map)
        .bindPopup(`<b>গন্তব্য: ${req.destination}</b>`)
        .openPopup();

    passengerMarkers[req.id] = marker;
    updateUI();
}

function removePassengerFromMap(requestId) {
    if (passengerMarkers[requestId]) {
        map.removeLayer(passengerMarkers[requestId]);
        delete passengerMarkers[requestId];
        updateUI();
    }
}

function updateUI() {
    const listDiv = document.getElementById('requestsList');
    const count = Object.keys(passengerMarkers).length;

    if (count === 0) {
        listDiv.innerHTML = '<p style="text-align:center;">আশেপাশে কোনো যাত্রী রিকোয়েস্ট করেনি...</p>';
    } else {
        listDiv.innerHTML = `<div class="request-card"><b>গাড়ির জন্য অপেক্ষমান যাত্রী আছে (${count} জন)</b><br>ম্যাপের পিন চেপে লোকেশন দেখুন।</div>`;
    }
}

window.onload = initMap;