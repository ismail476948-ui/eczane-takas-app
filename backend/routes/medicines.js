const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware'); // Senin kullandığın middleware
const Medicine = require('../models/Medicine');
const User = require('../models/User'); // Admin kontrolü için gerekli

// 1. İLAÇ EKLE
router.post('/', auth, async (req, res) => {
    try {
        const { name, expiryDate, quantity, price, condition, exchangeWith } = req.body;

        const newMedicine = new Medicine({
            user: req.user.id,
            name,
            expiryDate,
            quantity,
            price, 
            condition,
            exchangeWith
        });

        const medicine = await newMedicine.save();
        res.json(medicine);
    } catch (err) {
        console.error("İlaç Ekleme Hatası:", err.message);
        res.status(500).send('Sunucu Hatası');
    }
});

// 2. LİSTELE
router.get('/', async (req, res) => {
    try {
        // Stokta olanları getir ve kullanıcı bilgilerini ekle
        const medicines = await Medicine.find({ quantity: { $gt: 0 } })
            .populate('user', ['username', 'pharmacyName', 'city']);
        res.json(medicines);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Sunucu Hatası');
    }
});

// 3. SİL (GÜNCELLENDİ: Admin yetkisi ve Yetim Veri koruması eklendi)
router.delete('/:id', auth, async (req, res) => {
    try {
        const medicine = await Medicine.findById(req.params.id);
        if (!medicine) return res.status(404).json({ msg: 'İlaç bulunamadı' });

        // İşlemi yapan kullanıcıyı bul (Admin mi bakmak için)
        const currentUser = await User.findById(req.user.id);

        // KONTROL: 
        // 1. İlacın sahibi mi? 
        // 2. Veya işlemi yapan kişi bir Admin mi?
        const isOwner = medicine.user && medicine.user.toString() === req.user.id;
        const isAdmin = currentUser && currentUser.isAdmin;

        if (isOwner || isAdmin) {
            await Medicine.findByIdAndDelete(req.params.id);
            return res.json({ msg: 'İlaç başarıyla silindi' });
        } else {
            return res.status(401).json({ msg: 'Bu ilacı silmek için yetkiniz yok' });
        }

    } catch (err) {
        console.error("İlaç Silme Hatası:", err.message);
        res.status(500).send('Sunucu Hatası');
    }
});

// 4. GÜNCELLE
router.put('/:id', auth, async (req, res) => {
    try {
        let medicine = await Medicine.findById(req.params.id);
        if (!medicine) return res.status(404).json({ message: 'İlaç bulunamadı' });

        const currentUser = await User.findById(req.user.id);
        
        // Güncelleme yetkisi kontrolü (Sahibi veya Admin)
        const isOwner = medicine.user && medicine.user.toString() === req.user.id;
        const isAdmin = currentUser && currentUser.isAdmin;

        if (!isOwner && !isAdmin) {
            return res.status(401).json({ message: 'Yetkisiz' });
        }

        medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(medicine);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Sunucu Hatası');
    }
});

module.exports = router;