const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
    quantity: { type: Number, required: true },
    status: { type: String, default: 'Beklemede' }, // Beklemede, Onaylandı, Transferde, Tamamlandı, İptal Edildi
    
    // Karekodlar (Array olarak tutuyoruz)
    qrCodes: { type: [String], default: [] },
    
    // Bildirim Sistemi
    unreadForBuyer: { type: Boolean, default: false },
    unreadForSeller: { type: Boolean, default: false },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);