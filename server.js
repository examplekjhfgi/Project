const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let activeRequests = {};

io.on('connection', (socket) => {
    console.log('নতুন ইউজার যুক্ত হয়েছেন: ', socket.id);

    socket.emit('current_requests', activeRequests);

    socket.on('new_ride_request', (data) => {
        const requestId = 'req_' + socket.id;
        
        // passengerCount ঠিকভাবে রিসিভ করা হচ্ছে
        activeRequests[requestId] = {
            id: requestId,
            socketId: socket.id,
            pickup: data.pickup,
            destination: data.destination,
            passengerCount: data.passengerCount || 1, // নিশ্চিত করা হলো সঠিক মান সেভ হচ্ছে
            createdAt: Date.now()
        };

        io.emit('passenger_requested', activeRequests[requestId]);
    });

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
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`EasyBike Server চলছে: http://localhost:${PORT}`);
});
