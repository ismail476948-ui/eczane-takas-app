const express = require('express');
const dotenv = require('dotenv');
const http = require('http'); // YENİ
const { Server } = require('socket.io'); // YENİ

// 1. ÖNCE BUNU ÇALIŞTIR
dotenv.config(); 

const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app); // YENİ: Express'i HTTP sunucusuna bağladık

// --- SOCKET.IO AYARLARI (YENİ) ---
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Frontend adresi (Vite varsayılanı)
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(express.json());
app.use(cors());

// Veritabanı Bağlantısı
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI); // options kaldırıldı, yeni sürümde gerek yok
        console.log('MongoDB Bağlandı 🍃');
    } catch (err) {
        console.error('MongoDB Bağlantı Hatası:', err);
        process.exit(1);
    }
};
connectDB();

// Rotalar
app.use('/api/auth', require('./routes/auth'));
app.use('/api/medicines', require('./routes/medicines'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/payments', require('./routes/payments'));

// --- SOCKET.IO OLAYLARI (YENİ) ---
// --- SOCKET.IO OLAYLARI ---
io.on('connection', (socket) => {
    console.log(`Kullanıcı bağlandı: ${socket.id}`);

    // 1. KULLANICI GİRİŞ YAPINCA KENDİ ÖZEL ODASINA KATILSIN
    // Frontend'den 'register' olayı ile kullanıcı ID'si gelecek
    socket.on('register', (userId) => {
        if (userId) {
            socket.join(userId);
            console.log(`Kullanıcı ID ${userId} kendi özel kanalına katıldı.`);
        }
    });

    // 2. TAKAS SOHBET ODASINA KATILMA
    socket.on('join_room', (orderId) => {
        socket.join(orderId);
    });

    // 3. MESAJ GÖNDERME
    socket.on('send_message', (data) => {
        socket.to(data.orderId).emit('receive_message', data);
    });

    // 4. BİLDİRİM GÖNDERME (YENİ EKLENDİ) 🔔
    // Birisi bir işlem yaptığında karşı tarafın ID'sine bildirim atar
    socket.on('send_notification', (data) => {
        // data.receiverId: Bildirimin gideceği kişinin ID'si
        // data.type: 'message', 'order_status' vb.
        console.log(`Bildirim gönderiliyor -> ${data.receiverId}`);
        socket.to(data.receiverId).emit('receive_notification', data);
    });

    socket.on('disconnect', () => {
        console.log('Kullanıcı ayrıldı');
    });
});

const PORT = process.env.PORT || 5000;

// ÖNEMLİ: app.listen yerine server.listen kullanıyoruz!
server.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor 🚀`));