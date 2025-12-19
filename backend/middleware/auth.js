const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // 1. Token'ı başlıktan (header) al
    const token = req.header('x-auth-token');

    // 2. Token yoksa içeri alma
    if (!token) {
        return res.status(401).json({ message: 'Token yok, yetkilendirme reddedildi.' });
    }

    // 3. Token varsa doğrula
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next(); // Sorun yok, devam et
    } catch (err) {
        res.status(401).json({ message: 'Geçersiz Token.' });
    }
};