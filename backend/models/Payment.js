const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['sent', 'received'], required: true }, // Gönderildi / Alındı
    description: { type: String, default: '' },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', PaymentSchema);