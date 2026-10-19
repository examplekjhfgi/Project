const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// সক্রিয় রাইড রিকোয়েস্ট রাখার অবজেক্ট
let activeRequests = {};

io.on('connection', (socket) => {
    console.log('নতুন ইউজার যুক্ত হয়েছেন: ', socket.id);

    // চালক যুক্ত হলে বর্তমান সব রিকোয়েস্ট পাঠাব
    socket.emit('current_requests', activeRequests);

    // প্যাসেঞ্জার নতুন রাইড রিকোয়েস্ট পাঠালে
    socket.on('new_ride_request', (data) => {
        const requestId = 'req_' + socket.id;
        activeRequests[requestId] = {
            id: requestId,
            socketId: socket.id,
            pickup: data.pickup,
            destination: data.destination,
            createdAt: Date.now()
        };

        // সব ড্রাইভাদের ব্রডকাস্ট মেসেজ পাঠানো
        io.emit('passenger_requested', activeRequests[requestId]);
    });

    // ম্যানুয়ালি বা অটোমেটিক রিকোয়েস্ট বন্ধ করলে
    socket.on('cancel_ride_request', () => {
        const requestId = 'req_' + socket.id;
        if (activeRequests[requestId]) {
            delete activeRequests[requestId];
            io.emit('ride_expired_or_cancelled', requestId);
        }
    });

    // ইউজার ডিসকানেক্ট হলে
    socket.on('disconnect', () => {
        const requestId = 'req_' + socket.id;
        if (activeRequests[requestId]) {
            delete activeRequests[requestId];
            io.emit('ride_expired_or_cancelled', requestId);
        }
        console.log('ইউজার লিভ নিয়েছেন: ', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`EasyBike Server চলছে: http://localhost:${PORT}`);
});