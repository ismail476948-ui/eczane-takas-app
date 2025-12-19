const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Medicine = require('../models/Medicine');

// Yeni Takas İsteği Oluştur (POST /api/orders)
router.post('/', auth, async (req, res) => {
    const { medicineId, quantity } = req.body;

    try {
        // 1. İlaç var mı kontrol et
        const medicine = await Medicine.findById(medicineId).populate('user');
        if (!medicine) return res.status(404).json({ message: 'İlaç bulunamadı' });

        // 2. Kendi ilacını alamazsın
        if (medicine.user._id.toString() === req.user.id) {
            return res.status(400).json({ message: 'Kendi ilacınız için takas isteyemezsiniz.' });
        }

        // 3. Stok yeterli mi?
        if (medicine.quantity < quantity) {
            return res.status(400).json({ message: 'Yetersiz stok.' });
        }

        // 4. Siparişi oluştur
        const newOrder = new Order({
            buyer: req.user.id,
            seller: medicine.user._id,
            medicine: medicineId,
            quantity: quantity,
            status: 'Beklemede'
        });

        // 5. İlacın stok adedini düş (Opsiyonel: İstersen sipariş tamamlanınca düşürebilirsin ama hemen düşmek daha güvenli)
        medicine.quantity -= quantity;
        await medicine.save();

        await newOrder.save();
        res.json(newOrder);

    } catch (err) {
        console.error(err);
        res.status(500).send('Sunucu hatası');
    }
});

// Kullanıcının Siparişlerini Getir (Hem Alım Hem Satım)
router.get('/', auth, async (req, res) => {
    try {
        const orders = await Order.find({
            $or: [{ buyer: req.user.id }, { seller: req.user.id }]
        })
        .populate('medicine')
        .populate('buyer', 'pharmacyName city')
        .populate('seller', 'pharmacyName city')
        .sort({ createdAt: -1 });

        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).send('Sunucu hatası');
    }
});

// Sipariş Durumu Güncelle (Onay, İptal vs.)
router.put('/:id', auth, async (req, res) => {
    const { status, qrCodes } = req.body;
    try {
        let order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Sipariş bulunamadı' });

        // Durumu güncelle
        if (status) order.status = status;
        // Karekod varsa ekle
        if (qrCodes) order.qrCodes = qrCodes;

        // Eğer iptal edildiyse stoğu geri iade et
        if (status === 'İptal Edildi') {
            const medicine = await Medicine.findById(order.medicine);
            if (medicine) {
                medicine.quantity += order.quantity;
                await medicine.save();
            }
        }

        await order.save();
        res.json(order);
    } catch (err) {
        console.error(err);
        res.status(500).send('Sunucu hatası');
    }
});

module.exports = router;