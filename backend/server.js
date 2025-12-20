const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Modeller
const Order = require('./models/Order'); 

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket Ayarları
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

app.use(express.json());
app.use(cors());

// DB Bağlantısı
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Bağlandı'))
    .catch(err => console.log(err));

// ROTALAR
app.use('/api/auth', require('./routes/auth'));
app.use('/api/medicines', require('./routes/medicines'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/messages', require('./routes/messages')); // <-- YENİ EKLENDİ

// --- SOCKET.IO ---
io.on('connection', (socket) => {
    socket.on('join_room', (orderId) => {
        socket.join(orderId);
    });

    socket.on('send_message', async (data) => {
        // Canlı mesajı ilet
        io.to(data.orderId).emit('receive_message', data);
        
        // (Veritabanı kaydını zaten routes/messages.js içinde yapıyoruz,
        // o yüzden burada tekrar DB işlemi yapmaya gerek yok, sadece anlık iletim yeterli)
    });

    socket.on('send_notification', (data) => {
        // Özel bildirimler için
    });
});

// --- PRODUCTION AYARLARI (HATA VEREN KISIM DÜZELTİLDİ) ---
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/dist')));

    // DÜZELTME: '*' yerine regex kullanıyoruz. Bu sayede hata vermez.
    app.get(/.*/, (req, res) => {
        res.sendFile(path.resolve(__dirname, '../frontend', 'dist', 'index.html'));
    });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor`));