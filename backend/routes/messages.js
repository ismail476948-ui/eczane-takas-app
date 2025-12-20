const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const Order = require('../models/Order');

// 1. Belirli bir siparişin mesajlarını getir
router.get('/:orderId', auth, async (req, res) => {
    try {
        const messages = await Message.find({ orderId: req.params.orderId })
            .populate('sender', 'pharmacyName')
            .sort({ createdAt: 1 });
        res.json(messages);
    } catch (err) {
        res.status(500).send('Server Hatası');
    }
});

// 2. Yeni Mesaj Kaydet
router.post('/', auth, async (req, res) => {
    const { orderId, text } = req.body;
    try {
        // Mesajı kaydet
        const newMessage = new Message({
            orderId,
            sender: req.user.id,
            text
        });
        await newMessage.save();

        // Siparişteki bildirim ışığını yak (Order modelini güncelle)
        const order = await Order.findById(orderId);
        if(order) {
            if(req.user.id === order.buyer.toString()) {
                order.unreadForSeller = true; // Alıcı attıysa satıcıya bildirim
            } else {
                order.unreadForBuyer = true;  // Satıcı attıysa alıcıya bildirim
            }
            await order.save();
        }

        res.json(newMessage);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Hatası');
    }
});

// 3. Okunmadı Sayılarını Getir (Kırmızı noktalar için)
router.get('/unread/count', auth, async (req, res) => {
    try {
        // Kullanıcının dahil olduğu siparişleri bul
        const orders = await Order.find({
            $or: [{ buyer: req.user.id }, { seller: req.user.id }]
        });

        const unreadCounts = {};
        
        orders.forEach(order => {
            const isBuyer = order.buyer.toString() === req.user.id;
            // Eğer alıcıysam ve alıcı bildirimi varsa VEYA satıcıysam ve satıcı bildirimi varsa
            if ((isBuyer && order.unreadForBuyer) || (!isBuyer && order.unreadForSeller)) {
                unreadCounts[order._id] = 1; // 1 tane bildirim var işareti
            }
        });

        res.json(unreadCounts);
    } catch (err) {
        res.status(500).send('Server Hatası');
    }
});

// 4. Mesajları Okundu Olarak İşaretle
router.put('/read/:orderId', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if(!order) return res.status(404).send('Sipariş bulunamadı');

        if(req.user.id === order.buyer.toString()) {
            order.unreadForBuyer = false;
        } else {
            order.unreadForSeller = false;
        }
        await order.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).send('Server Hatası');
    }
});

module.exports = router;