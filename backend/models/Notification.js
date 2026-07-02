const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // 'superadmin' or user ID of specific Admin
  role: { type: String, required: true }, // 'admin' | 'superadmin'
  schoolCode: { type: String },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'system_notifications'
});

module.exports = mongoose.model('SystemNotification', notificationSchema);
