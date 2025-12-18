const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Payment = require('../models/Payment');
const User = require('../models/User');

// 1. ÖDEME EKLE (Para Gönderdim veya Para Aldım)
router.post('/', auth, async (req, res) => {
    try {
        const { targetUserId, amount, type, description } = req.body;
        // type: 'sent' (Ben ödedim) veya 'received' (Ben tahsil ettim)
        
        let fromUser, toUser;

        if (type === 'sent') {
            fromUser = req.user.id;     // Gönderen Ben
            toUser = targetUserId;      // Alan O
        } else {
            fromUser = targetUserId;    // Gönderen O
            toUser = req.user.id;       // Alan Ben
        }

        const newPayment = new Payment({
            fromUser,
            toUser,
            amount,
            description
        });

        await newPayment.save();
        res.json(newPayment);

    } catch (err) {
        console.error(err);
        res.status(500).send('Sunucu Hatası');
    }
});

// 2. TÜM ÖDEMELERİ GETİR (Benimle ilgili olanlar)
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
        res.status(500).send('Sunucu Hatası');
    }
});

// ... üstteki kodlar ...

// 3. ÖDEME SİL (Hatalı işlemi geri al)
router.delete('/:id', auth, async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ message: 'Ödeme kaydı bulunamadı.' });
        }

        // Güvenlik: Sadece işlemi yapan taraflar silebilir
        if (payment.fromUser.toString() !== req.user.id && payment.toUser.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Bu işlemi silme yetkiniz yok.' });
        }

        await Payment.findByIdAndDelete(req.params.id);
        res.json({ message: 'Ödeme kaydı silindi.' });

    } catch (err) {
        console.error(err);
        res.status(500).send('Sunucu Hatası');
    }
});

module.exports = router;