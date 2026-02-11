const mongoose = require('mongoose');

const feeStructureSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Fee structure details
  name: { type: String, required: true }, // e.g., "Annual Fee 2024-25"
  description: String,
  class: { type: String, required: true }, // e.g., "10", "ALL"
  section: { type: String, default: 'ALL' }, // e.g., "A", "ALL"
  
  // Financial details
  totalAmount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  
  // Installments
  installments: [{
    name: { type: String, required: true }, // e.g., "Term 1 Fee", "Annual Fee"
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    description: String,
    isOptional: { type: Boolean, default: false },
    lateFeeAmount: { type: Number, default: 0 },
    lateFeeAfter: Date // Date after which late fee applies
  }],
  
  // Structure settings
  academicYear: { type: String, required: true }, // e.g., "2024-25"
  isActive: { type: Boolean, default: true },
  applicableFrom: { type: Date, default: Date.now },
  applicableTill: Date,
  
  // Auto-creation settings
  autoCreateStudentRecords: { type: Boolean, default: false },
  
  // Status and tracking
  status: { 
    type: String, 
    enum: ['draft', 'active', 'archived'], 
    default: 'draft' 
  },
  
  // Applied to students count
  appliedToStudents: { type: Number, default: 0 },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for total installments amount
feeStructureSchema.virtual('totalInstallmentsAmount').get(function() {
  return this.installments.reduce((total, installment) => total + installment.amount, 0);
});

// Pre-save middleware to validate installment amounts
feeStructureSchema.pre('save', function(next) {
  const totalInstallments = this.installments.reduce((sum, inst) => sum + inst.amount, 0);
  if (Math.abs(totalInstallments - this.totalAmount) > 0.01) {
    return next(new Error('Sum of installment amounts must equal total amount'));
  }
  next();
});

// Indexes for better query performance
feeStructureSchema.index({ schoolId: 1, class: 1, section: 1 });
feeStructureSchema.index({ schoolId: 1, academicYear: 1, isActive: 1 });
feeStructureSchema.index({ createdAt: -1 });

module.exports = mongoose.model('FeeStructure', feeStructureSchema);
