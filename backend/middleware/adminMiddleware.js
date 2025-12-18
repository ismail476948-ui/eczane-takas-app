const User = require('../models/User');

module.exports = async function (req, res, next) {
    try {
        // req.user.id zaten authMiddleware'den geliyor
        const user = await User.findById(req.user.id);
        
        if (user && user.isAdmin) {
            next(); // Geçiş izni ver
        } else {
            res.status(403).json({ message: 'Erişim Reddedildi! Admin yetkiniz yok.' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Sunucu Hatası');
    }
};