const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, unique: true }, // Generated ID like "NPS_ADM001", "NPS_TEA001"
  
  // Make schoolCode conditional based on role
  schoolCode: {
    type: String,
    required: function() {
      return this.role !== 'superadmin';
    }
  },
  
  // Enhanced Name Structure
  name: {
    firstName: {
      type: String,
      required: function () {
        return this.role !== 'superadmin';
      },
      minlength: 2,
      maxlength: 50
    },
    middleName: { type: String, maxlength: 50 },
    lastName: {
      type: String,
      required: function () {
        return this.role !== 'superadmin';
      },
      minlength: 2,
      maxlength: 50
    },
    displayName: { type: String } // Auto-generated: "firstName lastName"
  },
  
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  temporaryPassword: { type: String },
  passwordChangeRequired: { type: Boolean, default: true },
  
  role: { 
    type: String, 
    enum: ['superadmin', 'admin', 'teacher', 'student', 'parent'],
    required: true
  },
  
  // Enhanced Contact Information
  contact: {
    primaryPhone: {
      type: String,
      required: function () {
        return this.role !== 'superadmin';
      },
      match: /^\d{7,10}$/
    },
    secondaryPhone: { type: String, match: /^[6-9]\d{9}$/ },
    whatsappNumber: { type: String, match: /^[6-9]\d{9}$/ },
    emergencyContact: {
      name: { type: String },
      relationship: { type: String },
      phone: { type: String, match: /^[6-9]\d{9}$/ }
    }
  },
  
  // Enhanced Address Information
  address: {
    permanent: {
      street: {
        type: String,
        required: function () {
          return this.role !== 'superadmin';
        }
      },
      area: { type: String },
      city: {
        type: String,
        required: function () {
          return this.role !== 'superadmin';
        }
      },
      state: {
        type: String,
        required: function () {
          return this.role !== 'superadmin';
        }
      },
      country: { type: String, required: true, default: 'India' },
      pincode: {
        type: String,
        required: function () {
          return this.role !== 'superadmin';
        },
        match: /^\d{6}$/
      },
      landmark: { type: String }
    },
    current: {
      street: { type: String },
      area: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      pincode: { type: String },
      landmark: { type: String },
      sameAsPermanent: { type: Boolean, default: true }
    }
  },
  
  // Identity Information
  identity: {
    aadharNumber: { type: String, unique: true, sparse: true, match: /^\d{12}$/ },
    panNumber: { type: String, unique: true, sparse: true, match: /^[A-Z]{5}\d{4}[A-Z]$/ },
    voterIdNumber: { type: String },
    drivingLicenseNumber: { type: String },
    passportNumber: { type: String }
  },
  
  profilePicture: { type: String },
  profileImage: { type: String }, // Alias for profilePicture
  documents: [{
    type: { type: String, enum: ['photo', 'aadhar', 'birth_certificate', 'academic_certificates', 'pan', 'experience'] },
    filename: { type: String },
    url: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
  }],
  
  // System Fields
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  lastLogin: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  accountLocked: { type: Boolean, default: false },
  lockUntil: { type: Date },
  
  // Password Management
  passwordHistory: [String], // Store last 5 password hashes
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // School Access
  schoolCode: { type: String, required: true },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
  schoolAccess: {
    joinedDate: {
      type: Date,
      required: function () {
        return this.role !== 'superadmin';
      }
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function () {
        return this.role !== 'superadmin';
      }
    },
    status: { type: String },
    accessLevel: { type: String }
  },
  
  // Session Management
  activeSessions: [{
    sessionId: { type: String },
    deviceInfo: { type: String },
    ipAddress: { type: String },
    loginTime: { type: Date },
    lastActivity: { type: Date },
    isActive: { type: Boolean, default: true }
  }],
  
  
  // Enhanced Role-specific fields
  adminDetails: {
    adminType: { 
      type: String, 
      enum: ['principal', 'vice_principal', 'admin', 'academic_coordinator', 'finance_manager'] 
    },
    employeeId: { type: String, unique: true, sparse: true }, // "NPS_ADM001"
    joiningDate: { type: Date },
    designation: { type: String },
    department: { type: String },
    reportingTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    permissions: {
      userManagement: { type: Boolean, default: false },
      academicManagement: { type: Boolean, default: false },
      feeManagement: { type: Boolean, default: false },
      reportGeneration: { type: Boolean, default: false },
      systemSettings: { type: Boolean, default: false },
      schoolSettings: { type: Boolean, default: false },
      dataExport: { type: Boolean, default: false },
      auditLogs: { type: Boolean, default: false }
    },
    
    workSchedule: {
      workingDays: [String], // ["Monday", "Tuesday", ...]
      workingHours: {
        start: { type: String }, // "09:00"
        end: { type: String } // "17:00"
      }
    },
    
    salary: {
      basic: { type: Number },
      allowances: [{
        type: { type: String },
        amount: { type: Number }
      }],
      currency: { type: String, default: 'INR' }
    },
    
    bankDetails: {
      accountNumber: { type: String },
      ifscCode: { type: String, match: /^[A-Z]{4}0[A-Z0-9]{6}$/ },
      bankName: { type: String },
      branchName: { type: String },
      accountHolderName: { type: String }
    },
    
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedAt: { type: Date, default: Date.now }
  },
  
  // Enhanced Teacher Details
  teacherDetails: {
    employeeId: { type: String, unique: true, sparse: true }, // "NPS_TEA001"
    joiningDate: { type: Date },
    
    qualification: {
      highest: { type: String }, // "B.Ed", "M.Ed", "Ph.D"
      specialization: { type: String },
      university: { type: String },
      year: { type: Number },
      certificates: [{
        name: { type: String },
        institution: { type: String },
        year: { type: Number },
        documentUrl: { type: String }
      }]
    },
    
    experience: {
      total: { type: Number }, // in years
      atCurrentSchool: { type: Number },
      previousSchools: [{
        schoolName: { type: String },
        duration: { type: String },
        position: { type: String },
        reasonForLeaving: { type: String }
      }]
    },
    
    subjects: [{
      subjectCode: { type: String },
      subjectName: { type: String },
      classes: [String], // ["8A", "9B", "10C"]
      isPrimary: { type: Boolean } // Main subject vs secondary
    }],
    
    classTeacherOf: { type: String }, // "8A" - if assigned as class teacher
    responsibilities: [String], // ["Sports Coordinator", "Library Incharge"]
    
    workSchedule: {
      workingDays: [String],
      workingHours: {
        start: { type: String },
        end: { type: String }
      },
      maxPeriodsPerDay: { type: Number },
      maxPeriodsPerWeek: { type: Number }
    },
    
    performanceReviews: [{
      academicYear: { type: String },
      rating: { type: Number, min: 1, max: 5 },
      comments: { type: String },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewDate: { type: Date }
    }],
    
    salary: {
      basic: { type: Number },
      allowances: [{
        type: { type: String }, // "HRA", "Transport", "Medical"
        amount: { type: Number }
      }],
      currency: { type: String, default: 'INR' }
    },
    
    bankDetails: {
      accountNumber: { type: String },
      ifscCode: { type: String, match: /^[A-Z]{4}0[A-Z0-9]{6}$/ },
      bankName: { type: String },
      branchName: { type: String }
    }
  },
  
  
  // Enhanced Student Details
  studentDetails: {
    studentId: { type: String, unique: true, sparse: true }, // "NPS_STU001"
    admissionNumber: { type: String },
    rollNumber: { type: String },
    
    // Academic Information - Karnataka SATS Standard
    academic: {
      currentClass: { type: String }, // "8"
      currentSection: { type: String }, // "A"
      academicYear: { type: String }, // "2024-25"
      admissionDate: { type: Date },
      admissionClass: { type: String },
      stream: { type: String }, // For higher classes: "Science", "Commerce", "Arts"
      electives: [String], // Optional subjects
      
      // Karnataka SATS Additional Fields
      enrollmentNo: { type: String },
      tcNo: { type: String },
      
      previousSchool: {
        name: { type: String },
        board: { type: String, enum: ['CBSE', 'ICSE', 'State Board', 'IB', 'Other'] },
        lastClass: { type: String },
        tcNumber: { type: String },
        tcDate: { type: Date },
        reasonForTransfer: { type: String }
      }
    },
    
    // Personal Information - Karnataka SATS Standard
    personal: {
      dateOfBirth: { type: Date },
      placeOfBirth: { type: String },
      gender: { type: String, enum: ['male', 'female', 'other'] },
      bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
      nationality: { type: String, default: 'Indian' },
      religion: { type: String },
      religionOther: { type: String }, // When religion is "Other"
      caste: { type: String },
      casteOther: { type: String }, // When caste is "Other"
      category: { type: String, enum: ['General', 'OBC', 'SC', 'ST', 'EWS'] },
      categoryOther: { type: String }, // When category is "Other"
      motherTongue: { type: String },
      motherTongueOther: { type: String }, // When motherTongue is "Other"
      languagesKnown: [String],
      
      // Karnataka SATS Specific Fields
      studentNameKannada: { type: String },
      ageYears: { type: Number, min: 0, max: 25 },
      ageMonths: { type: Number, min: 0, max: 11 },
      socialCategory: { 
        type: String, 
        enum: ['General', 'SC', 'ST', 'OBC', 'Category-1', 'Category-2A', 'Category-2B', 'Category-3A', 'Category-3B'] 
      },
      socialCategoryOther: { type: String }, // When socialCategory is "Other"
      studentCaste: { type: String },
      studentCasteOther: { type: String }, // When studentCaste is "Other"
      studentAadhaar: { type: String, match: /^\d{12}$/ },
      studentCasteCertNo: { type: String },
      
      // Additional SATS Fields
      specialCategory: { type: String }, // None/Destitute/Orphan/HIV case etc
      specialCategoryOther: { type: String }, // When specialCategory is "Other"
      
      // Economic Status
      belongingToBPL: { type: String, enum: ['Yes', 'No'], default: 'No' },
      bplCardNo: { type: String },
      bhagyalakshmiBondNo: { type: String },
      
      // Special Needs
      disability: { 
        type: String, 
        enum: ['Not Applicable', 'Visual Impairment', 'Hearing Impairment', 'Speech and Language Disability', 
               'Locomotor Disability', 'Intellectual Disability', 'Learning Disability', 
               'Autism Spectrum Disorder', 'Multiple Disabilities', 'Other'],
        default: 'Not Applicable'
      },
      disabilityOther: { type: String }, // When disability is "Other"
      
      // RTE (Right to Education) Status
      isRTECandidate: { 
        type: String, 
        enum: ['Yes', 'No'], 
        default: 'No' 
      }
    },
    
    // Medical Information
    medical: {
      allergies: [String],
      chronicConditions: [String],
      medications: [String],
      emergencyMedicalContact: {
        doctorName: { type: String },
        hospitalName: { type: String },
        phone: { type: String }
      },
      lastMedicalCheckup: { type: Date },
      vaccinationStatus: [{
        vaccine: { type: String },
        date: { type: Date },
        nextDue: { type: Date }
      }]
    },
    
    // Family Information - Karnataka SATS Standard
    family: {
      father: {
        name: { type: String },
        occupation: { type: String },
        qualification: { type: String },
        phone: { type: String, match: /^[6-9]\d{9}$/ },
        email: { type: String },
        workAddress: { type: String },
        annualIncome: { type: Number },
        
        // Karnataka SATS Specific Fields
        nameKannada: { type: String },
        aadhaar: { type: String, match: /^\d{12}$/ },
        caste: { type: String },
        casteOther: { type: String }, // When father caste is "Other"
        casteCertNo: { type: String }
      },
      mother: {
        name: { type: String },
        occupation: { type: String },
        qualification: { type: String },
        phone: { type: String, match: /^[6-9]\d{9}$/ },
        email: { type: String },
        workAddress: { type: String },
        annualIncome: { type: Number },
        
        // Karnataka SATS Specific Fields
        nameKannada: { type: String },
        aadhaar: { type: String, match: /^\d{12}$/ },
        caste: { type: String },
        casteOther: { type: String }, // When mother caste is "Other"
        casteCertNo: { type: String }
      },
      guardian: {
        name: { type: String },
        relationship: { type: String },
        phone: { type: String },
        email: { type: String },
        address: { type: String },
        isEmergencyContact: { type: Boolean }
      },
      siblings: [{
        name: { type: String },
        age: { type: Number },
        relationship: { type: String },
        school: { type: String },
        class: { type: String }
      }]
    },
    
    // Transportation
    transport: {
      mode: { 
        type: String, 
        enum: ['school_bus', 'private', 'walking', 'cycling', 'public_transport'] 
      },
      busRoute: { type: String },
      pickupPoint: { type: String },
      dropPoint: { type: String },
      pickupTime: { type: String },
      dropTime: { type: String }
    },
    
    // Financial Information - Karnataka SATS Standard
    financial: {
      feeCategory: { 
        type: String, 
        enum: ['regular', 'scholarship', 'concession', 'staff_ward', 'sibling_discount'] 
      },
      concessionType: { type: String },
      concessionPercentage: { type: Number },
      scholarshipDetails: {
        name: { type: String },
        amount: { type: Number },
        provider: { type: String }
      },
      
      // Karnataka SATS Banking Information
      bankDetails: {
        bankName: { type: String },
        accountNumber: { type: String },
        ifscCode: { type: String, match: /^[A-Z]{4}0[A-Z0-9]{6}$/ },
        accountHolderName: { type: String }
      }
    },
    
    // Academic History
    academicHistory: [{
      academicYear: { type: String },
      class: { type: String },
      section: { type: String },
      result: { type: String, enum: ['promoted', 'detained', 'transferred'] },
      percentage: { type: Number },
      rank: { type: Number },
      attendance: { type: Number }
    }],
    
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  
  // Enhanced Parent Details
  parentDetails: {
    parentId: { type: String, unique: true, sparse: true }, // "NPS_PAR001"
    children: [{
      studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      studentName: { type: String },
      class: { type: String },
      section: { type: String },
      relationship: { type: String, enum: ['father', 'mother', 'guardian'] }
    }],
    
    // Professional Information
    professional: {
      occupation: { type: String },
      designation: { type: String },
      companyName: { type: String },
      workAddress: { type: String },
      workPhone: { type: String },
      annualIncome: { type: Number },
      workingHours: { type: String }
    },
    
    // Preferences
    preferences: {
      preferredCommunicationMode: { 
        type: String, 
        enum: ['email', 'sms', 'phone', 'app'],
        default: 'sms'
      },
      languagePreference: { type: String, default: 'English' },
      meetingAvailability: {
        weekdays: [String],
        timeSlots: [String]
      }
    },
    
    // Emergency Contacts (other than parent)
    emergencyContacts: [{
      name: { type: String },
      relationship: { type: String },
      phone: { type: String, match: /^[6-9]\d{9}$/ },
      address: { type: String },
      isPrimary: { type: Boolean }
    }]
  },
  
  // Audit Trail
  auditTrail: {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastModifiedAt: { type: Date },
    modifications: [{
      field: { type: String },
      oldValue: { type: String },
      newValue: { type: String },
      modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      modifiedAt: { type: Date, default: Date.now },
      reason: { type: String }
    }]
  },
  
  // Metadata
  metadata: {
    source: { type: String, enum: ['manual', 'bulk_import', 'online_admission'], default: 'manual' },
    importBatch: { type: String },
    tags: [String],
    notes: { type: String },
    customFields: { type: mongoose.Schema.Types.Mixed }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  if (this.name && this.name.firstName && this.name.lastName) {
    return `${this.name.firstName} ${this.name.lastName}`;
  }
  return this.name || 'Unknown User';
});

// Pre-save middleware to generate displayName
userSchema.pre('save', function(next) {
  if (this.name && this.name.firstName && this.name.lastName) {
    this.name.displayName = `${this.name.firstName} ${this.name.lastName}`;
  }
  next();
});

// Enhanced Indexes for Performance
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ schoolCode: 1, 'schoolAccess.status': 1 });
userSchema.index({ lastLogin: 1 });
userSchema.index({ 'activeSessions.isActive': 1 });

// Student-specific indexes
userSchema.index({ 
  'studentDetails.academic.currentClass': 1, 
  'studentDetails.academic.currentSection': 1 
});

// Teacher-specific indexes
userSchema.index({ 'teacherDetails.subjects.subjectCode': 1 });
userSchema.index({ 'teacherDetails.classTeacherOf': 1 });

// Methods for session management
userSchema.methods.addSession = function(sessionId, deviceInfo, ipAddress) {
  this.activeSessions.push({
    sessionId,
    deviceInfo,
    ipAddress,
    loginTime: new Date(),
    lastActivity: new Date(),
    isActive: true
  });
  return this.save();
};

userSchema.methods.removeSession = function(sessionId) {
  this.activeSessions = this.activeSessions.filter(
    session => session.sessionId !== sessionId
  );
  return this.save();
};

userSchema.methods.updateLastActivity = function(sessionId) {
  const session = this.activeSessions.find(s => s.sessionId === sessionId);
  if (session) {
    session.lastActivity = new Date();
    return this.save();
  }
};

// Method to generate user ID
userSchema.statics.generateUserId = function(schoolCode, role, sequence) {
  const rolePrefixes = {
    admin: 'ADM',
    teacher: 'TEA',
    student: 'STU',
    parent: 'PAR'
  };
  
  const prefix = rolePrefixes[role] || 'USR';
  const padding = role === 'student' || role === 'parent' ? 4 : 3;
  
  return `${schoolCode}_${prefix}${String(sequence).padStart(padding, '0')}`;
};

module.exports = mongoose.model('User', userSchema);
