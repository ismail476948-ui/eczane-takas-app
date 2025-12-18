const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Medicine = require('../models/Medicine');

// 1. İLAÇ EKLE
router.post('/', auth, async (req, res) => {
    try {
        // Condition ve exchangeWith zorunlu değil
        const { name, expiryDate, quantity, price, condition, exchangeWith } = req.body;

        const newMedicine = new Medicine({
            user: req.user.id,
            name,
            expiryDate,
            quantity,
            price, // Fiyat alanı eklendi
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
        const medicines = await Medicine.find({ quantity: { $gt: 0 } }).populate('user', ['username', 'pharmacyName', 'city']);
        res.json(medicines);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Sunucu Hatası');
    }
});

// 3. SİL
router.delete('/:id', auth, async (req, res) => {
    try {
        const medicine = await Medicine.findById(req.params.id);
        if (!medicine) return res.status(404).json({ msg: 'İlaç bulunamadı' });
        if (medicine.user.toString() !== req.user.id) return res.status(401).json({ msg: 'Yetkisiz' });

        await Medicine.findByIdAndDelete(req.params.id);
        res.json({ msg: 'İlaç silindi' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Sunucu Hatası');
    }
});

// 4. GÜNCELLE
router.put('/:id', auth, async (req, res) => {
    try {
        let medicine = await Medicine.findById(req.params.id);
        if (!medicine) return res.status(404).json({ message: 'İlaç bulunamadı' });
        if (medicine.user.toString() !== req.user.id) return res.status(401).json({ message: 'Yetkisiz' });

        medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(medicine);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Sunucu Hatası');
    }
});

module.exports = router;