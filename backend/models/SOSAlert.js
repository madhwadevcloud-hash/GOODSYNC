const mongoose = require('mongoose');

const sosAlertSchema = new mongoose.Schema({
  schoolCode: {
    type: String,
    required: true,
    index: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  studentName: {
    type: String,
    required: true
  },
  studentClass: {
    type: String
  },
  studentRollNo: {
    type: String,
    default: 'N/A'
  },
  studentMobile: {
    type: String,
    default: 'N/A'
  },
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'resolved'],
    default: 'active'
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  acknowledgedAt: {
    type: Date
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: {
    type: Date
  },
  notes: {
    type: String
  },
  location: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
sosAlertSchema.index({ schoolCode: 1, status: 1, timestamp: -1 });

// Multi-tenant model factory
function getModelForConnection(connection) {
  return connection.model('SOSAlert', sosAlertSchema);
}

module.exports = {
  getModelForConnection,
  schema: sosAlertSchema
};