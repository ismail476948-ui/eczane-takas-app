const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // Rastgele kod üretmek için
const nodemailer = require('nodemailer'); // Mail atmak için
const User = require('../models/User');
const auth = require('../middleware/auth');

// --- MAİL GÖNDERME AYARLARI ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Render'da tanımladığın gmail
        pass: process.env.EMAIL_PASS  // Render'da tanımladığın şifre
    }
});
// ------------------------------

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

// --- YENİ: ŞİFREMİ UNUTTUM (MAİL GÖNDERME) ---
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'Bu e-posta ile kayıtlı kullanıcı yok.' });

        // Rastgele token oluştur
        const token = crypto.randomBytes(20).toString('hex');

        // Token'ı kullanıcıya kaydet (1 saat geçerli)
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 saat
        await user.save();

        // Şifırlama Linki (Render adresine göre ayarla)
        // DİKKAT: Buradaki link frontend adresin olmalı. Render linkini otomatik alması için origin kullanıyoruz.
        // Ancak mailde tam adres lazım. Render domainini biliyorsan elle de yazabilirsin.
        // Şimdilik gelen isteğin host bilgisini alıyoruz.
        const resetUrl = `https://${req.get('host')}/reset-password/${token}`; 
        // Not: Eğer localhost'ta test ediyorsan req.get('host') localhost olur. Render'da render adresi olur.
        // Ancak frontend ve backend aynı domainde olduğu için sorun yok.

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Eczane Takas - Şifre Sıfırlama',
            text: `Şifrenizi sıfırlamak için lütfen aşağıdaki linke tıklayın:\n\n${resetUrl}\n\nBu işlemi siz yapmadıysanız dikkate almayın.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                return res.status(500).json({ message: 'Mail gönderilemedi. Ayarları kontrol edin.' });
            }
            res.json({ message: 'Şifre sıfırlama linki e-posta adresinize gönderildi.' });
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Hata');
    }
});

// --- YENİ: ŞİFREYİ SIFIRLA (LINKTEN GELEN İSTEK) ---
router.post('/reset-password/:token', async (req, res) => {
    try {
        // Token'ı ve süresini kontrol et
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() } // Süresi geçmemiş olmalı
        });

        if (!user) return res.status(400).json({ message: 'Geçersiz veya süresi dolmuş token.' });

        // Yeni şifreyi kaydet
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
        
        // Tokenları temizle
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