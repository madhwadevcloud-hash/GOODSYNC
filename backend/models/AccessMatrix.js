const mongoose = require('mongoose');

const accessMatrixSchema = new mongoose.Schema({
  schoolCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  accessMatrix: {
    type: Map,
    of: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      approve: { type: Boolean, default: false },
      export: { type: Boolean, default: false }
    },
    default: {}
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add static method to get model for a specific connection
accessMatrixSchema.statics.getModelForConnection = function(connection) {
  return connection.model('AccessMatrix', accessMatrixSchema);
};

// Add index for faster lookups
accessMatrixSchema.index({ schoolCode: 1 }, { unique: true });

// Create model
const AccessMatrix = mongoose.model('AccessMatrix', accessMatrixSchema);

module.exports = AccessMatrix;
