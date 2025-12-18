const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  pharmacyName: { type: String, required: true },
  city: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  
  // YENİ EKLENEN: Admin yetkisi (Varsayılan false)
  isAdmin: { type: Boolean, default: false },

  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);