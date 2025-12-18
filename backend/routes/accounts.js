const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Order = require('../models/Order');

// CARİ HESAP ÖZETİNİ GETİR
router.get('/', auth, async (req, res) => {
    try {
        const currentUserId = req.user.id;

        // 1. Beni ilgilendiren ve TAMAMLANMIŞ tüm siparişleri çek
        const orders = await Order.find({
            status: 'Tamamlandı',
            $or: [{ buyer: currentUserId }, { seller: currentUserId }]
        })
        .populate('medicine', 'name price') // İlaç adı ve FİYATI lazım
        .populate('buyer', 'pharmacyName username')
        .populate('seller', 'pharmacyName username');

        // 2. Hesaplama Yap (Gruplama)
        let accounts = {};

        orders.forEach(order => {
            // İlaç silinmişse veya fiyatı yoksa hesaplamaya katma (Hata önleyici)
            if (!order.medicine || !order.medicine.price) return;

            const totalAmount = order.quantity * order.medicine.price;
            
            // Eğer SATICI ben isem -> Karşı taraf (ALICI) bana borçlu (Alacağım var)
            if (order.seller._id.toString() === currentUserId) {
                const otherPartyId = order.buyer._id.toString();
                
                if (!accounts[otherPartyId]) {
                    accounts[otherPartyId] = { 
                        name: order.buyer.pharmacyName || order.buyer.username,
                        debt: 0,   // Onların bana borcu (Benim Alacağım)
                        credit: 0  // Benim onlara borcum
                    };
                }
                accounts[otherPartyId].debt += totalAmount;
            }

            // Eğer ALICI ben isem -> Ben karşı tarafa (SATICI) borçluyum
            else if (order.buyer._id.toString() === currentUserId) {
                const otherPartyId = order.seller._id.toString();

                if (!accounts[otherPartyId]) {
                    accounts[otherPartyId] = { 
                        name: order.seller.pharmacyName || order.seller.username,
                        debt: 0,
                        credit: 0
                    };
                }
                accounts[otherPartyId].credit += totalAmount;
            }
        });

        // 3. Objeyi diziye çevirip gönder (Frontend rahat okusun diye)
        const accountsArray = Object.keys(accounts).map(key => ({
            userId: key,
            ...accounts[key],
            balance: accounts[key].debt - accounts[key].credit // Net Durum (+ ise alacaklıyım, - ise borçluyum)
        }));

        res.json(accountsArray);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;