const mongoose = require('mongoose');

const admissionSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Admission details
  admissionNumber: { type: String, required: true, unique: true },
  admissionDate: { type: Date, default: Date.now },
  academicYear: { type: String, required: true },
  class: { type: String, required: true },
  section: { type: String, required: true },
  semester: { type: String, enum: ['SA-1', 'SA-2', 'FA-1', 'FA-2'], required: true },
  mediumOfInstruction: { type: String, enum: ['Kannada', 'English', 'Hindi', 'Urdu', 'Marathi', 'Tamil', 'Telugu'], required: true },

  // Student personal details
  personalInfo: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    firstNameKannada: { type: String },
    lastNameKannada: { type: String },
    dateOfBirth: { type: Date, required: true },
    age: {
      years: { type: Number },
      months: { type: Number }
    },
    ageAppropriationReason: { type: String },
    gender: { type: String, enum: ['Male', 'Female'], required: true },
    bloodGroup: String,
    nationality: String,
    religion: { type: String, enum: ['Hindu', 'Muslim', 'Christian', 'Others'] },
    motherTongue: { type: String, enum: ['Kannada', 'English', 'Hindi', 'Urdu', 'Marathi', 'Tamil', 'Telugu', 'Others'] }
  },

  // Family Details
  familyInfo: {
    father: {
      firstName: { type: String, required: true },
      middleName: { type: String },
      lastName: { type: String, required: true },
      firstNameKannada: { type: String },
      middleNameKannada: { type: String },
      lastNameKannada: { type: String },
      aadharNo: { type: String, required: true }
    },
    mother: {
      firstName: { type: String, required: true },
      middleName: { type: String },
      lastName: { type: String, required: true },
      firstNameKannada: { type: String },
      middleNameKannada: { type: String },
      lastNameKannada: { type: String },
      aadharNo: { type: String, required: true }
    }
  },

  // Identity Documents
  identityDocuments: {
    aadharKPRNo: { type: String, required: true },
    studentCasteCertificateNo: { type: String },
    fatherCasteCertificateNo: { type: String },
    motherCasteCertificateNo: { type: String }
  },

  // Caste and Category Information
  casteCategoryInfo: {
    studentCaste: { type: String },
    fatherCaste: { type: String },
    motherCaste: { type: String },
    socialCategory: { type: String, enum: ['GENERAL', 'SC', 'ST', 'OBC'], required: true },
    specialCategory: { type: String, enum: ['None', 'Others'] }
  },

  // Economic Status
  economicStatus: {
    belongingToBPL: { type: String, enum: ['Yes', 'No'], required: true },
    bplCardNo: { type: String },
    bhagyalakshmiBondNo: { type: String }
  },

  // Special Needs
  specialNeeds: {
    disability: { type: String, enum: ['None', 'Leprosy Cured persons', 'Dwarfism', 'Intellectual Disability', 'Muscular Dystrophy', 'Others'], required: true }
  },

  // Contact information
  contactInfo: {
    address: {
      urbanRural: { type: String, enum: ['Urban', 'Rural'], required: true },
      pinCode: { type: String, required: true },
      district: { type: String, required: true },
      taluka: { type: String },
      cityVillageTown: { type: String },
      locality: { type: String },
      fullAddress: { type: String, required: true }
    },
    communication: {
      studentMobileNo: { type: String },
      studentEmailId: { type: String },
      fatherMobileNo: { type: String, required: true },
      fatherEmailId: { type: String },
      motherMobileNo: { type: String, required: true },
      motherEmailId: { type: String }
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String
    }
  },

  // School and Banking Information
  schoolBankingInfo: {
    schoolAdmissionDate: { type: Date, required: true },
    bankingDetails: {
      bankName: { type: String },
      bankAccountNo: { type: String },
      bankIFSCCode: { type: String }
    },
    transportation: {
      bmtcBusPass: { type: String, enum: ['Required', 'Not Required'], required: true }
    }
  },

  // Academic information
  academicInfo: {
    previousSchool: String,
    lastClassAttended: String,
    lastSchoolYear: String,
    reasonForTransfer: String,
    achievements: [String]
  },

  // Parent/Guardian information
  parentInfo: {
    father: {
      name: String,
      occupation: String,
      phone: String,
      email: String,
      address: String
    },
    mother: {
      name: String,
      occupation: String,
      phone: String,
      email: String,
      address: String
    },
    guardian: {
      name: String,
      relationship: String,
      occupation: String,
      phone: String,
      email: String,
      address: String
    }
  },

  // Documents
  documents: {
    birthCertificate: { type: String, default: 'pending' },
    transferCertificate: { type: String, default: 'pending' },
    characterCertificate: { type: String, default: 'pending' },
    marksheet: { type: String, default: 'pending' },
    photo: { type: String, default: 'pending' }
  },

  // Admission status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'admitted', 'withdrawn'],
    default: 'pending'
  },

  // Fee information
  fees: {
    admissionFee: { type: Number, required: true },
    tuitionFee: { type: Number, required: true },
    otherFees: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['pending', 'partial', 'paid'], default: 'pending' }
  },

  // Admin notes
  adminNotes: String,
  rejectionReason: String,

  // Processing information
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt: Date,

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
admissionSchema.virtual('fullName').get(function() {
  return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
});

// Virtual for full class
admissionSchema.virtual('fullClass').get(function() {
  return `${this.class}-${this.section}`;
});

// Index for better query performance
admissionSchema.index({ schoolId: 1, status: 1 });
admissionSchema.index({ studentId: 1 });
admissionSchema.index({ parentId: 1 });
admissionSchema.index({ academicYear: 1, class: 1, section: 1 });

module.exports = mongoose.model('Admission', admissionSchema);
