const mongoose = require('mongoose');

const superAdminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: 'superadmin',
    immutable: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  permissions: {
    type: [String],
    default: [
      'manage_schools',
      'manage_users',
      'view_all_data',
      'system_administration'
    ]
  }
}, {
  timestamps: true,
  collection: 'superadmins'
});

// Index for faster queries
superAdminSchema.index({ email: 1 });

module.exports = mongoose.model('SuperAdmin', superAdminSchema);
