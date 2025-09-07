// server/models/Channel.js

const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
  },
  isPrivate: {
    type: Boolean,
    default: false,
  },
  // Untuk DM, isPrivate = true dan name bisa null
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
}, { timestamps: true });

const Channel = mongoose.model('Channel', channelSchema);
module.exports = Channel;
