var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
  userId: { type: String, unique: true, index: true },
  name: String,
  email: String,
  gender: String,
  birthday: String,
  picture: String,
  pin: Number,
  proximity: Number,
  durationNotif: Number,
  updateTimeStamp: Number
});

module.exports = mongoose.model('User', userSchema);