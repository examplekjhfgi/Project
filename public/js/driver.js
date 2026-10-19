const socket = io();
let map;
let passengerMarkers = {};
let activeRequestsData = {};

function initMap() {
    // বাংলাদেশ লোকেশনকে কেন্দ্র করে ম্যাপ ইনিশিয়ালাইজেশন
    map = L.map('map', {
        center: [23.8103, 90.4125],
        zoom: 15,
        zoomControl: true
    });

    // Google Maps 3D/Hybrid-like Sat/Road Tile Layer (ফ্রি ইসম্রি / গুগল স্যাটেলাইট টাইলস)
    const googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps'
    });

    // Google Streets View Layer
    const googleStreets = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps'
    });

    // ডিফল্ট গুগল হাইব্রিড (স্যাটেলাইট + রোড ৩ডি লুক) সেট করা হলো
    googleHybrid.addTo(map);

    // চালকের কাছে টাইপ সুইচ করার সুযোগ (Satellite vs Standard Street Map)
    const baseMaps = {
        "Google 3D/Hybrid View": googleHybrid,
        "Google Street Map": googleStreets
    };
    L.control.layers(baseMaps).addTo(map);

    // চালকের নিজের লাইভ লোকেশন ম্যাপে দেখানো
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition((pos) => {
            const driverLat = pos.coords.latitude;
            const driverLng = pos.coords.longitude;
            
            if (!window.driverMarker) {
                const driverIcon = L.divIcon({
                    className: 'custom-driver-icon',
                    html: '<div style="background-color:#007bff; width:16px; height:16px; border-radius:50%; border:3px solid white; box-shadow:0 0 8px rgba(0,0,0,0.5);"></div>',
                    iconSize: [20, 20]
                });
                window.driverMarker = L.marker([driverLat, driverLng], {icon: driverIcon}).addTo(map).bindPopup("আপনার অবস্থান");
            } else {
                window.driverMarker.setLatLng([driverLat, driverLng]);
            }
        });
    }
}

// বাংলা ভয়েস নোটিফিকেশন
function speakText(text) {
    if ('speechSynthesis' in window) {
        const speech = new SpeechSynthesisUtterance(text);
        speech.lang = 'bn-BD';
        speech.rate = 0.9;
        window.speechSynthesis.speak(speech);
    }
}

// সকেট রেসপন্স হ্যান্ডলিং
socket.on('current_requests', (requests) => {
    activeRequestsData = requests;
    renderAllRequests();
});

socket.on('passenger_requested', (req) => {
    activeRequestsData[req.id] = req;
    renderAllRequests();
    speakText("নতুন প্যাসেঞ্জার পাওয়া গেছে!");
});

socket.on('ride_expired_or_cancelled', (requestId) => {
    if (activeRequestsData[requestId]) {
        delete activeRequestsData[requestId];
        if (passengerMarkers[requestId]) {
            map.removeLayer(passengerMarkers[requestId]);
            delete passengerMarkers[requestId];
        }
        renderAllRequests();
    }
});

// ম্যাপের পিন এবং সাইডবার লিস্ট একসাথে রেন্ডার করার ফাংশন
function renderAllRequests() {
    const listDiv = document.getElementById('requestsList');
    const counterText = document.getElementById('counterText');
    const requestKeys = Object.keys(activeRequestsData);

    listDiv.innerHTML = '';
    
    if (requestKeys.length === 0) {
        counterText.innerText = "আশেপাশে কোনো যাত্রী রিকোয়েস্ট করেনি...";
        return;
    }

    counterText.innerText = `মোট অপেক্ষমান যাত্রী: ${requestKeys.length} জন (তালিকায় ক্লিক করে ম্যাপে দেখুন)`;

    requestKeys.forEach((id) => {
        const req = activeRequestsData[id];

        // ১. ম্যাপে পিন যুক্ত করা (যদি না থাকে)
        if (!passengerMarkers[id]) {
            const marker = L.marker([req.pickup.lat, req.pickup.lng])
                .addTo(map)
                .bindPopup(`<b>গন্তব্য: ${req.destination}</b>`);
            
            passengerMarkers[id] = marker;
        }

        // ২. সাইডবার লিস্টে আইটেম যোগ করা
        const card = document.createElement('div');
        card.className = 'request-item';
        card.innerHTML = `
            <button class="focus-btn" onclick="focusPassenger('${id}', event)">ম্যাপে দেখুন 📍</button>
            <div class="req-title">🛺 যাত্রী পেতে চান</div>
            <div class="req-dest">📍 গন্তব্য: <b>${req.destination}</b></div>
        `;

        // কার্ডের যেকোনো জায়গায় ক্লিক করলে ফ্লাই/জুম করবে
        card.onclick = (e) => focusPassenger(id, e);
        listDiv.appendChild(card);
    });
}

// নির্দিষ্ট যাত্রীর ওপর ম্যাপ অ্যানিমেটেড জুম করার লজিক
function focusPassenger(requestId, event) {
    if (event) event.stopPropagation();
    
    const req = activeRequestsData[requestId];
    if (req && passengerMarkers[requestId]) {
        // স্মুথ ফ্লাই অ্যানিমেশন দিয়ে লোকেশনে জুম করা
        map.flyTo([req.pickup.lat, req.pickup.lng], 18, {
            animate: true,
            duration: 1.5
        });

        passengerMarkers[requestId].openPopup();
    }
}

window.onload = initMap;
