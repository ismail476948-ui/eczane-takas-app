const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path'); // EKLENDİ

dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS Ayarları (Hem localhost hem de Render adresine izin ver)
app.use(cors({
    origin: "*", 
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

app.use(express.json());

// MongoDB Bağlantısı
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Bağlandı'))
    .catch(err => console.log(err));

// Rotalar
app.use('/api/auth', require('./routes/auth'));
app.use('/api/medicines', require('./routes/medicines'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));

// Socket.io Kurulumu
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

let onlineUsers = {};

io.on('connection', (socket) => {
    console.log(`Kullanıcı bağlandı: ${socket.id}`);

    socket.on('register', (userId) => {
        onlineUsers[userId] = socket.id;
    });

    socket.on('join_room', (orderId) => {
        socket.join(orderId);
    });

    socket.on('send_message', (data) => {
        io.to(data.orderId).emit('receive_message', data);
        
        // Bildirim mantığı...
        // (Burayı kısaltıyorum, senin kodundaki mevcut hali kalsın)
    });

    socket.on('send_notification', ({ receiverId, type, status }) => {
        if (onlineUsers[receiverId]) {
            io.to(onlineUsers[receiverId]).emit('receive_notification', { type, status });
        }
    });

    socket.on('disconnect', () => {
        // Kullanıcıyı listeden sil
        Object.keys(onlineUsers).forEach(key => {
            if (onlineUsers[key] === socket.id) delete onlineUsers[key];
        });
    });
});

// --- KRİTİK EKLEME: FRONTEND SUNUMU ---
// Frontend build (dist) klasörünün yolu
const frontendPath = path.join(__dirname, '../frontend/dist');

// Statik dosyaları sun
app.use(express.static(frontendPath));

// Diğer tüm istekleri index.html'e yönlendir (React Router için)
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});
// --------------------------------------

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor`));