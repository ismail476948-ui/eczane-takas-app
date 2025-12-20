const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
    quantity: { type: Number, required: true },
    status: { type: String, default: 'Beklemede' },
    qrCodes: { type: String, default: '' },
    
    // YENİ: BİLDİRİM SİSTEMİ İÇİN
    // Alıcı (Buyer) için okunmamış mesaj var mı?
    unreadForBuyer: { type: Boolean, default: false },
    // Satıcı (Seller) için okunmamış mesaj var mı?
    unreadForSeller: { type: Boolean, default: false },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);