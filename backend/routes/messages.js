const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Message = require('../models/Message');
const Order = require('../models/Order');

// 1. MESAJ GÖNDER
router.post('/', auth, async (req, res) => {
    try {
        const { orderId, text } = req.body;
        const newMessage = new Message({
            order: orderId,
            sender: req.user.id,
            text
        });
        await newMessage.save();
        const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'username pharmacyName');
        res.json(populatedMessage);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. BİR SİPARİŞİN MESAJLARINI GETİR
router.get('/:orderId', auth, async (req, res) => {
    try {
        const messages = await Message.find({ order: req.params.orderId })
            .populate('sender', 'username pharmacyName')
            .sort({ createdAt: 1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. (YENİ) OKUNMAMIŞ MESAJ SAYILARINI GETİR
router.get('/unread/count', auth, async (req, res) => {
    try {
        // Benim dahil olduğum siparişleri bul
        const myOrders = await Order.find({
            $or: [{ buyer: req.user.id }, { seller: req.user.id }]
        }).select('_id');

        const orderIds = myOrders.map(o => o._id);

        // Bu siparişlerdeki, GÖNDERENİ BEN OLMAYAN ve OKUNMAMIŞ mesajları say
        const unreadMessages = await Message.aggregate([
            { 
                $match: { 
                    order: { $in: orderIds },
                    sender: { $ne: req.user._id }, // Ben göndermediysem
                    isRead: false // Ve okunmadıysa
                } 
            },
            {
                $group: {
                    _id: "$order", // Sipariş bazında grupla
                    count: { $sum: 1 } // Say
                }
            }
        ]);

        // Frontend'in kolay okuması için objeye çevir: { "siparisId": 5, "siparisId2": 1 }
        let counts = {};
        unreadMessages.forEach(item => {
            counts[item._id] = item.count;
        });

        res.json(counts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 4. (YENİ) MESAJLARI OKUNDU İŞARETLE
router.put('/read/:orderId', auth, async (req, res) => {
    try {
        // Bu siparişteki, bana gelen tüm mesajları okundu yap
        await Message.updateMany(
            { 
                order: req.params.orderId,
                sender: { $ne: req.user.id },
                isRead: false
            },
            { $set: { isRead: true } }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;