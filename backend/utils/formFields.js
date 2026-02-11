/**
 * Enhanced form validation and field definitions for user registration
 */

const adminRegistrationFields = {
  // Basic Information
  personalInfo: {
    firstName: { 
      required: true, 
      minLength: 2, 
      maxLength: 50,
      pattern: /^[A-Za-z\s]+$/,
      label: 'First Name',
      placeholder: 'Enter first name'
    },
    middleName: { 
      required: false, 
      maxLength: 50,
      pattern: /^[A-Za-z\s]*$/,
      label: 'Middle Name',
      placeholder: 'Enter middle name (optional)'
    },
    lastName: { 
      required: true, 
      minLength: 2, 
      maxLength: 50,
      pattern: /^[A-Za-z\s]+$/,
      label: 'Last Name',
      placeholder: 'Enter last name'
    },
    dateOfBirth: { 
      required: true, 
      type: 'date',
      label: 'Date of Birth',
      max: new Date(Date.now() - 18 * 365 * 24 * 60 * 60 * 1000) // Must be 18+
    },
    gender: { 
      required: true, 
      options: [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
        { value: 'other', label: 'Other' }
      ],
      label: 'Gender'
    },
    bloodGroup: { 
      required: false, 
      options: [
        { value: 'A+', label: 'A+' },
        { value: 'A-', label: 'A-' },
        { value: 'B+', label: 'B+' },
        { value: 'B-', label: 'B-' },
        { value: 'AB+', label: 'AB+' },
        { value: 'AB-', label: 'AB-' },
        { value: 'O+', label: 'O+' },
        { value: 'O-', label: 'O-' }
      ],
      label: 'Blood Group'
    }
  },

  // Contact Information
  contactInfo: {
    primaryEmail: { 
      required: true, 
      type: 'email', 
      unique: true,
      label: 'Primary Email',
      placeholder: 'Enter primary email address'
    },
    secondaryEmail: { 
      required: false, 
      type: 'email',
      label: 'Secondary Email',
      placeholder: 'Enter secondary email (optional)'
    },
    primaryPhone: { 
      required: true, 
      pattern: /^[6-9]\d{9}$/,
      label: 'Primary Phone',
      placeholder: 'Enter 10-digit phone number'
    },
    secondaryPhone: { 
      required: false, 
      pattern: /^[6-9]\d{9}$/,
      label: 'Secondary Phone',
      placeholder: 'Enter secondary phone (optional)'
    },
    whatsappNumber: { 
      required: false, 
      pattern: /^[6-9]\d{9}$/,
      label: 'WhatsApp Number',
      placeholder: 'Enter WhatsApp number (optional)'
    },
    emergencyContact: {
      name: { 
        required: true, 
        minLength: 2,
        label: 'Emergency Contact Name',
        placeholder: 'Enter emergency contact name'
      },
      relationship: { 
        required: true,
        options: [
          { value: 'spouse', label: 'Spouse' },
          { value: 'parent', label: 'Parent' },
          { value: 'sibling', label: 'Sibling' },
          { value: 'friend', label: 'Friend' },
          { value: 'other', label: 'Other' }
        ],
        label: 'Relationship'
      },
      phone: { 
        required: true, 
        pattern: /^[6-9]\d{9}$/,
        label: 'Emergency Contact Phone',
        placeholder: 'Enter emergency contact phone'
      }
    }
  },

  // Address Information
  addressInfo: {
    permanent: {
      street: { 
        required: true, 
        minLength: 10,
        label: 'Street Address',
        placeholder: 'Enter complete street address'
      },
      area: { 
        required: false,
        label: 'Area/Locality',
        placeholder: 'Enter area or locality'
      },
      city: { 
        required: true, 
        minLength: 2,
        label: 'City',
        placeholder: 'Enter city name'
      },
      state: { 
        required: true, 
        minLength: 2,
        label: 'State',
        placeholder: 'Enter state name'
      },
      country: { 
        required: true, 
        default: 'India',
        label: 'Country'
      },
      pincode: { 
        required: true, 
        pattern: /^\d{6}$/,
        label: 'Pincode',
        placeholder: 'Enter 6-digit pincode'
      },
      landmark: { 
        required: false,
        label: 'Landmark',
        placeholder: 'Enter nearby landmark (optional)'
      }
    },
    current: {
      sameAsPermanent: { 
        type: 'boolean', 
        default: true,
        label: 'Current address same as permanent'
      }
    }
  },

  // Professional Information
  professionalInfo: {
    adminType: { 
      required: true, 
      options: [
        { value: 'principal', label: 'Principal' },
        { value: 'vice_principal', label: 'Vice Principal' },
        { value: 'admin', label: 'Administrator' },
        { value: 'academic_coordinator', label: 'Academic Coordinator' },
        { value: 'finance_manager', label: 'Finance Manager' }
      ],
      label: 'Admin Type'
    },
    joiningDate: { 
      required: true, 
      type: 'date',
      label: 'Joining Date',
      max: new Date() // Cannot be future date
    },
    designation: { 
      required: true, 
      minLength: 2,
      label: 'Designation',
      placeholder: 'Enter job designation'
    },
    department: { 
      required: false,
      options: [
        { value: 'administration', label: 'Administration' },
        { value: 'academics', label: 'Academics' },
        { value: 'finance', label: 'Finance' },
        { value: 'hr', label: 'Human Resources' },
        { value: 'sports', label: 'Sports' },
        { value: 'library', label: 'Library' },
        { value: 'transport', label: 'Transport' },
        { value: 'other', label: 'Other' }
      ],
      label: 'Department'
    },
    qualification: {
      highest: { 
        required: true,
        options: [
          { value: 'bachelor', label: "Bachelor's Degree" },
          { value: 'master', label: "Master's Degree" },
          { value: 'phd', label: 'Ph.D.' },
          { value: 'diploma', label: 'Diploma' },
          { value: 'other', label: 'Other' }
        ],
        label: 'Highest Qualification'
      },
      specialization: { 
        required: false,
        label: 'Specialization',
        placeholder: 'Enter field of specialization'
      },
      university: { 
        required: true,
        label: 'University/Institution',
        placeholder: 'Enter university or institution name'
      },
      year: { 
        required: true, 
        min: 1970, 
        max: new Date().getFullYear(),
        type: 'number',
        label: 'Year of Completion'
      }
    },
    experience: {
      total: { 
        required: true, 
        min: 0, 
        max: 50,
        type: 'number',
        label: 'Total Experience (years)'
      },
      inEducation: { 
        required: true, 
        min: 0,
        type: 'number',
        label: 'Experience in Education (years)'
      },
      inCurrentRole: { 
        required: false, 
        min: 0,
        type: 'number',
        label: 'Experience in Current Role (years)'
      }
    },
    salary: {
      basic: { 
        required: true, 
        min: 0,
        type: 'number',
        label: 'Basic Salary',
        placeholder: 'Enter basic salary amount'
      },
      currency: { 
        default: 'INR',
        options: [
          { value: 'INR', label: 'Indian Rupee (₹)' },
          { value: 'USD', label: 'US Dollar ($)' }
        ],
        label: 'Currency'
      }
    }
  },

  // Identity Documents
  identityDocs: {
    aadharNumber: { 
      required: true, 
      pattern: /^\d{12}$/, 
      unique: true,
      label: 'Aadhar Number',
      placeholder: 'Enter 12-digit Aadhar number'
    },
    panNumber: { 
      required: true, 
      pattern: /^[A-Z]{5}\d{4}[A-Z]$/, 
      unique: true,
      label: 'PAN Number',
      placeholder: 'Enter PAN number (e.g., ABCDE1234F)'
    },
    voterIdNumber: { 
      required: false,
      label: 'Voter ID Number',
      placeholder: 'Enter voter ID number (optional)'
    },
    drivingLicenseNumber: { 
      required: false,
      label: 'Driving License Number',
      placeholder: 'Enter driving license number (optional)'
    },
    passportNumber: { 
      required: false,
      label: 'Passport Number',
      placeholder: 'Enter passport number (optional)'
    }
  },

  // Bank Details
  bankDetails: {
    accountNumber: { 
      required: true, 
      minLength: 9, 
      maxLength: 18,
      pattern: /^\d+$/,
      label: 'Bank Account Number',
      placeholder: 'Enter bank account number'
    },
    ifscCode: { 
      required: true, 
      pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/,
      label: 'IFSC Code',
      placeholder: 'Enter IFSC code (e.g., SBIN0001234)'
    },
    bankName: { 
      required: true,
      label: 'Bank Name',
      placeholder: 'Enter bank name'
    },
    branchName: { 
      required: true,
      label: 'Branch Name',
      placeholder: 'Enter branch name'
    },
    accountHolderName: { 
      required: true,
      label: 'Account Holder Name',
      placeholder: 'Enter account holder name as per bank records'
    }
  },

  // Document Uploads
  documents: {
    profilePhoto: { 
      required: true, 
      fileTypes: ['jpg', 'jpeg', 'png'], 
      maxSize: '2MB',
      label: 'Profile Photo',
      description: 'Upload a clear passport-size photo'
    },
    aadharCard: { 
      required: true, 
      fileTypes: ['jpg', 'jpeg', 'png', 'pdf'], 
      maxSize: '5MB',
      label: 'Aadhar Card',
      description: 'Upload clear copy of Aadhar card'
    },
    panCard: { 
      required: true, 
      fileTypes: ['jpg', 'jpeg', 'png', 'pdf'], 
      maxSize: '5MB',
      label: 'PAN Card',
      description: 'Upload clear copy of PAN card'
    },
    educationCertificates: { 
      required: true, 
      fileTypes: ['pdf'], 
      maxSize: '10MB',
      label: 'Education Certificates',
      description: 'Upload highest qualification certificates'
    },
    experienceCertificates: { 
      required: false, 
      fileTypes: ['pdf'], 
      maxSize: '10MB',
      label: 'Experience Certificates',
      description: 'Upload previous experience certificates (optional)'
    }
  }
};

const studentRegistrationFields = {
  // Basic Information
  personalInfo: {
    firstName: { 
      required: true, 
      minLength: 2, 
      maxLength: 50,
      pattern: /^[A-Za-z\s]+$/,
      label: 'Student First Name',
      placeholder: 'Enter student first name'
    },
    middleName: { 
      required: false, 
      maxLength: 50,
      pattern: /^[A-Za-z\s]*$/,
      label: 'Middle Name',
      placeholder: 'Enter middle name (optional)'
    },
    lastName: { 
      required: true, 
      minLength: 2, 
      maxLength: 50,
      pattern: /^[A-Za-z\s]+$/,
      label: 'Last Name',
      placeholder: 'Enter last name'
    },
    dateOfBirth: { 
      required: true, 
      type: 'date',
      label: 'Date of Birth',
      max: new Date() // Cannot be future date
    },
    placeOfBirth: { 
      required: true,
      label: 'Place of Birth',
      placeholder: 'Enter place of birth'
    },
    gender: { 
      required: true, 
      options: [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
        { value: 'other', label: 'Other' }
      ],
      label: 'Gender'
    },
    bloodGroup: { 
      required: false, 
      options: [
        { value: 'A+', label: 'A+' },
        { value: 'A-', label: 'A-' },
        { value: 'B+', label: 'B+' },
        { value: 'B-', label: 'B-' },
        { value: 'AB+', label: 'AB+' },
        { value: 'AB-', label: 'AB-' },
        { value: 'O+', label: 'O+' },
        { value: 'O-', label: 'O-' }
      ],
      label: 'Blood Group'
    },
    nationality: { 
      required: true, 
      default: 'Indian',
      label: 'Nationality'
    },
    religion: { 
      required: false,
      options: [
        { value: 'hinduism', label: 'Hinduism' },
        { value: 'islam', label: 'Islam' },
        { value: 'christianity', label: 'Christianity' },
        { value: 'sikhism', label: 'Sikhism' },
        { value: 'buddhism', label: 'Buddhism' },
        { value: 'jainism', label: 'Jainism' },
        { value: 'other', label: 'Other' }
      ],
      label: 'Religion'
    },
    caste: { 
      required: false,
      label: 'Caste',
      placeholder: 'Enter caste (optional)'
    },
    category: { 
      required: true, 
      options: [
        { value: 'General', label: 'General' },
        { value: 'OBC', label: 'OBC' },
        { value: 'SC', label: 'SC' },
        { value: 'ST', label: 'ST' },
        { value: 'EWS', label: 'EWS' }
      ],
      label: 'Category'
    },
    motherTongue: { 
      required: true,
      options: [
        { value: 'hindi', label: 'Hindi' },
        { value: 'english', label: 'English' },
        { value: 'bengali', label: 'Bengali' },
        { value: 'telugu', label: 'Telugu' },
        { value: 'marathi', label: 'Marathi' },
        { value: 'tamil', label: 'Tamil' },
        { value: 'gujarati', label: 'Gujarati' },
        { value: 'urdu', label: 'Urdu' },
        { value: 'kannada', label: 'Kannada' },
        { value: 'odia', label: 'Odia' },
        { value: 'punjabi', label: 'Punjabi' },
        { value: 'malayalam', label: 'Malayalam' },
        { value: 'other', label: 'Other' }
      ],
      label: 'Mother Tongue'
    },
    languagesKnown: { 
      required: true, 
      type: 'multiselect',
      options: [
        { value: 'hindi', label: 'Hindi' },
        { value: 'english', label: 'English' },
        { value: 'bengali', label: 'Bengali' },
        { value: 'telugu', label: 'Telugu' },
        { value: 'marathi', label: 'Marathi' },
        { value: 'tamil', label: 'Tamil' },
        { value: 'gujarati', label: 'Gujarati' },
        { value: 'urdu', label: 'Urdu' },
        { value: 'kannada', label: 'Kannada' },
        { value: 'other', label: 'Other' }
      ],
      label: 'Languages Known',
      minSelections: 1
    }
  },

  // Academic Information
  academicInfo: {
    admissionClass: { 
      required: true, 
      options: [
        { value: 'Nursery', label: 'Nursery' },
        { value: 'LKG', label: 'LKG' },
        { value: 'UKG', label: 'UKG' },
        { value: '1', label: 'Class 1' },
        { value: '2', label: 'Class 2' },
        { value: '3', label: 'Class 3' },
        { value: '4', label: 'Class 4' },
        { value: '5', label: 'Class 5' },
        { value: '6', label: 'Class 6' },
        { value: '7', label: 'Class 7' },
        { value: '8', label: 'Class 8' },
        { value: '9', label: 'Class 9' },
        { value: '10', label: 'Class 10' },
        { value: '11', label: 'Class 11' },
        { value: '12', label: 'Class 12' }
      ],
      label: 'Admission Class'
    },
    academicYear: { 
      required: true, 
      pattern: /^\d{4}-\d{2}$/,
      label: 'Academic Year',
      placeholder: 'e.g., 2024-25'
    },
    admissionDate: { 
      required: true, 
      type: 'date',
      label: 'Admission Date',
      max: new Date()
    },
    previousSchool: {
      hasStudiedBefore: { 
        type: 'boolean', 
        default: false,
        label: 'Has the student studied in another school before?'
      },
      schoolName: { 
        required: false,
        label: 'Previous School Name',
        placeholder: 'Enter previous school name'
      },
      board: { 
        required: false, 
        options: [
          { value: 'CBSE', label: 'CBSE' },
          { value: 'ICSE', label: 'ICSE' },
          { value: 'State Board', label: 'State Board' },
          { value: 'IB', label: 'International Baccalaureate (IB)' },
          { value: 'Other', label: 'Other' }
        ],
        label: 'Previous School Board'
      },
      lastClass: { 
        required: false,
        label: 'Last Class Studied',
        placeholder: 'Enter last class studied'
      },
      tcNumber: { 
        required: false,
        label: 'Transfer Certificate Number',
        placeholder: 'Enter TC number'
      },
      tcDate: { 
        required: false, 
        type: 'date',
        label: 'TC Date'
      },
      reasonForTransfer: { 
        required: false,
        label: 'Reason for Transfer',
        placeholder: 'Enter reason for changing school'
      }
    }
  }
};

const teacherRegistrationFields = {
  // Basic Information (similar to admin but with teacher-specific fields)
  personalInfo: adminRegistrationFields.personalInfo,
  contactInfo: adminRegistrationFields.contactInfo,
  addressInfo: adminRegistrationFields.addressInfo,
  identityDocs: adminRegistrationFields.identityDocs,
  bankDetails: adminRegistrationFields.bankDetails,

  // Professional Information (Teacher-specific)
  professionalInfo: {
    joiningDate: { 
      required: true, 
      type: 'date',
      label: 'Joining Date',
      max: new Date()
    },
    qualification: {
      highest: { 
        required: true,
        options: [
          { value: 'bed', label: 'B.Ed.' },
          { value: 'med', label: 'M.Ed.' },
          { value: 'phd', label: 'Ph.D.' },
          { value: 'bachelor', label: "Bachelor's Degree" },
          { value: 'master', label: "Master's Degree" },
          { value: 'diploma', label: 'Diploma' },
          { value: 'other', label: 'Other' }
        ],
        label: 'Highest Qualification'
      },
      specialization: { 
        required: false,
        label: 'Specialization',
        placeholder: 'Enter field of specialization'
      },
      university: { 
        required: true,
        label: 'University/Institution',
        placeholder: 'Enter university name'
      },
      year: { 
        required: true, 
        min: 1970, 
        max: new Date().getFullYear(),
        type: 'number',
        label: 'Year of Completion'
      }
    },
    experience: {
      total: { 
        required: true, 
        min: 0, 
        max: 50,
        type: 'number',
        label: 'Total Teaching Experience (years)'
      },
      atCurrentSchool: { 
        required: false, 
        min: 0,
        type: 'number',
        label: 'Experience at Current School (years)'
      }
    },
    subjects: {
      primary: {
        required: true,
        options: [
          { value: 'MATH', label: 'Mathematics' },
          { value: 'ENG', label: 'English' },
          { value: 'SCI', label: 'Science' },
          { value: 'PHY', label: 'Physics' },
          { value: 'CHEM', label: 'Chemistry' },
          { value: 'BIO', label: 'Biology' },
          { value: 'HIST', label: 'History' },
          { value: 'GEO', label: 'Geography' },
          { value: 'ECON', label: 'Economics' },
          { value: 'COMP', label: 'Computer Science' },
          { value: 'PE', label: 'Physical Education' },
          { value: 'ART', label: 'Arts' },
          { value: 'MUSIC', label: 'Music' },
          { value: 'OTHER', label: 'Other' }
        ],
        label: 'Primary Subject'
      },
      secondary: {
        required: false,
        type: 'multiselect',
        options: [
          { value: 'MATH', label: 'Mathematics' },
          { value: 'ENG', label: 'English' },
          { value: 'SCI', label: 'Science' },
          { value: 'PHY', label: 'Physics' },
          { value: 'CHEM', label: 'Chemistry' },
          { value: 'BIO', label: 'Biology' },
          { value: 'HIST', label: 'History' },
          { value: 'GEO', label: 'Geography' },
          { value: 'ECON', label: 'Economics' },
          { value: 'COMP', label: 'Computer Science' },
          { value: 'PE', label: 'Physical Education' },
          { value: 'ART', label: 'Arts' },
          { value: 'MUSIC', label: 'Music' }
        ],
        label: 'Secondary Subjects (Optional)'
      }
    },
    salary: adminRegistrationFields.professionalInfo.salary
  },

  // Documents (Teacher-specific)
  documents: {
    profilePhoto: adminRegistrationFields.documents.profilePhoto,
    aadharCard: adminRegistrationFields.documents.aadharCard,
    panCard: adminRegistrationFields.documents.panCard,
    educationCertificates: { 
      required: true, 
      fileTypes: ['pdf'], 
      maxSize: '10MB',
      label: 'Education Certificates',
      description: 'Upload B.Ed/M.Ed and other teaching qualification certificates'
    },
    experienceCertificates: adminRegistrationFields.documents.experienceCertificates,
    teachingLicense: { 
      required: false, 
      fileTypes: ['pdf'], 
      maxSize: '5MB',
      label: 'Teaching License/Registration',
      description: 'Upload teaching license or registration certificate (if applicable)'
    }
  }
};

const parentRegistrationFields = {
  // Basic Information
  personalInfo: {
    firstName: adminRegistrationFields.personalInfo.firstName,
    middleName: adminRegistrationFields.personalInfo.middleName,
    lastName: adminRegistrationFields.personalInfo.lastName,
    dateOfBirth: adminRegistrationFields.personalInfo.dateOfBirth,
    gender: adminRegistrationFields.personalInfo.gender,
    relationship: {
      required: true,
      options: [
        { value: 'father', label: 'Father' },
        { value: 'mother', label: 'Mother' },
        { value: 'guardian', label: 'Legal Guardian' }
      ],
      label: 'Relationship to Student'
    }
  },

  contactInfo: adminRegistrationFields.contactInfo,
  addressInfo: adminRegistrationFields.addressInfo,

  // Professional Information
  professionalInfo: {
    occupation: { 
      required: true,
      label: 'Occupation',
      placeholder: 'Enter occupation'
    },
    designation: { 
      required: false,
      label: 'Designation',
      placeholder: 'Enter job designation'
    },
    companyName: { 
      required: false,
      label: 'Company/Organization Name',
      placeholder: 'Enter company or organization name'
    },
    workAddress: { 
      required: false,
      label: 'Work Address',
      placeholder: 'Enter complete work address'
    },
    workPhone: { 
      required: false,
      pattern: /^[6-9]\d{9}$/,
      label: 'Work Phone',
      placeholder: 'Enter work phone number'
    },
    annualIncome: { 
      required: true, 
      min: 0,
      type: 'number',
      label: 'Annual Income',
      placeholder: 'Enter annual income in rupees'
    },
    workingHours: { 
      required: false,
      label: 'Working Hours',
      placeholder: 'e.g., 9 AM to 6 PM'
    }
  },

  // Children Information
  childrenInfo: {
    students: {
      required: true,
      type: 'dynamic_array',
      minItems: 1,
      label: 'Student(s) Information',
      fields: {
        studentName: {
          required: true,
          label: 'Student Name',
          placeholder: 'Enter student full name'
        },
        class: {
          required: true,
          label: 'Class',
          placeholder: 'Enter class'
        },
        section: {
          required: true,
          label: 'Section',
          placeholder: 'Enter section'
        },
        admissionNumber: {
          required: false,
          label: 'Admission Number',
          placeholder: 'Enter admission number (if known)'
        }
      }
    }
  },

  // Documents (Parent-specific)
  documents: {
    profilePhoto: adminRegistrationFields.documents.profilePhoto,
    aadharCard: adminRegistrationFields.documents.aadharCard,
    incomeProof: { 
      required: true, 
      fileTypes: ['pdf'], 
      maxSize: '5MB',
      label: 'Income Proof',
      description: 'Upload salary certificate, income tax return, or business income proof'
    },
    addressProof: { 
      required: true, 
      fileTypes: ['pdf'], 
      maxSize: '5MB',
      label: 'Address Proof',
      description: 'Upload utility bill, bank statement, or other address proof'
    }
  }
};

// Validation functions
const validateField = (value, fieldConfig) => {
  const errors = [];

  // Required validation
  if (fieldConfig.required && (!value || value.toString().trim() === '')) {
    errors.push(`${fieldConfig.label} is required`);
    return errors;
  }

  // Skip other validations if field is empty and not required
  if (!value || value.toString().trim() === '') {
    return errors;
  }

  // Pattern validation
  if (fieldConfig.pattern && !fieldConfig.pattern.test(value)) {
    errors.push(`${fieldConfig.label} format is invalid`);
  }

  // Length validations
  if (fieldConfig.minLength && value.length < fieldConfig.minLength) {
    errors.push(`${fieldConfig.label} must be at least ${fieldConfig.minLength} characters`);
  }

  if (fieldConfig.maxLength && value.length > fieldConfig.maxLength) {
    errors.push(`${fieldConfig.label} must not exceed ${fieldConfig.maxLength} characters`);
  }

  // Number validations
  if (fieldConfig.type === 'number') {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      errors.push(`${fieldConfig.label} must be a valid number`);
    } else {
      if (fieldConfig.min !== undefined && numValue < fieldConfig.min) {
        errors.push(`${fieldConfig.label} must be at least ${fieldConfig.min}`);
      }
      if (fieldConfig.max !== undefined && numValue > fieldConfig.max) {
        errors.push(`${fieldConfig.label} must not exceed ${fieldConfig.max}`);
      }
    }
  }

  // Date validations
  if (fieldConfig.type === 'date') {
    const dateValue = new Date(value);
    if (isNaN(dateValue.getTime())) {
      errors.push(`${fieldConfig.label} must be a valid date`);
    } else {
      if (fieldConfig.min && dateValue < new Date(fieldConfig.min)) {
        errors.push(`${fieldConfig.label} cannot be before ${fieldConfig.min}`);
      }
      if (fieldConfig.max && dateValue > new Date(fieldConfig.max)) {
        errors.push(`${fieldConfig.label} cannot be after ${fieldConfig.max}`);
      }
    }
  }

  // Email validation
  if (fieldConfig.type === 'email') {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(value)) {
      errors.push(`${fieldConfig.label} must be a valid email address`);
    }
  }

  // Options validation
  if (fieldConfig.options && !fieldConfig.options.some(option => option.value === value)) {
    errors.push(`${fieldConfig.label} must be one of the available options`);
  }

  return errors;
};

module.exports = {
  adminRegistrationFields,
  studentRegistrationFields,
  teacherRegistrationFields,
  parentRegistrationFields,
  validateField
};
