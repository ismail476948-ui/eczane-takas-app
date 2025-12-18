const jwt = require('jsonwebtoken');

// DİKKAT: auth.js dosyasındaki anahtarın AYNISI olmalı
const MY_SECRET_KEY = process.env.JWT_SECRET || "eczaneGuvenlikAnahtari_Yedek_123456";

module.exports = function(req, res, next) {
    // Header'dan token'ı al
    const token = req.header('x-auth-token');

    // Token yoksa reddet
    if (!token) {
        return res.status(401).json({ msg: 'Token yok, yetkilendirme reddedildi' });
    }

    try {
        // Token'ı doğrula (Yedek anahtarı kullanarak)
        const decoded = jwt.verify(token, MY_SECRET_KEY);
        
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token geçersiz' });
    }
};