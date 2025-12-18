const mongoose = require('mongoose');

const MedicineSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  expiryDate: { type: Date, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true }, // Fiyat ZORUNLU
  
  // Bunlar opsiyonel, hata vermemesi için required yok
  condition: { type: String, default: 'Yeni' }, 
  exchangeWith: { type: String },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Medicine', MedicineSchema);