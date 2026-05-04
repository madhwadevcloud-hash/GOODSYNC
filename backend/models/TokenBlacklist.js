const mongoose = require('mongoose');

const tokenBlacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // TTL index - document will be automatically removed at expiresAt
  }
}, { timestamps: true });

module.exports = mongoose.model('TokenBlacklist', tokenBlacklistSchema);
