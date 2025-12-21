const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const MedicineBase = require('../models/MedicineBase');

dotenv.config({ path: path.join(__dirname, '../.env') });

const testSearch = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Bağlandı...');

        const query = 'Parol';
        const results = await MedicineBase.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { barcode: { $regex: query, $options: 'i' } }
            ]
        });

        console.log(`'${query}' için sonuç sayısı: ${results.length}`);
        if (results.length > 0) {
            console.log('İlk 3 sonuç:', results.slice(0, 3).map(r => r.name));
        } else {
            // Hiç sonuç yoksa veritabanında kayıt var mı ona bakalım
            const count = await MedicineBase.countDocuments();
            console.log(`Toplam kayıt sayısı: ${count}`);
        }

        process.exit();
    } catch (err) {
        console.error('Hata:', err);
        process.exit(1);
    }
};

testSearch();
