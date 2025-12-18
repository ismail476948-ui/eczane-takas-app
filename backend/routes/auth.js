const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const auth = require('../middleware/authMiddleware');
const User = require('../models/User');

const MY_SECRET_KEY = process.env.JWT_SECRET || "eczaneGuvenlikAnahtari_Yedek_123456";

// 1. KAYIT OL
router.post('/register', async (req, res) => {
    try {
        const { username, pharmacyName, city, email, password } = req.body;
        let user = await User.findOne({ username });
        if (user) return res.status(400).json({ message: 'Bu kullanıcı adı zaten alınmış.' });

        // Email kontrolü
        let userEmail = await User.findOne({ email });
        if (userEmail) return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanılıyor.' });

        user = new User({ username, pharmacyName, city, email, password });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        const payload = { user: { id: user.id } };
        jwt.sign(payload, MY_SECRET_KEY, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Sunucu Hatası');
    }
});

// 2. GİRİŞ YAP (GÜNCELLENDİ: isAdmin Eklendi)
router.post('/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
        const user = await User.findOne({ $or: [{ username: identifier }, { pharmacyName: identifier }] });
        if (!user) return res.status(400).json({ message: 'Kullanıcı bulunamadı.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Şifre hatalı.' });

        const payload = { user: { id: user.id } };
        jwt.sign(payload, MY_SECRET_KEY, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ 
                token,
                user: { 
                    id: user.id, 
                    username: user.username, 
                    pharmacyName: user.pharmacyName,
                    isAdmin: user.isAdmin // <-- BURASI EKLENDİ
                } 
            });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Sunucu Hatası');
    }
});

// 3. PROFİL GÜNCELLE
router.put('/update', auth, async (req, res) => {
    try {
        const { username, pharmacyName, city, currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });

        if (newPassword && currentPassword) {
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) return res.status(400).json({ message: 'Mevcut şifre hatalı!' });
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }
        if (username) user.username = username;
        if (pharmacyName) user.pharmacyName = pharmacyName;
        if (city) user.city = city;

        await user.save();
        res.json({ id: user._id, username: user.username, pharmacyName: user.pharmacyName, city: user.city });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Sunucu Hatası');
    }
});

// 4. ŞİFREMİ UNUTTUM
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

        const token = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; 
        await user.save();

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const resetUrl = `http://localhost:5173/reset-password/${token}`;
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'EczaneTakas - Şifre Sıfırlama',
            text: `Linke tıklayın: ${resetUrl}`
        });

        res.json({ message: 'E-posta gönderildi.' });
    } catch (err) {
        console.error(err);
        res.status(500).send('E-posta gönderilemedi.');
    }
});

// 5. ŞİFRE SIFIRLAMA
router.post('/reset-password/:token', async (req, res) => {
    try {
        const { password } = req.body;
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ message: 'Geçersiz link.' });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Şifre değiştirildi.' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Sunucu Hatası');
    }
});

module.exports = router;