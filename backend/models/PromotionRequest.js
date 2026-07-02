const mongoose = require('mongoose');

const promotionRequestSchema = new mongoose.Schema({
  schoolCode: { type: String, required: true },
  schoolName: { type: String, required: true },
  requestedBy: { type: String, required: true }, // Admin user ID
  requestedByName: { type: String, required: true }, // Admin name
  fromYear: { type: String, required: true },
  toYear: { type: String, required: true },
  promotionDate: { type: Date, required: true },
  effectiveDate: { type: Date, required: true },
  totalStudents: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['Pending Approval', 'Approved', 'Rejected', 'Completed'], 
    default: 'Pending Approval' 
  },
  rejectionReason: { type: String },
  approvedBy: { type: String }, // Super Admin email/id
  approvedAt: { type: Date },
  rejectedAt: { type: Date },
  completedAt: { type: Date },
  excelReportUrl: { type: String },
  excelReportFilename: { type: String },
  auditLog: [{
    action: { type: String, required: true },
    doneBy: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    details: { type: String }
  }]
}, {
  timestamps: true,
  collection: 'promotion_requests'
});

module.exports = mongoose.model('PromotionRequest', promotionRequestSchema);
