const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware'); // Yeni yazdığımız koruma
const User = require('../models/User');
const Medicine = require('../models/Medicine');
const Order = require('../models/Order');

// 1. DASHBOARD İSTATİSTİKLERİ
// Hem Giriş yapmış (auth) hem de Admin (admin) olmalı
router.get('/stats', auth, admin, async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const medicineCount = await Medicine.countDocuments();
        const orderCount = await Order.countDocuments();
        
        // Bekleyen takaslar
        const activeOrders = await Order.countDocuments({ status: { $in: ['Beklemede', 'Onaylandı', 'Transferde'] } });

        res.json({
            users: userCount,
            medicines: medicineCount,
            orders: orderCount,
            activeOrders: activeOrders
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Sunucu Hatası');
    }
});

// 2. KENDİNİ ADMİN YAPMA (GEÇİCİ - SİLİNECEK) ⚠️
// Bu rotayı sadece ilk admini oluşturmak için kullanacağız.
router.post('/make-me-admin', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        user.isAdmin = true;
        await user.save();
        res.json({ message: `Tebrikler ${user.username}! Artık Adminsiniz. 👑` });
    } catch (err) {
        res.status(500).send('Hata');
    }
});

// ... üstteki kodlar ...

// 3. TÜM KULLANICILARI LİSTELE (Şifreleri hariç getir)
router.get('/users', auth, admin, async (req, res) => {
    try {
        // .select('-password') diyerek şifreleri getirmeyi engelliyoruz, güvenlik için.
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).send('Sunucu Hatası');
    }
});

// 4. KULLANICI SİL (Banlama)
router.delete('/users/:id', auth, admin, async (req, res) => {
    try {
        // Admin kendini silemesin :)
        if (req.params.id === req.user.id) {
            return res.status(400).json({ message: 'Kendinizi silemezsiniz!' });
        }

        await User.findByIdAndDelete(req.params.id);
        
        // İsterseniz kullanıcının ilaçlarını ve siparişlerini de silebilirsiniz
        // await Medicine.deleteMany({ user: req.params.id });
        
        res.json({ message: 'Kullanıcı başarıyla silindi.' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Sunucu Hatası');
    }
});

// ... üstteki kodlar ...

// 5. TÜM İLAÇLARI LİSTELE
router.get('/medicines', auth, admin, async (req, res) => {
    try {
        // İlacı ekleyen kullanıcının bilgilerini de (eczane adı) getir
        const medicines = await Medicine.find()
            .populate('user', 'pharmacyName city')
            .sort({ createdAt: -1 });
        res.json(medicines);
    } catch (err) {
        console.error(err);
        res.status(500).send('Sunucu Hatası');
    }
});

// 6. İLAÇ SİL (Yasaklı/Hatalı İlanı Kaldır)
router.delete('/medicines/:id', auth, admin, async (req, res) => {
    try {
        await Medicine.findByIdAndDelete(req.params.id);
        
        // Opsiyonel: Bu ilaca ait bekleyen siparişleri de iptal edebilirsiniz
        // await Order.deleteMany({ medicine: req.params.id });

        res.json({ message: 'İlaç ilanı başarıyla kaldırıldı.' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Sunucu Hatası');
    }
});

module.exports = router;