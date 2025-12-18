const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const Medicine = require('../models/Medicine');

// 1. SİPARİŞ OLUŞTUR
router.post('/', auth, async (req, res) => {
    try {
        const { medicineId, sellerId, quantity } = req.body;

        // Kendi ilacını alamasın
        if (sellerId === req.user.id) {
            return res.status(400).json({ message: "Kendi ilacınızı talep edemezsiniz." });
        }

        // Stok kontrolü (Opsiyonel ama iyi olur)
        const medicine = await Medicine.findById(medicineId);
        if (!medicine || medicine.quantity < quantity) {
             return res.status(400).json({ message: "Yetersiz stok." });
        }

        const newOrder = new Order({
            buyer: req.user.id,
            seller: sellerId,
            medicine: medicineId,
            quantity
        });

        const order = await newOrder.save();
        res.json(order);
    } catch (err) {
        console.error("Sipariş Hatası:", err.message);
        res.status(500).send('Sunucu Hatası');
    }
});

// 2. TAKASLARI GETİR
router.get('/', auth, async (req, res) => {
    try {
        const orders = await Order.find({
            $or: [{ buyer: req.user.id }, { seller: req.user.id }]
        })
        .populate('medicine', 'name price') // İlaç adı ve FİYATI
        .populate('buyer', 'username pharmacyName')
        .populate('seller', 'username pharmacyName')
        .sort({ createdAt: -1 });

        res.json(orders);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Sunucu Hatası');
    }
});

// 3. DURUM GÜNCELLEME (STOK MANTIĞI DEĞİŞTİ)
router.put('/:id', auth, async (req, res) => {
    try {
        const { status, qrCodes } = req.body;
        
        // Siparişi bul
        let order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ msg: 'Sipariş bulunamadı' });

        // İlacı bul
        const medicine = await Medicine.findById(order.medicine);

        // --- STOK DÜŞME İŞLEMİ (ONAYLANINCA) ---
        if (status === 'Onaylandı' && order.status === 'Beklemede') {
            if (!medicine) {
                return res.status(404).json({ msg: 'İlaç bulunamadı (Silinmiş olabilir)' });
            }
            // Stok Yeterli mi?
            if (medicine.quantity < order.quantity) {
                return res.status(400).json({ msg: 'Yetersiz stok! İlaç tükenmiş olabilir.' });
            }
            
            // Stoğu Düş
            medicine.quantity -= order.quantity;
            await medicine.save();
        }

        // --- STOK İADE İŞLEMİ (İPTAL EDİLİNCE) ---
        // Eğer sipariş daha önce onaylandıysa veya transfer aşamasındaysa, stoktan düşülmüş demektir.
        // İptal edilince stoğu geri vermeliyiz.
        if (status === 'İptal Edildi' && (order.status === 'Onaylandı' || order.status === 'Transferde')) {
            if (medicine) {
                medicine.quantity += order.quantity;
                await medicine.save();
            }
        }

        // Durumu ve varsa Karekodları güncelle
        order.status = status;
        if (qrCodes) order.qrCodes = qrCodes;
        
        await order.save();
        res.json(order);

    } catch (err) {
        console.error("Güncelleme Hatası:", err.message);
        res.status(500).send('Sunucu Hatası');
    }
});

module.exports = router;