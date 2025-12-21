const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Şifreleme için
const auth = require('../middleware/auth');

// --- MODELLER (Temizlik için hepsi lazım) ---
const User = require('../models/User');
const Medicine = require('../models/Medicine');
const Order = require('../models/Order');
const Message = require('../models/Message');
const Payment = require('../models/Payment'); // Cari hesap ödemeleri

// --- MIDDLEWARE: SADECE ADMİN GİREBİLİR ---
const adminCheck = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || !user.isAdmin) {
            return res.status(403).json({ message: 'Bu işlem için yetkiniz yok.' });
        }
        next();
    } catch (err) {
        console.error(err);
        res.status(500).send('Sunucu Hatası');
    }
};

// 1. DASHBOARD İSTATİSTİKLERİ
router.get('/stats', auth, adminCheck, async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const medicineCount = await Medicine.countDocuments();
        const orderCount = await Order.countDocuments();
        // Bekleyen sipariş sayısı
        const activeOrders = await Order.countDocuments({ status: 'Beklemede' });

        res.json({ 
            users: userCount, 
            medicines: medicineCount, 
            orders: orderCount, 
            activeOrders 
        });
    } catch (err) {
        res.status(500).send('Sunucu Hatası');
    }
});

// 2. TÜM KULLANICILARI GETİR
router.get('/users', auth, adminCheck, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).send('Sunucu Hatası');
    }
});

// 3. KULLANICIYI ONAYLA
router.put('/users/approve/:id', auth, adminCheck, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { isApproved: true });
        res.json({ message: 'Kullanıcı onaylandı.' });
    } catch (err) {
        res.status(500).send('Sunucu Hatası');
    }
});

// 4. KULLANICIYI VE TÜM GEÇMİŞİNİ SİL (KRİTİK GÜNCELLEME)
router.delete('/users/:id', auth, adminCheck, async (req, res) => {
    const userId = req.params.id;

    try {
        // A. İlaçlarını Sil
        await Medicine.deleteMany({ user: userId });

        // B. Siparişlerini Sil (Alıcı veya Satıcı olduğu her şey)
        await Order.deleteMany({ 
            $or: [{ buyer: userId }, { seller: userId }] 
        });

        // C. Mesajlarını Sil
        await Message.deleteMany({ sender: userId });

        // D. Ödeme Kayıtlarını Sil (Cari hesap patlamasın diye)
        // Eğer Payment modeli henüz yoksa veya hata verirse bu bloğu try-catch içine alabilirsin
        try {
            if (Payment) {
                await Payment.deleteMany({ 
                    $or: [{ fromUser: userId }, { toUser: userId }] 
                });
            }
        } catch (paymentErr) {
            console.log("Ödeme silme uyarısı (Önemli değil):", paymentErr.message);
        }

        // E. Kullanıcının Kendisini Sil
        const deletedUser = await User.findByIdAndDelete(userId);

        if (!deletedUser) {
            return res.status(404).json({ message: 'Kullanıcı zaten yok.' });
        }

        res.json({ message: 'Kullanıcı ve ilişkili tüm verileri (ilaç, sipariş, mesaj, bakiye) başarıyla silindi.' });

    } catch (err) {
        console.error("Silme Hatası:", err);
        res.status(500).send('Silme işlemi sırasında hata oluştu.');
    }
});

// 5. KULLANICI ŞİFRESİNİ SIFIRLA (Admin yetkisiyle)
router.put('/users/reset-password/:id', auth, adminCheck, async (req, res) => {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: 'Şifre en az 6 karakter olmalıdır.' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await User.findByIdAndUpdate(req.params.id, { password: hashedPassword });
        
        res.json({ message: 'Kullanıcı şifresi başarıyla değiştirildi.' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Sunucu Hatası');
    }
});

// 6. VERİTABANI TEMİZLİĞİ (YETİM VERİLERİ SİL) ---
router.post('/cleanup', auth, adminCheck, async (req, res) => {
    try {
        // 1. Mevcut tüm kullanıcıların ID'lerini al
        const users = await User.find({}, '_id');
        const activeUserIds = users.map(u => u._id.toString());

        // 2. Sahibi (Buyer veya Seller) aktif kullanıcı listesinde olmayan SİPARİŞLERİ sil
        const deletedOrders = await Order.deleteMany({
            $or: [
                { buyer: { $nin: activeUserIds } },
                { seller: { $nin: activeUserIds } }
            ]
        });

        // 3. Sahibi aktif kullanıcı listesinde olmayan ÖDEMELERİ sil
        const deletedPayments = await Payment.deleteMany({
            $or: [
                { fromUser: { $nin: activeUserIds } },
                { toUser: { $nin: activeUserIds } }
            ]
        });

        // 4. Sahibi aktif kullanıcı listesinde olmayan İLAÇLARI sil
        const deletedMedicines = await Medicine.deleteMany({
            user: { $nin: activeUserIds }
        });

        res.json({
            message: 'Temizlik tamamlandı.',
            details: {
                ordersRemoved: deletedOrders.deletedCount,
                paymentsRemoved: deletedPayments.deletedCount,
                medicinesRemoved: deletedMedicines.deletedCount
            }
        });
    } catch (err) {
        console.error("Temizlik Hatası:", err);
        res.status(500).send('Temizlik sırasında hata oluştu.');
    }
});

module.exports = router;