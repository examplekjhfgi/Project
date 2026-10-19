const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let activeRequests = {};
let activeDrivers = {};

io.on('connection', (socket) => {
    console.log('User Connected: ', socket.id);

    // Initial data pathano
    socket.emit('current_requests', activeRequests);
    socket.emit('current_drivers', activeDrivers);

    // Passenger ride request
    socket.on('new_ride_request', (data) => {
        const requestId = 'req_' + socket.id;
        activeRequests[requestId] = {
            id: requestId,
            socketId: socket.id,
            pickup: data.pickup,
            destination: data.destination,
            passengerCount: data.passengerCount || 1,
            createdAt: Date.now()
        };
        // Sob driver der kache request broadcast kora
        io.emit('passenger_requested', activeRequests[requestId]);
    });

    // Driver live location update
    socket.on('update_driver_location', (coords) => {
        activeDrivers[socket.id] = {
            id: socket.id,
            lat: coords.lat,
            lng: coords.lng
        };
        io.emit('driver_location_changed', activeDrivers[socket.id]);
    });

    // Cancel request
    socket.on('cancel_ride_request', () => {
        const requestId = 'req_' + socket.id;
        if (activeRequests[requestId]) {
            delete activeRequests[requestId];
            io.emit('ride_expired_or_cancelled', requestId);
        }
    });

    socket.on('disconnect', () => {
        const requestId = 'req_' + socket.id;
        if (activeRequests[requestId]) {
            delete activeRequests[requestId];
            io.emit('ride_expired_or_cancelled', requestId);
        }
        if (activeDrivers[socket.id]) {
            delete activeDrivers[socket.id];
            io.emit('driver_offline', socket.id);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
