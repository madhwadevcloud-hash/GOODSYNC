const mongoose = require('mongoose');

const IDCardTemplateSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  orientation: {
    type: String,
    enum: ['landscape', 'portrait'],
    required: true
  },
  side: {
    type: String,
    enum: ['front', 'back'],
    required: true
  },
  templateImage: {
    type: String,
    required: true // Path to the uploaded template image
  },
  // Template configuration for data placement
  dataFields: {
    studentName: {
      x: Number,
      y: Number,
      fontSize: { type: Number, default: 12 },
      fontColor: { type: String, default: '#000000' },
      fontFamily: { type: String, default: 'Arial' },
      enabled: { type: Boolean, default: true }
    },
    studentId: {
      x: Number,
      y: Number,
      fontSize: { type: Number, default: 10 },
      fontColor: { type: String, default: '#000000' },
      fontFamily: { type: String, default: 'Arial' },
      enabled: { type: Boolean, default: true }
    },
    className: {
      x: Number,
      y: Number,
      fontSize: { type: Number, default: 10 },
      fontColor: { type: String, default: '#000000' },
      fontFamily: { type: String, default: 'Arial' },
      enabled: { type: Boolean, default: true }
    },
    section: {
      x: Number,
      y: Number,
      fontSize: { type: Number, default: 10 },
      fontColor: { type: String, default: '#000000' },
      fontFamily: { type: String, default: 'Arial' },
      enabled: { type: Boolean, default: true }
    },
    dateOfBirth: {
      x: Number,
      y: Number,
      fontSize: { type: Number, default: 9 },
      fontColor: { type: String, default: '#000000' },
      fontFamily: { type: String, default: 'Arial' },
      enabled: { type: Boolean, default: false }
    },
    bloodGroup: {
      x: Number,
      y: Number,
      fontSize: { type: Number, default: 9 },
      fontColor: { type: String, default: '#000000' },
      fontFamily: { type: String, default: 'Arial' },
      enabled: { type: Boolean, default: false }
    },
    fatherName: {
      x: Number,
      y: Number,
      fontSize: { type: Number, default: 9 },
      fontColor: { type: String, default: '#000000' },
      fontFamily: { type: String, default: 'Arial' },
      enabled: { type: Boolean, default: false }
    },
    motherName: {
      x: Number,
      y: Number,
      fontSize: { type: Number, default: 9 },
      fontColor: { type: String, default: '#000000' },
      fontFamily: { type: String, default: 'Arial' },
      enabled: { type: Boolean, default: false }
    },
    address: {
      x: Number,
      y: Number,
      fontSize: { type: Number, default: 8 },
      fontColor: { type: String, default: '#000000' },
      fontFamily: { type: String, default: 'Arial' },
      enabled: { type: Boolean, default: false }
    },
    phone: {
      x: Number,
      y: Number,
      fontSize: { type: Number, default: 9 },
      fontColor: { type: String, default: '#000000' },
      fontFamily: { type: String, default: 'Arial' },
      enabled: { type: Boolean, default: false }
    }
  },
  // Photo placement configuration
  photoPlacement: {
    x: Number,
    y: Number,
    width: Number,
    height: Number,
    enabled: { type: Boolean, default: true }
  },
  // School logo placement (optional)
  schoolLogoPlacement: {
    x: Number,
    y: Number,
    width: Number,
    height: Number,
    enabled: { type: Boolean, default: false }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
IDCardTemplateSchema.index({ schoolId: 1, orientation: 1, side: 1 });
IDCardTemplateSchema.index({ schoolId: 1, isActive: 1 });

// Update the updatedAt field before saving
IDCardTemplateSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('IDCardTemplate', IDCardTemplateSchema);
