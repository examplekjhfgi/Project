// driver.js er initMap() function er bhitore watchPosition er moddhe ei line ta thakbe:
if (navigator.geolocation) {
    navigator.geolocation.watchPosition((pos) => {
        driverCoords = [pos.coords.latitude, pos.coords.longitude];
        
        // Server-e live location pathano jate passenger-ra map-e dekte pay
        socket.emit('update_driver_location', {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
        });

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
            window.driverMarker = L.marker(driverCoords, {icon: driverAutoIcon}).addTo(map).bindPopup("Apnar Obosthan (EasyBike)");
        } else {
            window.driverMarker.setLatLng(driverCoords);
        }
        renderAllRequests();
    }, (err) => console.log(err), { enableHighAccuracy: true });
}
