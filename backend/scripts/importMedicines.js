const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');
const dotenv = require('dotenv');
const MedicineBase = require('../models/MedicineBase');

dotenv.config({ path: path.join(__dirname, '../.env') });

const importMedicines = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Bağlandı...');

        const filePath = path.join(__dirname, '../ilaçlistesi.xlsx');
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        console.log(`${data.length} adet kayıt okundu, işleniyor...`);

        const formattedData = data.map(item => ({
            name: item['İlaç Adı'] || item.İsim || item.Adı || item.NAME || item.name,
            barcode: item['Güncel Barkod'] || item.Barkod || item.BARCODE || item.barcode || item.ID
        })).filter(item => item.name);

        // Mevcutları temizle (isteğe bağlı)
        // await MedicineBase.deleteMany({});

        for (const item of formattedData) {
            try {
                await MedicineBase.findOneAndUpdate(
                    { barcode: item.barcode },
                    item,
                    { upsert: true, new: true }
                );
            } catch (err) {
                console.error(`Hata (${item.name}):`, err.message);
            }
        }

        console.log('Aktarım tamamlandı.');
        process.exit();
    } catch (err) {
        console.error('Kritik Hata:', err);
        process.exit(1);
    }
};

importMedicines();
