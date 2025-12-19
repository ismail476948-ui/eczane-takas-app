const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// KAYIT OL
router.post('/register', async (req, res) => {
    const { pharmacyName, city, email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'Bu e-posta zaten kayıtlı.' });

        // Şifreleme
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Veritabanındaki ilk kullanıcı mı?
        const isFirstAccount = (await User.countDocuments({})) === 0;

        user = new User({
            pharmacyName,
            city,
            email,
            password: hashedPassword,
            isAdmin: isFirstAccount, // İlk kayıt olan Admin olur
            // İlk kayıt olan (Admin) otomatik onaylıdır, sonrakiler 'false' (onaysız) başlar
            isApproved: isFirstAccount 
        });

        await user.save();
        
        if (isFirstAccount) {
            res.json({ message: 'Yönetici hesabı oluşturuldu. Giriş yapabilirsiniz.' });
        } else {
            res.json({ message: 'Kayıt başarılı. Yönetici onayı bekleniyor.' });
        }

    } catch (err) {
        console.error(err);
        res.status(500).send('Sunucu hatası');
    }
});

// GİRİŞ YAP
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Kullanıcı bulunamadı.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Hatalı şifre.' });

        // --- GÜVENLİK KONTROLÜ ---
        // Eğer kullanıcı Admin DEĞİLSE ve Onayı YOKSA hata ver.
        // (Yani Adminsen onay kontrolüne takılmazsın)
        if (!user.isAdmin && !user.isApproved) {
            return res.status(403).json({ message: 'Üyeliğiniz henüz yönetici tarafından onaylanmamış.' });
        }

        const payload = { user: { id: user.id, isAdmin: user.isAdmin } };

        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, pharmacyName: user.pharmacyName, isAdmin: user.isAdmin } });
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Sunucu hatası');
    }
});

module.exports = router;