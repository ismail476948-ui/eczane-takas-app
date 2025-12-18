const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  quantity: { type: Number, required: true },
  status: { 
    type: String, 
    // BURAYA 'İptal Edildi' EKLEDİK 👇
    enum: ['Beklemede', 'Onaylandı', 'Transferde', 'Tamamlandı', 'İptal Edildi'], 
    default: 'Beklemede' 
  },
  qrCodes: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);