const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Payment = require('../models/Payment');
const User = require('../models/User');

// 1. Tüm Ödemeleri Getir (Senin veya sana yapılanlar)
router.get('/', auth, async (req, res) => {
    try {
        const payments = await Payment.find({
            $or: [{ fromUser: req.user.id }, { toUser: req.user.id }]
        })
        .populate('fromUser', 'pharmacyName')
        .populate('toUser', 'pharmacyName')
        .sort({ date: -1 });

        res.json(payments);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Hatası');
    }
});

// 2. Yeni Ödeme Ekle (Hesaplaşma Modalı Buraya İstek Atıyor)
router.post('/', auth, async (req, res) => {
    const { targetUserId, amount, type, description } = req.body;

    try {
        // Validation
        if (!targetUserId || !amount) {
            return res.status(400).json({ message: 'Eksik bilgi.' });
        }

        let fromUser, toUser;

        // Mantık: Eğer "sent" (Gönderdim) seçtiysen -> Para benden, ona gidiyor.
        if (type === 'sent') {
            fromUser = req.user.id;
            toUser = targetUserId;
        } 
        // Mantık: Eğer "received" (Aldım) seçtiysen -> Para ondan, bana geliyor.
        else {
            fromUser = targetUserId;
            toUser = req.user.id;
        }

        const newPayment = new Payment({
            fromUser,
            toUser,
            amount,
            type, // Bunu sadece kayıt amaçlı tutuyoruz
            description
        });

        await newPayment.save();
        res.json(newPayment);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Hatası');
    }
});

// 3. Ödeme Sil (Yanlış girilirse)
router.delete('/:id', auth, async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);
        if (!payment) return res.status(404).json({ message: 'Kayıt bulunamadı' });

        // Sadece işlemi yapan kişi silebilir
        if (payment.fromUser.toString() !== req.user.id && payment.toUser.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Yetkisiz işlem' });
        }

        await Payment.findByIdAndDelete(req.params.id);
        res.json({ message: 'Ödeme kaydı silindi.' });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Hatası');
    }
});

module.exports = router;