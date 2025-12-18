const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  
  // YENİ EKLENEN: Okundu mu?
  isRead: { type: Boolean, default: false }, 

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', MessageSchema);