const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    pharmacyName: { type: String, required: true },
    city: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    
    // YENİ EKLENEN ALANLAR
    pharmacistName: { type: String, default: '' }, // Eczacı Adı Soyadı
    address: { type: String, default: '' },        // Açık Adres
    phoneNumber: { type: String, default: '' },    // Telefon Numarası

    isAdmin: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);