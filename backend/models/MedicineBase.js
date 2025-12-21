const mongoose = require('mongoose');

const MedicineBaseSchema = new mongoose.Schema({
    name: { type: String, required: true },
    barcode: { type: String, unique: true, sparse: true }, // sparse allows multiple nulls if barcode is missing for some
    createdAt: { type: Date, default: Date.now }
});

// Index for faster searching
MedicineBaseSchema.index({ name: 'text', barcode: 'text' });

module.exports = mongoose.model('MedicineBase', MedicineBaseSchema);
