var mongoose = require('mongoose');

var rentalSchema = new mongoose.Schema({
    userId: String,
    rentalId: Number,
    status: { type: String, enum: ["RESERVED", "EXPIRED", "CANCELLED", "ACTIVE", "PAST"], default: "RESERVED"},
    hubId: Number,
    hubName: String,
    lockerId: Number,
    lat: Number,
    long: Number,
    reservationTime: { type: Number, default: 0},
    checkInTime: { type: Number, default: 0 },
    checkOutTime: { type: Number, default: 0},
    baseRate: Number,
    hourlyRate: Number,
    firedProximityNotif: { type: Boolean, default: false },
    firedDurationNotif: { type: Boolean, default: false },
    firedExpirationNotif: { type: Boolean, default: false}
});

module.exports = mongoose.model('Rental', rentalSchema);