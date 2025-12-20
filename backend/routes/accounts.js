const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Order = require('../models/Order');

// 1. Cari Hesap Verilerini Getir
router.get('/', auth, async (req, res) => {
    try {
        // İlgili tüm 'Tamamlandı' (Aktif Borç) ve 'Ödendi' (Geçmiş) siparişleri çek
        const orders = await Order.find({
            $or: [{ buyer: req.user.id }, { seller: req.user.id }],
            status: { $in: ['Tamamlandı', 'Ödendi'] }
        })
        .populate('medicine', 'name price')
        .populate('buyer', 'pharmacyName')
        .populate('seller', 'pharmacyName')
        .sort({ updatedAt: -1 });

        const balances = {};

        orders.forEach(order => {
            // Sadece 'Tamamlandı' olanlar bakiyeye yansır
            if (order.status === 'Tamamlandı') {
                const price = order.medicine?.price || 0;
                const total = price * order.quantity;

                const isBuyer = order.buyer._id.toString() === req.user.id;
                const partnerId = isBuyer ? order.seller._id.toString() : order.buyer._id.toString();
                const partnerName = isBuyer ? order.seller.pharmacyName : order.buyer.pharmacyName;

                if (!balances[partnerId]) {
                    balances[partnerId] = {
                        partnerId,
                        partnerName,
                        debt: 0,       
                        receivable: 0  
                    };
                }

                if (isBuyer) balances[partnerId].debt += total;
                else balances[partnerId].receivable += total;
            }
        });

        const movements = orders.map(order => {
            const isBuyer = order.buyer._id.toString() === req.user.id;
            const price = order.medicine?.price || 0;
            return {
                _id: order._id,
                partnerName: isBuyer ? order.seller.pharmacyName : order.buyer.pharmacyName,
                medicineName: order.medicine?.name || 'Silinmiş İlaç',
                quantity: order.quantity,
                totalPrice: price * order.quantity,
                type: isBuyer ? 'Borç (Aldım)' : 'Alacak (Sattım)',
                status: order.status,
                date: order.updatedAt || order.createdAt
            };
        });

        res.json({
            balances: Object.values(balances),
            movements: movements
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Hatası');
    }
});

// 2. Hesaplaş (HATA BURADAYDI - DÜZELTİLDİ)
router.post('/settle', auth, async (req, res) => {
    const { partnerId } = req.body;

    if (!partnerId) {
        return res.status(400).json({ message: 'Eczane ID bulunamadı.' });
    }

    try {
        // Hem benim o kişiye olan borçlarımı, hem onun bana olan borçlarını kapat
        // Sadece 'Tamamlandı' statüsündekileri 'Ödendi' yap
        await Order.updateMany(
            {
                $or: [
                    { buyer: req.user.id, seller: partnerId },
                    { buyer: partnerId, seller: req.user.id }
                ],
                status: 'Tamamlandı'
            },
            { $set: { status: 'Ödendi' } }
        );

        res.json({ message: 'Hesaplaşma tamamlandı.' });
    } catch (err) {
        console.error("Hesaplaşma Hatası:", err);
        res.status(500).send('Hata');
    }
});

// 3. Ödemeyi Geri Al
router.post('/undo/:id', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if(!order) return res.status(404).send('Bulunamadı');

        if(order.status === 'Ödendi') {
            order.status = 'Tamamlandı';
            await order.save();
            res.json({ message: 'Geri alındı.' });
        } else {
            res.status(400).send('İşlem uygun değil.');
        }
    } catch (err) {
        res.status(500).send('Hata');
    }
});

module.exports = router;