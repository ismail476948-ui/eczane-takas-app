const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const MedicineBase = require('../models/MedicineBase');

// 1. İLAÇ ARA (İsim veya Barkod ile)
router.get('/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.json([]);

        const medicines = await MedicineBase.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { barcode: { $regex: query, $options: 'i' } }
            ]
        }).limit(20); // Performans için limit koyuyoruz

        res.json(medicines);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Sunucu Hatası');
    }
});

// 2. YENİ İLAÇ TANIMLA (Master Listeye)
router.post('/', auth, async (req, res) => {
    try {
        const { name, barcode } = req.body;

        // Barkod kontrolü (varsa)
        if (barcode) {
            const existing = await MedicineBase.findOne({ barcode });
            if (existing) return res.status(400).json({ message: 'Bu barkod zaten sistemde kayıtlı.' });
        }

        const newBase = new MedicineBase({ name, barcode });
        await newBase.save();
        res.json(newBase);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Sunucu Hatası');
    }
});

module.exports = router;
