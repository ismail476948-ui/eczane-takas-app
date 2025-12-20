const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const Order = require('../models/Order');

// 1. Bir siparişe ait mesajları getir
router.get('/:orderId', auth, async (req, res) => {
    try {
        const messages = await Message.find({ orderId: req.params.orderId })
            .populate('sender', 'pharmacyName') // Gönderen ismini al
            .sort({ createdAt: 1 });
        res.json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Hatası');
    }
});

// 2. Yeni Mesaj Gönder ve Bildirimi Yak
router.post('/', auth, async (req, res) => {
    const { orderId, text } = req.body;
    try {
        // Mesajı Kaydet
        const newMessage = new Message({
            orderId,
            sender: req.user.id,
            text
        });
        await newMessage.save();

        // Siparişteki Bildirimi Güncelle
        const order = await Order.findById(orderId);
        if(order) {
            // Eğer gönderen ALICI ise -> SATICI için okunmadı yap
            if(req.user.id === order.buyer.toString()) {
                order.unreadForSeller = true;
            } 
            // Eğer gönderen SATICI ise -> ALICI için okunmadı yap
            else {
                order.unreadForBuyer = true;
            }
            await order.save();
        }

        // Gönderilen mesajı, gönderen bilgisini populate ederek geri dön
        // (Frontend'de anında göstermek için lazım)
        const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'pharmacyName');
        res.json(populatedMessage);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Hatası');
    }
});

// 3. Okunmadı Sayılarını Getir
router.get('/unread/count', auth, async (req, res) => {
    try {
        const orders = await Order.find({
            $or: [{ buyer: req.user.id }, { seller: req.user.id }]
        });

        const unreadCounts = {};
        orders.forEach(order => {
            const isBuyer = order.buyer.toString() === req.user.id;
            // Alıcıysam ve alıcı bildirimi varsa VEYA satıcıysam ve satıcı bildirimi varsa
            if ((isBuyer && order.unreadForBuyer) || (!isBuyer && order.unreadForSeller)) {
                unreadCounts[order._id] = 1;
            }
        });
        res.json(unreadCounts);
    } catch (err) {
        res.status(500).send('Server Hatası');
    }
});

// 4. Mesajları Okundu İşaretle
router.put('/read/:orderId', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if(!order) return res.status(404).send('Sipariş yok');

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