const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Parayı veren
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },   // Parayı alan
  amount: { type: Number, required: true },
  description: { type: String }, // Açıklama (Örn: Mart ayı ödemesi)
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', PaymentSchema);