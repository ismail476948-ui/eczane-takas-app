const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Medicine = require('../models/Medicine');

// 1. Yeni Takas İsteği (Sipariş) Oluştur
router.post('/', auth, async (req, res) => {
    const { medicineId, quantity } = req.body;

    try {
        const medicine = await Medicine.findById(medicineId).populate('user');
        if (!medicine) return res.status(404).json({ message: 'İlaç bulunamadı' });

        if (medicine.user._id.toString() === req.user.id) {
            return res.status(400).json({ message: 'Kendi ilacını alamazsın.' });
        }

        if (medicine.quantity < quantity) {
            return res.status(400).json({ message: 'Yetersiz stok.' });
        }

        const newOrder = new Order({
            buyer: req.user.id,
            seller: medicine.user._id,
            medicine: medicineId,
            quantity: quantity,
            status: 'Beklemede'
        });

        // Stoktan düş
        medicine.quantity -= quantity;
        await medicine.save();

        await newOrder.save();
        res.json(newOrder);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Hatası');
    }
});

// 2. Siparişleri Getir (Benim aldıklarım veya sattıklarım)
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
        res.status(500).send('Server Hatası');
    }
});

// 3. Sipariş Durumu Güncelleme (Onay, İptal, Karekod Ekleme)
router.put('/:id', auth, async (req, res) => {
    const { status, qrCodes } = req.body; // <--- KAREKODLAR BURADA ALINIYOR

    try {
        let order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Sipariş bulunamadı' });

        // Durumu güncelle
        if (status) order.status = status;
        
        // Karekod varsa kaydet (DÜZELTİLEN KISIM BURASI)
        if (qrCodes && Array.isArray(qrCodes)) {
            order.qrCodes = qrCodes;
        }

        // İptal edilirse stoğu iade et
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
        res.status(500).send('Server Hatası');
    }
});

// 4. "Okundu" İşaretleme (Kırmızı noktayı söndürmek için)
router.put('/:id/mark-read', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Sipariş bulunamadı' });

        // İsteği yapan Alıcı ise -> Alıcı bildirimini kapat
        if (req.user.id === order.buyer.toString()) {
            order.unreadForBuyer = false;
        } 
        // İsteği yapan Satıcı ise -> Satıcı bildirimini kapat
        else if (req.user.id === order.seller.toString()) {
            order.unreadForSeller = false;
        }

        await order.save();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Hatası');
    }
});

module.exports = router;