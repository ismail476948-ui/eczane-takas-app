const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const auth = require('../middleware/auth');

// --- GÜNCELLENMİŞ MAİL AYARLARI ---
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // SSL kullanıyoruz
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Sunucu başladığında bağlantıyı test et
transporter.verify((error, success) => {
    if (error) {
        console.log("Mail Bağlantı Hatası:", error);
    } else {
        console.log("Mail Sunucusu Bağlandı ve Hazır! 📧");
    }
});
// ----------------------------------

// KAYIT OL
router.post('/register', async (req, res) => {
    const { pharmacyName, city, email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'Bu e-posta zaten kayıtlı.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const isFirstAccount = (await User.countDocuments({})) === 0;

        user = new User({
            pharmacyName, city, email, password: hashedPassword,
            isAdmin: isFirstAccount, isApproved: isFirstAccount 
        });
        await user.save();
        
        if (isFirstAccount) res.json({ message: 'Yönetici hesabı oluşturuldu.' });
        else res.json({ message: 'Kayıt başarılı. Yönetici onayı bekleniyor.' });

    } catch (err) { res.status(500).send('Hata'); }
});

// GİRİŞ YAP
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Kullanıcı bulunamadı.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Hatalı şifre.' });

        if (!user.isAdmin && !user.isApproved) {
            return res.status(403).json({ message: 'Üyeliğiniz henüz onaylanmamış.' });
        }

        const payload = { user: { id: user.id, isAdmin: user.isAdmin } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, pharmacyName: user.pharmacyName, isAdmin: user.isAdmin, pharmacistName: user.pharmacistName, phoneNumber: user.phoneNumber } });
        });
    } catch (err) { res.status(500).send('Hata'); }
});

// KULLANICI BİLGİLERİNİ GETİR
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) { res.status(500).send('Hata'); }
});

// PROFİL GÜNCELLEME
router.put('/update', auth, async (req, res) => {
    const { pharmacyName, city, password, pharmacistName, address, phoneNumber } = req.body;
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'Kullanıcı yok' });

        if (pharmacyName) user.pharmacyName = pharmacyName;
        if (city) user.city = city;
        if (pharmacistName) user.pharmacistName = pharmacistName;
        if (address) user.address = address;
        if (phoneNumber) user.phoneNumber = phoneNumber;
        
        if (password && password.length > 0) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }
        await user.save();
        res.json({ message: 'Profil güncellendi', user });
    } catch (err) { res.status(500).send('Hata'); }
});

// ŞİFREMİ UNUTTUM
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'Bu e-posta ile kayıtlı kullanıcı yok.' });

        const token = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; 
        await user.save();

        const resetUrl = `https://${req.get('host')}/reset-password/${token}`; 

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Eczane Takas - Şifre Sıfırlama',
            text: `Şifrenizi sıfırlamak için lütfen aşağıdaki linke tıklayın:\n\n${resetUrl}\n\nBu işlemi siz yapmadıysanız dikkate almayın.`
        };

        await transporter.sendMail(mailOptions); // await ekledik
        res.json({ message: 'Şifre sıfırlama linki e-posta adresinize gönderildi.' });

    } catch (err) {
        console.error("Mail Gönderme Hatası:", err); // Hatayı detaylı logla
        res.status(500).json({ message: 'Mail gönderilemedi. Lütfen daha sonra tekrar deneyin.' });
    }
});

// ŞİFRE SIFIRLA
router.post('/reset-password/:token', async (req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() } 
        });

        if (!user) return res.status(400).json({ message: 'Geçersiz veya süresi dolmuş token.' });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
        
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();
        res.json({ message: 'Şifreniz başarıyla değiştirildi. Giriş yapabilirsiniz.' });

    } catch (err) {
        console.error(err);
        res.status(500).send('Hata');
    }
});

module.exports = router;