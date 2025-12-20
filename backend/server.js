const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// MODELLER (Bildirim güncellemek için Order modeline ihtiyacımız var)
const Order = require('./models/Order');

dotenv.config();

const app = express();
const server = http.createServer(app);

// SOCKET.IO AYARLARI
const io = new Server(server, {
    cors: {
        origin: "*", // Canlıda ve localde bağlantı sorunu olmasın diye
        methods: ["GET", "POST"]
    }
});

// MIDDLEWARE
app.use(express.json());
app.use(cors());

// VERİTABANI BAĞLANTISI
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Bağlandı'))
    .catch(err => console.log(err));

// ROTALAR
app.use('/api/auth', require('./routes/auth'));
app.use('/api/medicines', require('./routes/medicines'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/messages', require('./routes/messages')); // Mesajlaşma rotaları
app.use('/api/admin', require('./routes/admin'));

// --- SOCKET.IO (CANLI MESAJLAŞMA VE BİLDİRİM) ---
io.on('connection', (socket) => {
    // console.log(`Kullanıcı bağlandı: ${socket.id}`);

    // Odaya (Siparişe) katıl
    socket.on('join_room', (orderId) => {
        socket.join(orderId);
    });

    // MESAJ GÖNDERME İŞLEMİ
    socket.on('send_message', async (data) => {
        // 1. Mesajı odadaki herkese gönder (Frontend'de kendi mesajını filtreleyeceksin)
        io.to(data.orderId).emit('receive_message', data);

        // 2. VERİTABANINDA BİLDİRİMİ GÜNCELLE (KIRMIZI NOKTA İÇİN)
        try {
            const order = await Order.findById(data.orderId);
            
            if (order) {
                // Mesajı gönderen kişinin ID'sini alıyoruz
                // Frontend'den gelen veri yapısı: { sender: { _id: "..." } } olabilir
                const senderId = data.sender._id || data.sender;

                // Eğer gönderen ALICI ise -> SATICI için okunmadı işaretle
                if (senderId === order.buyer.toString()) {
                    order.unreadForSeller = true;
                } 
                // Eğer gönderen SATICI ise -> ALICI için okunmadı işaretle
                else if (senderId === order.seller.toString()) {
                    order.unreadForBuyer = true;
                }
                
                await order.save();
            }
        } catch (err) {
            console.error("Socket Bildirim Hatası:", err);
        }
    });

    // SİPARİŞ DURUM GÜNCELLEMESİ (İsteğe bağlı bildirim)
    socket.on('send_notification', (data) => {
        // Burada kullanıcıya özel socket ID'si ile bildirim atılabilir
        // Şimdilik basit tutuyoruz.
    });

    socket.on('disconnect', () => {
        // console.log("Kullanıcı ayrıldı");
    });
});

// PRODUCTION AYARLARI (RENDER İÇİN)
// Frontend'i build edip backend içinde sunmak istersen burası çalışır
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/dist'))); // Vite build klasörü

    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, '../frontend', 'dist', 'index.html'));
    });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor`));