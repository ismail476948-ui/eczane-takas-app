const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Modelleri Tanımla
const Order = require('./models/Order');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.io Ayarları
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(express.json());
app.use(cors());

// Veritabanı Bağlantısı
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Bağlandı'))
    .catch(err => console.log(err));

// ROTALAR
app.use('/api/auth', require('./routes/auth'));
app.use('/api/medicines', require('./routes/medicines'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/messages', require('./routes/messages')); // <-- Bu satır çok önemli!

// --- SOCKET.IO (GERÇEK ZAMANLI İLETİŞİM) ---
io.on('connection', (socket) => {
    
    // Odaya Katıl
    socket.on('join_room', (orderId) => {
        socket.join(orderId);
    });

    // Mesaj Gönderildiğinde
    socket.on('send_message', (data) => {
        // Mesajı odadaki diğer kişiye ilet
        io.to(data.orderId).emit('receive_message', data);
        
        // Not: Veritabanı kaydını zaten routes/messages.js API'sinde yapıyoruz.
        // Burası sadece anlık görüntü için.
    });

    socket.on('disconnect', () => {});
});

// --- PRODUCTION AYARLARI (RENDER İÇİN DÜZELTİLDİ) ---
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/dist')));

    // HATA VEREN KISIM BURASIYDI, DÜZELTİLDİ:
    // '*' yerine regex kullanıyoruz.
    app.get(/.*/, (req, res) => {
        res.sendFile(path.resolve(__dirname, '../frontend', 'dist', 'index.html'));
    });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor`));