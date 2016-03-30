var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
  userId: { type: String, unique: true, index: true },
  name: String,
  email: String,
  birthday: String,
  gender: String,
  picture: String,
  pin: Number,
  updateTimeStamp: Date
});

module.exports = mongoose.model('User', userSchema);