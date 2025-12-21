const mongoose = require('mongoose');

const MedicineSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  baseMedicine: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicineBase' }, // Master listeden referans
  name: { type: String, required: true }, // Master listedeki isim veya özel isim
  expiryDate: { type: Date, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },

  condition: { type: String, default: 'Yeni' },
  exchangeWith: { type: String },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Medicine', MedicineSchema);