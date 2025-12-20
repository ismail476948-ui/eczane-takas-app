const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    pharmacyName: { type: String, required: true },
    city: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    
    pharmacistName: { type: String, default: '' },
    address: { type: String, default: '' },
    phoneNumber: { type: String, default: '' },

    isAdmin: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    
    // YENİ: ŞİFRE SIFIRLAMA ALANLARI
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);