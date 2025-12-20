const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Şifreleme için gerekli
const User = require('../models/User');
const Medicine = require('../models/Medicine');
const Order = require('../models/Order');
const auth = require('../middleware/auth');

// Middleware: Sadece Admin girebilir
const adminCheck = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user.isAdmin) return res.status(403).json({ message: 'Yetkisiz işlem.' });
        next();
    } catch (err) { res.status(500).send('Server Error'); }
};

// İstatistikler
router.get('/stats', auth, adminCheck, async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const medicineCount = await Medicine.countDocuments();
        const orderCount = await Order.countDocuments();
        const activeOrders = await Order.countDocuments({ status: { $ne: 'Tamamlandı' } });

        res.json({ users: userCount, medicines: medicineCount, orders: orderCount, activeOrders });
    } catch (err) { res.status(500).send('Server Error'); }
});

// Tüm Kullanıcıları Getir
router.get('/users', auth, adminCheck, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) { res.status(500).send('Server Error'); }
});

// Kullanıcıyı Onayla
router.put('/users/approve/:id', auth, adminCheck, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { isApproved: true });
        res.json({ message: 'Kullanıcı onaylandı.' });
    } catch (err) { res.status(500).send('Server Error'); }
});

// Kullanıcı Sil
router.delete('/users/:id', auth, adminCheck, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'Kullanıcı silindi.' });
    } catch (err) { res.status(500).send('Server Error'); }
});

// --- YENİ: ADMİN TARAFINDAN ŞİFRE SIFIRLAMA ---
router.put('/users/reset-password/:id', auth, adminCheck, async (req, res) => {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: 'Şifre en az 6 karakter olmalıdır.' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await User.findByIdAndUpdate(req.params.id, { password: hashedPassword });
        
        res.json({ message: 'Kullanıcı şifresi başarıyla güncellendi.' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;