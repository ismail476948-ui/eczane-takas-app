const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    pharmacyName: { type: String, required: true },
    city: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false }, // Varsayılan: ONAYSIZ
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);