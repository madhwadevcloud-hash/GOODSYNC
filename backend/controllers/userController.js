const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb'); // Added for potential use if needed elsewhere
const User = require('../models/User');
const School = require('../models/School');
const Class = require('../models/Class'); // Original import, kept
// Corrected import path based on likely structure
const SchoolDatabaseManager = require('../utils/databaseManager');
// Original imports, kept
const { adminRegistrationFields, studentRegistrationFields, teacherRegistrationFields, parentRegistrationFields, validateField } = require('../utils/formFields');
const { generateStudentId, generateTeacherId, generateParentId } = require('../utils/idGenerator'); // Kept, though maybe deprecated by new function
const { generateStudentPassword, generateTeacherPassword, generateParentPassword, generateRandomPassword, hashPassword, generateStudentPasswordFromDOB } = require('../utils/passwordGenerator'); // Added generateStudentPasswordFromDOB if used here
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Added fs if needed for file operations not shown


// --- Original Multer Config (Keep as is) ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure this path exists or is created
    const uploadPath = path.join(__dirname, '../uploads/documents');
    fs.mkdirSync(uploadPath, { recursive: true }); // Ensure directory exists
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow common document and image types
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf' || file.mimetype.includes('msword') || file.mimetype.includes('officedocument');

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: JPEG, PNG, PDF, DOC, DOCX'));
    }
  }
});


// --- START: REPLACED SEQUENTIAL USER ID GENERATION ---

/**
 * Generates the next sequential user ID for a specific role within a school.
 * Uses an atomic counter ('id_sequences' collection) in the school's database.
 * Example: SB-S-1001, SB-T-1001, SB-A-1001
 *
 * @param {string} schoolCode - The school code (e.g., 'SB').
 * @param {string} role - The user role ('student', 'teacher', 'admin', 'parent').
 * @returns {Promise<string>} The next sequential user ID.
 * @throws {Error} If connection fails, or sequence cannot be updated/initialized.
 */
const generateSequentialUserId = async (schoolCode, role) => {
  if (!schoolCode || !role) {
    throw new Error('School code and role are required to generate user ID');
  }
  const upperSchoolCode = schoolCode.toUpperCase();
  const lowerRole = role.toLowerCase();

  let connection;
  try {
    // Use the correctly imported SchoolDatabaseManager
    connection = await SchoolDatabaseManager.getSchoolConnection(upperSchoolCode);
  } catch (connError) {
    console.error(`DB Connect Error for ${upperSchoolCode}: ${connError.message}`);
    throw new Error(`Could not connect to database for school ${upperSchoolCode}`);
  }

  if (!connection) {
    throw new Error(`Database connection object invalid for school ${upperSchoolCode}`);
  }

  const db = connection.db;
  const sequencesCollection = db.collection('id_sequences');
  const sequenceId = `${lowerRole}_sequence`;

  // --- Atomically find and increment ---
  let nextSequenceValue;
  try {
    const result = await sequencesCollection.findOneAndUpdate(
      { _id: sequenceId },
      {
        $inc: { sequence_value: 1 },
        $setOnInsert: {
          schoolCode: upperSchoolCode,
          role: lowerRole,
          createdAt: new Date()
        }
      },
      {
        returnDocument: 'after',
        upsert: true,
        projection: { sequence_value: 1 }
      }
    );

    // --- Handle First-Time Upsert (Initialize to 1) ---
    if (result && result.value && result.value.sequence_value === 1) {
      // First user gets ID ending in 0001, so we keep sequence at 1
      nextSequenceValue = 1;
    } else if (result && result.value && typeof result.value.sequence_value === 'number') {
      nextSequenceValue = result.value.sequence_value;
    } else {
      // Fallback: If findOneAndUpdate didn't return expected value after upsert
      console.warn(`Initial findOneAndUpdate for ${sequenceId} did not return expected value. Refetching.`);
      const current = await sequencesCollection.findOne({ _id: sequenceId });
      if (current && typeof current.sequence_value === 'number') {
        nextSequenceValue = current.sequence_value;
      } else {
        throw new Error(`Failed to retrieve or initialize sequence value for ${sequenceId} after upsert attempt.`);
      }
    }

  } catch (dbError) {
    console.error(`Database error generating sequence for ${sequenceId} in ${upperSchoolCode}: ${dbError.message}`);
    throw new Error(`Database error generating user ID: ${dbError.message}`);
  }

  // --- Format the ID ---
  const rolePrefixes = { student: 'S', teacher: 'T', admin: 'A', parent: 'P' };
  const prefix = rolePrefixes[lowerRole] || 'U';
  const padding = 4;

  const finalUserId = `${upperSchoolCode}-${prefix}-${String(nextSequenceValue).padStart(padding, '0')}`;

  console.log(`Generated User ID: ${finalUserId} (Sequence: ${nextSequenceValue}) for role: ${role}, school: ${upperSchoolCode}`);
  return finalUserId;
};

// --- END: REPLACED SEQUENTIAL USER ID GENERATION ---

/**
 * Preview the next user ID WITHOUT incrementing the sequence
 * This is used for UI preview only
 */
const previewNextUserId = async (schoolCode, role) => {
  if (!schoolCode || !role) {
    throw new Error('School code and role are required to preview user ID');
  }
  const upperSchoolCode = schoolCode.toUpperCase();
  const lowerRole = role.toLowerCase();

  let connection;
  try {
    connection = await SchoolDatabaseManager.getSchoolConnection(upperSchoolCode);
  } catch (connError) {
    console.error(`DB Connect Error for ${upperSchoolCode}: ${connError.message}`);
    throw new Error(`Could not connect to database for school ${upperSchoolCode}`);
  }

  if (!connection) {
    throw new Error(`Database connection object invalid for school ${upperSchoolCode}`);
  }

  const db = connection.db;
  const sequencesCollection = db.collection('id_sequences');
  const sequenceId = `${lowerRole}_sequence`;

  // Just read the current value, don't increment
  const currentSequence = await sequencesCollection.findOne({ _id: sequenceId });

  // If no sequence exists yet, the next one will be 1
  const nextSequenceValue = currentSequence ? (currentSequence.sequence_value + 1) : 1;

  // Format the ID
  const rolePrefixes = { student: 'S', teacher: 'T', admin: 'A', parent: 'P' };
  const prefix = rolePrefixes[lowerRole] || 'U';
  const padding = 4;

  const previewUserId = `${upperSchoolCode}-${prefix}-${String(nextSequenceValue).padStart(padding, '0')}`;

  console.log(`Preview User ID: ${previewUserId} (Next Sequence: ${nextSequenceValue}) for role: ${role}, school: ${upperSchoolCode} [NOT INCREMENTED]`);
  return previewUserId;
};

// --- Export the Corrected Function (and keep original export if needed elsewhere) ---
exports.generateSequentialUserId = generateSequentialUserId;
exports.previewNextUserId = previewNextUserId;

// --- Original getNextUserId (Now uses the corrected generator) ---
exports.getNextUserId = async (req, res) => {
  try {
    const { role } = req.params;

    console.log(`🔍 Getting next user ID for role: ${role}`);
    // console.log(`👤 Request user:`, { id: req.user.id, role: req.user.role }); // Be careful logging user details

    if (!['admin', 'superadmin'].includes(req.user?.role)) { // Added safe navigation for req.user
      console.log(`❌ Access denied for role: ${req.user?.role}`);
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!['admin', 'teacher', 'student', 'parent'].includes(role)) {
      console.log(`❌ Invalid role requested: ${role}`);
      return res.status(400).json({ message: 'Invalid role' });
    }

    let schoolCode;
    if (req.schoolCode) { // Check if middleware set schoolCode directly
      schoolCode = req.schoolCode;
      console.log(`🏫 Using school code from request context: ${schoolCode}`);
    } else if (req.user?.schoolId && req.user.role !== 'superadmin') { // Superadmin might not have schoolId
      console.log(`🔄 Looking up school code for user's school ID: ${req.user.schoolId}`);
      const school = await School.findById(req.user.schoolId).select('code'); // Only fetch code
      if (!school) {
        console.log(`❌ School not found for ID: ${req.user.schoolId}`);
        return res.status(404).json({ message: 'User school not found' });
      }
      schoolCode = school.code;
      console.log(`🏫 Retrieved school code: ${schoolCode}`);
    } else if (req.params.schoolCode) { // Check params as another fallback
      schoolCode = req.params.schoolCode;
      console.log(`🏫 Using school code from URL params: ${schoolCode}`);
    } else if (req.query.schoolCode) { // Check query as another fallback
      schoolCode = req.query.schoolCode;
      console.log(`🏫 Using school code from query params: ${schoolCode}`);
    }
    else {
      // Cannot determine school code, especially for superadmin if not provided
      console.log(`❌ Could not determine school code for ${req.user?.role}`);
      return res.status(400).json({ message: 'School code not provided or could not be determined.' });
    }

    // Preview the next user ID WITHOUT incrementing the sequence
    const nextUserId = await previewNextUserId(schoolCode, role);

    console.log(`✅ Previewed next user ID: ${nextUserId} (sequence not incremented)`);

    res.json({
      success: true,
      nextUserId,
      role,
      schoolCode: schoolCode.toUpperCase(), // Ensure consistent casing
      message: `Next available ID preview for ${role}`
    });

  } catch (error) {
    console.error('❌ Error getting next user ID preview:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting next user ID',
      error: error.message // Provide error message
    });
  }
};
// Get next available user ID for preview
exports.getNextUserId = async (req, res) => {
  try {
    const { role } = req.params;

    console.log(`🔍 Getting next user ID for role: ${role}`);
    console.log(`👤 Request user:`, { id: req.user.id, role: req.user.role });

    // Validate caller
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      console.log(`❌ Access denied for role: ${req.user.role}`);
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validate role
    if (!['admin', 'teacher', 'student', 'parent'].includes(role)) {
      console.log(`❌ Invalid role requested: ${role}`);
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Resolve target school - use middleware-provided school context
    let schoolCode;

    if (req.school && req.schoolCode) {
      schoolCode = req.schoolCode;
      console.log(`🏫 Using school code from middleware: ${schoolCode}`);
    } else {
      console.log(`🔄 Falling back to user's school ID: ${req.user.schoolId}`);
      // Fallback to user's school
      const school = await School.findById(req.user.schoolId);
      if (!school) {
        console.log(`❌ School not found for ID: ${req.user.schoolId}`);
        return res.status(404).json({ message: 'School not found' });
      }
      schoolCode = school.code;
      console.log(`🏫 Retrieved school code: ${schoolCode}`);
    }

    console.log(`🏫 Using school code: ${schoolCode} for role: ${role}`);

    // Generate the next sequential user ID
    const nextUserId = await generateSequentialUserId(schoolCode, role);

    console.log(`✅ Generated next user ID: ${nextUserId}`);

    res.json({
      success: true,
      nextUserId,
      role,
      schoolCode: schoolCode.toUpperCase(),
      message: `Next available ID for ${role} role`
    });

  } catch (error) {
    console.error('❌ Error getting next user ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting next user ID',
      error: error.message
    });
  }
};

// Validation helper
const validateFormData = (data, fieldDefinitions) => {
  const errors = {};

  const validateNestedObject = (obj, fields, prefix = '') => {
    for (const [key, fieldConfig] of Object.entries(fields)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof fieldConfig === 'object' && !fieldConfig.required && !fieldConfig.type) {
        // Nested object
        if (obj[key]) {
          validateNestedObject(obj[key], fieldConfig, fullKey);
        }
      } else {
        // Field validation
        const value = obj[key];
        const fieldErrors = validateField(value, fieldConfig);
        if (fieldErrors.length > 0) {
          errors[fullKey] = fieldErrors;
        }
      }
    }
  };

  validateNestedObject(data, fieldDefinitions);
  return errors;
};

// Get form fields for registration
exports.getRegistrationFields = async (req, res) => {
  try {
    const { role } = req.params;

    let fields;
    switch (role) {
      case 'admin':
        fields = adminRegistrationFields;
        break;
      case 'teacher':
        fields = teacherRegistrationFields;
        break;
      case 'student':
        fields = studentRegistrationFields;
        break;
      case 'parent':
        fields = parentRegistrationFields;
        break;
      default:
        return res.status(400).json({ message: 'Invalid role specified' });
    }

    res.json({
      success: true,
      role,
      fields
    });
  } catch (error) {
    console.error('Error fetching registration fields:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Enhanced user registration with comprehensive form support
exports.registerUser = async (req, res) => {
  upload.array('documents', 10)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    try {
      const { role, schoolCode } = req.body;

      // Validate role
      if (!['admin', 'teacher', 'student', 'parent'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }

      // Check permissions
      if (!['admin', 'superadmin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Get school information
      const school = await School.findOne({ schoolCode });
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }

      // Validate form data based on role
      let fieldDefinitions;
      switch (role) {
        case 'admin':
          fieldDefinitions = adminRegistrationFields;
          break;
        case 'teacher':
          fieldDefinitions = teacherRegistrationFields;
          break;
        case 'student':
          fieldDefinitions = studentRegistrationFields;
          break;
        case 'parent':
          fieldDefinitions = parentRegistrationFields;
          break;
      }

      const validationErrors = validateFormData(req.body, fieldDefinitions);
      if (Object.keys(validationErrors).length > 0) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: validationErrors
        });
      }

      // Check if email already exists
      const existingUser = await User.findOne({
        email: req.body.personalInfo?.primaryEmail || req.body.contactInfo?.primaryEmail
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already exists' });
      }

      // Generate user ID using the new database manager
      const userId = await generateSequentialUserId(schoolCode, role);

      // Prepare user data
      const userData = {
        userId,
        schoolCode,
        schoolId: school._id,
        role,
        isActive: true,
        schoolAccess: {
          joinedDate: new Date(),
          assignedBy: req.user._id,
          status: 'active',
          accessLevel: 'full'
        },
        auditTrail: {
          createdBy: req.user._id,
          createdAt: new Date()
        }
      };

      // Process form data based on role
      if (role === 'admin') {
        await processAdminRegistration(req.body, userData, req.files);
      } else if (role === 'teacher') {
        await processTeacherRegistration(req.body, userData, req.files);
      } else if (role === 'student') {
        await processStudentRegistration(req.body, userData, req.files);
      } else if (role === 'parent') {
        await processParentRegistration(req.body, userData, req.files);
      }

      // Generate temporary password - use DOB for students, regular method for others
      let tempPassword;
      if (role === 'student' && req.body.personalInfo?.dateOfBirth) {
        const { generateStudentPasswordFromDOB } = require('../utils/passwordGenerator');
        tempPassword = generateStudentPasswordFromDOB(req.body.personalInfo.dateOfBirth);
      } else {
        tempPassword = generateTempPassword(userData.name.firstName, userId);
      }

      userData.password = await bcrypt.hash(tempPassword, 10);
      userData.temporaryPassword = tempPassword;
      userData.passwordChangeRequired = true;

      // Create user in school-specific database
      const ModelFactory = require('../utils/modelFactory');
      const SchoolUser = ModelFactory.getUserModel(schoolCode);
      const newUser = new SchoolUser(userData);
      await newUser.save();

      console.log(`✅ User created in school database: ${userId} for school ${schoolCode}`);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
          userId: newUser.userId,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          tempPassword: tempPassword
        }
      });

    } catch (error) {
      console.error('User registration error:', error);
      res.status(500).json({ message: 'Server error during registration' });
    }
  });
};

// Process admin registration data
const processAdminRegistration = async (formData, userData, files) => {
  const { personalInfo, contactInfo, addressInfo, professionalInfo, identityDocs, bankDetails } = formData;

  userData.name = {
    firstName: personalInfo.firstName,
    middleName: personalInfo.middleName,
    lastName: personalInfo.lastName
  };

  userData.email = contactInfo.primaryEmail;

  userData.contact = {
    primaryPhone: contactInfo.primaryPhone,
    secondaryPhone: contactInfo.secondaryPhone,
    whatsappNumber: contactInfo.whatsappNumber,
    emergencyContact: contactInfo.emergencyContact
  };

  userData.address = addressInfo;
  userData.identity = identityDocs;

  userData.adminDetails = {
    adminType: professionalInfo.adminType,
    employeeId: userData.userId,
    joiningDate: new Date(professionalInfo.joiningDate),
    designation: professionalInfo.designation,
    department: professionalInfo.department,
    qualification: professionalInfo.qualification,
    experience: professionalInfo.experience,
    salary: professionalInfo.salary,
    bankDetails: bankDetails,
    permissions: {
      userManagement: true,
      academicManagement: true,
      feeManagement: false,
      reportGeneration: true,
      systemSettings: false,
      schoolSettings: true,
      dataExport: false,
      auditLogs: false
    }
  };

  // Process uploaded documents
  if (files && files.length > 0) {
    userData.documents = files.map(file => ({
      type: getDocumentType(file.fieldname),
      filename: file.filename,
      url: `/uploads/documents/${file.filename}`,
      uploadedAt: new Date(),
      verificationStatus: 'pending'
    }));
  }
};

// Process teacher registration data
const processTeacherRegistration = async (formData, userData, files) => {
  const { personalInfo, contactInfo, addressInfo, professionalInfo, identityDocs, bankDetails } = formData;

  userData.name = {
    firstName: personalInfo.firstName,
    middleName: personalInfo.middleName,
    lastName: personalInfo.lastName
  };

  userData.email = contactInfo.primaryEmail;
  userData.contact = contactInfo;
  userData.address = addressInfo;
  userData.identity = identityDocs;

  userData.teacherDetails = {
    employeeId: userData.userId,
    joiningDate: new Date(professionalInfo.joiningDate),
    qualification: professionalInfo.qualification,
    experience: professionalInfo.experience,
    subjects: [{
      subjectCode: professionalInfo.subjects.primary,
      subjectName: getSubjectName(professionalInfo.subjects.primary),
      isPrimary: true
    }],
    salary: professionalInfo.salary,
    bankDetails: bankDetails
  };

  // Add secondary subjects if provided
  if (professionalInfo.subjects.secondary && professionalInfo.subjects.secondary.length > 0) {
    professionalInfo.subjects.secondary.forEach(subjectCode => {
      userData.teacherDetails.subjects.push({
        subjectCode,
        subjectName: getSubjectName(subjectCode),
        isPrimary: false
      });
    });
  }

  // Process uploaded documents
  if (files && files.length > 0) {
    userData.documents = files.map(file => ({
      type: getDocumentType(file.fieldname),
      filename: file.filename,
      url: `/uploads/documents/${file.filename}`,
      uploadedAt: new Date(),
      verificationStatus: 'pending'
    }));
  }
};

// Process student registration data
const processStudentRegistration = async (formData, userData, files) => {
  const { personalInfo, academicInfo, fatherInfo, motherInfo, guardianInfo, medicalInfo, transportInfo, financialInfo, emergencyContacts } = formData;

  userData.name = {
    firstName: personalInfo.firstName,
    middleName: personalInfo.middleName,
    lastName: personalInfo.lastName
  };

  userData.email = fatherInfo.email || motherInfo.email;

  userData.studentDetails = {
    studentId: userData.userId,
    admissionNumber: generateAdmissionNumber(),
    academic: {
      currentClass: academicInfo.admissionClass,
      academicYear: academicInfo.academicYear,
      admissionDate: new Date(academicInfo.admissionDate),
      admissionClass: academicInfo.admissionClass,
      previousSchool: academicInfo.previousSchool
    },
    personal: {
      dateOfBirth: new Date(personalInfo.dateOfBirth),
      placeOfBirth: personalInfo.placeOfBirth,
      gender: personalInfo.gender,
      bloodGroup: personalInfo.bloodGroup,
      nationality: personalInfo.nationality,
      religion: personalInfo.religion,
      caste: personalInfo.caste,
      category: personalInfo.category,
      motherTongue: personalInfo.motherTongue,
      languagesKnown: personalInfo.languagesKnown,
      isRTECandidate: personalInfo.isRTECandidate || 'No'
    },
    medical: medicalInfo,
    family: {
      father: fatherInfo,
      mother: motherInfo,
      guardian: guardianInfo
    },
    transport: transportInfo,
    financial: financialInfo
  };

  // Set contact from parents
  userData.contact = {
    primaryPhone: fatherInfo.primaryPhone || motherInfo.primaryPhone,
    secondaryPhone: motherInfo.primaryPhone || fatherInfo.secondaryPhone,
    emergencyContact: emergencyContacts.primary
  };

  // Set address from father's details (can be modified as needed)
  userData.address = {
    permanent: {
      street: fatherInfo.address?.street,
      city: fatherInfo.address?.city,
      state: fatherInfo.address?.state,
      country: fatherInfo.address?.country || 'India',
      pincode: fatherInfo.address?.pincode
    }
  };

  // Process uploaded documents
  if (files && files.length > 0) {
    userData.documents = files.map(file => ({
      type: getDocumentType(file.fieldname),
      filename: file.filename,
      url: `/uploads/documents/${file.filename}`,
      uploadedAt: new Date(),
      verificationStatus: 'pending'
    }));
  }
};

// Process parent registration data
const processParentRegistration = async (formData, userData, files) => {
  const { personalInfo, contactInfo, addressInfo, professionalInfo, childrenInfo } = formData;

  userData.name = {
    firstName: personalInfo.firstName,
    middleName: personalInfo.middleName,
    lastName: personalInfo.lastName
  };

  userData.email = contactInfo.primaryEmail;
  userData.contact = contactInfo;
  userData.address = addressInfo;

  userData.parentDetails = {
    parentId: userData.userId,
    children: [], // Will be populated when linking to students
    professional: professionalInfo,
    preferences: {
      preferredCommunicationMode: 'sms',
      languagePreference: 'English'
    }
  };

  // Process uploaded documents
  if (files && files.length > 0) {
    userData.documents = files.map(file => ({
      type: getDocumentType(file.fieldname),
      filename: file.filename,
      url: `/uploads/documents/${file.filename}`,
      uploadedAt: new Date(),
      verificationStatus: 'pending'
    }));
  }
};

// Helper functions
const generateTempPassword = (firstName, userId) => {
  const shortId = userId.split('_').pop();
  return `${firstName.toLowerCase()}${shortId}`;
};

const generateAdmissionNumber = () => {
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ADM${year}${random}`;
};

const getDocumentType = (fieldname) => {
  const typeMapping = {
    profilePhoto: 'photo',
    aadharCard: 'aadhar',
    panCard: 'pan',
    birthCertificate: 'birth_certificate',
    educationCertificates: 'academic_certificates',
    experienceCertificates: 'experience',
    teachingLicense: 'teaching_license',
    incomeProof: 'income_proof',
    addressProof: 'address_proof'
  };
  return typeMapping[fieldname] || 'other';
};

const getSubjectName = (subjectCode) => {
  const subjectMapping = {
    'MATH': 'Mathematics',
    'ENG': 'English',
    'SCI': 'Science',
    'PHY': 'Physics',
    'CHEM': 'Chemistry',
    'BIO': 'Biology',
    'HIST': 'History',
    'GEO': 'Geography',
    'ECON': 'Economics',
    'COMP': 'Computer Science',
    'PE': 'Physical Education',
    'ART': 'Arts',
    'MUSIC': 'Music'
  };
  return subjectMapping[subjectCode] || subjectCode;
};

// Simple user creation for superadmin/admin to add admin/teacher/student/parent
exports.createUserSimple = async (req, res) => {
  try {
    const {
      name,
      email,
      role,
      schoolId,
      subjects = [],
      classes = [],
      class: className,
      rollNumber,
      // SATS Transfer Certificate specific fields
      studentDetails,
      parentContact,
      phone,
      address
    } = req.body || {};

    // Validate caller
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validate role
    if (!['admin', 'teacher', 'student', 'parent'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Resolve target school - use middleware-provided school context
    let targetSchoolId, school, schoolCode;

    if (req.school && req.schoolId) {
      // School context provided by middleware (preferred for multi-tenant)
      targetSchoolId = req.schoolId;
      school = req.school;
      schoolCode = req.schoolCode;
    } else {
      // Fallback: manual school specification
      targetSchoolId = req.user.role === 'superadmin' ? (schoolId || req.body.schoolId) : req.user.schoolId;
      if (!targetSchoolId) {
        return res.status(400).json({ message: 'School ID is required' });
      }
      school = await School.findById(targetSchoolId);
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }
      schoolCode = school.code;
    }

    // Use school-specific database
    const ModelFactory = require('../utils/modelFactory');
    const SchoolUser = ModelFactory.getUserModel(schoolCode);

    // Check email uniqueness in school database
    const existing = await SchoolUser.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already exists in this school' });
    }

    // Generate IDs and password using enhanced sequential generation
    const userId = await generateSequentialUserId(schoolCode, role);

    // Use DOB for students, random password for others
    let tempPassword;
    if (role === 'student' && req.body.dateOfBirth) {
      const { generateStudentPasswordFromDOB } = require('../utils/passwordGenerator');
      tempPassword = generateStudentPasswordFromDOB(req.body.dateOfBirth);
    } else {
      tempPassword = require('../utils/passwordGenerator').generateRandomPassword(10);
    }

    const hashedPassword = await hashPassword(tempPassword);

    // Basic name parsing
    const parts = String(name || '').trim().split(/\s+/);
    const firstName = parts[0] || 'User';
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : 'User';

    // Build base user document with required fields satisfied
    const baseDoc = {
      userId,
      name: { firstName, lastName, displayName: `${firstName} ${lastName}`.trim() },
      email,
      password: hashedPassword,
      temporaryPassword: tempPassword,
      passwordChangeRequired: true,
      role,
      contact: { primaryPhone: phone || '9999999999' },
      address: {
        permanent: {
          street: address || 'Address not provided',
          city: 'NA',
          state: 'NA',
          country: 'India',
          pincode: '560001'
        }
      },
      schoolId: targetSchoolId,
      schoolCode,
      schoolAccess: {
        joinedDate: new Date(),
        assignedBy: req.user._id,
        status: 'active',
        accessLevel: 'full'
      },
      auditTrail: {
        createdBy: req.user._id,
        createdAt: new Date()
      }
    };

    // Role-specific details
    if (role === 'admin') {
      baseDoc.adminDetails = {
        adminType: 'admin',
        employeeId: userId,
        joiningDate: new Date(),
        designation: 'Administrator',
        department: 'Administration',
        permissions: {
          userManagement: true,
          academicManagement: true,
          reportGeneration: true,
          schoolSettings: true
        }
      };
    }

    if (role === 'teacher') {
      baseDoc.teacherDetails = {
        employeeId: userId,
        joiningDate: new Date(),
        subjects: (Array.isArray(subjects) ? subjects : []).map((code) => ({
          subjectCode: code,
          subjectName: getSubjectName(code),
          isPrimary: true
        })),
        qualification: { highest: '' },
        experience: { total: 0 }
      };
    }

    if (role === 'student') {
      // Enhanced student details for Karnataka SATS Standard
      const getCurrentAcademicYear = () => {
        const currentYear = new Date().getFullYear();
        return new Date().getMonth() > 5 ?
          `${currentYear}-${currentYear + 1}` :
          `${currentYear - 1}-${currentYear}`;
      };

      // Get school's current academic year from settings
      const schoolAcademicYear = school?.settings?.academicYear?.currentYear;
      const academicYearToUse = req.body.academicYear || schoolAcademicYear || getCurrentAcademicYear();

      console.log(`📅 Setting student academic year: ${academicYearToUse} (from: ${req.body.academicYear ? 'request' : schoolAcademicYear ? 'school settings' : 'calculated'})`);

      baseDoc.studentDetails = {
        studentId: userId,
        admissionNumber: req.body.admissionNumber || `ADM${new Date().getFullYear().toString().slice(-2)}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        rollNumber: rollNumber || null,

        // Academic Information - Karnataka SATS Standard
        academic: {
          currentClass: className || req.body.class || '',
          currentSection: req.body.section || 'A',
          academicYear: academicYearToUse,
          admissionDate: req.body.admissionDate ? new Date(req.body.admissionDate) : new Date(),
          admissionClass: className || req.body.class || '',
          enrollmentNo: req.body.enrollmentNo,
          tcNo: req.body.tcNo
        },

        // Personal Information - Karnataka SATS Standard
        personal: {
          dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : null,
          gender: req.body.gender,
          religion: req.body.religion,
          religionOther: req.body.religionOther,
          socialCategory: req.body.socialCategory,
          socialCategoryOther: req.body.socialCategoryOther,
          studentCaste: req.body.studentCaste,
          studentCasteOther: req.body.studentCasteOther,
          caste: req.body.caste,
          casteOther: req.body.casteOther,
          category: req.body.category,
          categoryOther: req.body.categoryOther,
          studentNameKannada: req.body.studentNameKannada,
          ageYears: parseInt(req.body.ageYears) || 0,
          ageMonths: parseInt(req.body.ageMonths) || 0,
          studentAadhaar: req.body.studentAadhaar,
          studentCasteCertNo: req.body.studentCasteCertNo,
          nationality: req.body.nationality || 'Indian',
          motherTongue: req.body.motherTongue,
          motherTongueOther: req.body.motherTongueOther,
          bloodGroup: req.body.bloodGroup,

          // Special Category and Disability
          specialCategory: req.body.specialCategory,
          specialCategoryOther: req.body.specialCategoryOther,
          disability: req.body.disability,
          disabilityOther: req.body.disabilityOther,

          // Economic Status
          belongingToBPL: req.body.belongingToBPL,
          bplCardNo: req.body.bplCardNo,
          bhagyalakshmiBondNo: req.body.bhagyalakshmiBondNo
        },

        // Family Information - Karnataka SATS Standard
        family: {
          father: {
            name: req.body.fatherName,
            nameKannada: req.body.fatherNameKannada,
            aadhaar: req.body.fatherAadhaar,
            caste: req.body.fatherCaste,
            casteOther: req.body.fatherCasteOther,
            casteCertNo: req.body.fatherCasteCertNo,
            occupation: req.body.fatherOccupation,
            qualification: req.body.fatherEducation,
            phone: req.body.fatherPhone || req.body.fatherMobile,
            email: req.body.fatherEmail
          },
          mother: {
            name: req.body.motherName,
            nameKannada: req.body.motherNameKannada,
            aadhaar: req.body.motherAadhaar,
            caste: req.body.motherCaste,
            casteOther: req.body.motherCasteOther,
            casteCertNo: req.body.motherCasteCertNo,
            occupation: req.body.motherOccupation,
            qualification: req.body.motherEducation,
            phone: req.body.motherPhone || req.body.motherMobile,
            email: req.body.motherEmail
          },
          guardian: {
            name: req.body.guardianName,
            relationship: req.body.guardianRelation,
            phone: req.body.emergencyContactPhone,
            email: req.body.parentEmail
          }
        },

        // Financial Information - Karnataka SATS Standard
        financial: {
          feeCategory: 'regular',
          bankDetails: {
            bankName: req.body.bankName,
            accountNumber: req.body.bankAccountNo || req.body.bankAccountNumber,
            ifscCode: req.body.bankIFSC || req.body.ifscCode,
            accountHolderName: req.body.accountHolderName || req.body.name
          }
        }
      };

      // Update contact information with student phone and email
      if (req.body.phone) {
        baseDoc.contact.primaryPhone = req.body.phone;
      }
      if (req.body.email) {
        baseDoc.email = req.body.email;
      }
    }

    if (role === 'parent') {
      baseDoc.parentDetails = {
        parentId: userId,
        preferences: { preferredCommunicationMode: 'sms', languagePreference: 'English' }
      };
    }

    console.log(`Creating user in school database: ${schoolCode}`);
    const user = new SchoolUser(baseDoc);
    await user.save();

    // Update school stats minimally
    const inc = {};
    if (role === 'teacher') inc['stats.totalTeachers'] = 1;
    if (role === 'student') inc['stats.totalStudents'] = 1;
    if (role === 'parent') inc['stats.totalParents'] = 1;
    if (Object.keys(inc).length) await School.findByIdAndUpdate(targetSchoolId, { $inc: inc });

    return res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role, userId: user.userId },
      temporaryPassword: tempPassword
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ message: 'Error creating user', error: error.message });
  }
};

// Add a new teacher (legacy function - enhanced)
exports.addTeacher = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      subjects,
      qualification,
      experience,
      address
    } = req.body;

    // Check if user is admin or super admin
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Resolve target school - use middleware-provided school context
    let targetSchoolId, school, schoolCode;

    if (req.school && req.schoolId) {
      // School context provided by middleware (preferred for multi-tenant)
      targetSchoolId = req.schoolId;
      school = req.school;
      schoolCode = req.schoolCode;
    } else {
      // Fallback: manual school specification
      targetSchoolId = req.user.role === 'superadmin' ? req.body.schoolId : req.user.schoolId;
      if (!targetSchoolId) {
        return res.status(400).json({ message: 'School ID is required' });
      }
      school = await School.findById(targetSchoolId);
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }
      schoolCode = school.code;
    }

    // Check if email already exists in the school database
    const ModelFactory = require('../utils/modelFactory');
    const SchoolUser = ModelFactory.getUserModel(schoolCode);
    const existingUser = await SchoolUser.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists in this school' });
    }

    // Generate teacher ID and password using new system
    const DatabaseManager = require('../utils/databaseManager');
    let userId;
    try {
      userId = await generateSequentialUserId(schoolCode, 'teacher');
      console.log(`Generated userId: ${userId} for school: ${schoolCode}`);
    } catch (error) {
      console.error('Error generating userId:', error);
      return res.status(500).json({ message: 'Error generating user ID' });
    }

    if (!userId) {
      console.error('UserId is null or undefined');
      return res.status(500).json({ message: 'Failed to generate user ID' });
    }

    const password = generateTeacherPassword(name, userId);
    const hashedPassword = await hashPassword(password);

    // Create teacher user with enhanced structure
    const parts = String(name || '').trim().split(/\s+/);
    let firstName = parts[0] || 'Teacher';
    let lastName = parts.length > 1 ? parts.slice(1).join(' ') : 'User';
    // enforce minlength 2 as per schema
    if (firstName.length < 2) firstName = (firstName + 'aa').slice(0, 2);
    if (lastName.length < 2) lastName = (lastName + 'aa').slice(0, 2);

    // Validate and clean phone number
    let primaryPhone = '9999999999'; // Default fallback
    if (phone && typeof phone === 'string') {
      const cleanPhone = phone.replace(/\D/g, ''); // Remove non-digits
      if (/^[6-9]\d{9}$/.test(cleanPhone)) {
        primaryPhone = cleanPhone;
      }
    }
    console.log(`Using phone: ${primaryPhone} for user: ${name}`);
    const street = (address && address.street) ? String(address.street) : 'Address not provided';
    const city = (address && address.city) ? String(address.city) : 'NA';
    const state = (address && address.state) ? String(address.state) : 'NA';
    const pincode = (address && address.pincode && /^\d{6}$/.test(String(address.pincode))) ? String(address.pincode) : '560001';

    console.log(`Creating teacher in school database: ${schoolCode}`);
    console.log(`Using SchoolUser model from database: ${SchoolUser.db.name}`);

    const teacher = new SchoolUser({
      userId,
      name: {
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`.trim()
      },
      email,
      password: hashedPassword,
      temporaryPassword: password,
      passwordChangeRequired: true,
      role: 'teacher',
      contact: {
        primaryPhone
      },
      address: {
        permanent: {
          street,
          city,
          state,
          country: 'India',
          pincode
        }
      },
      schoolId: targetSchoolId,
      schoolCode,
      schoolAccess: {
        joinedDate: new Date(),
        assignedBy: req.user._id,
        status: 'active',
        accessLevel: 'full'
      },
      teacherDetails: {
        employeeId: userId,
        subjects: Array.isArray(subjects) ? subjects.map(subject => ({
          subjectCode: subject,
          subjectName: getSubjectName(subject),
          isPrimary: true
        })) : [],
        qualification: qualification || '',
        experience: experience || 0,
        joiningDate: new Date()
      },
      auditTrail: {
        createdBy: req.user._id,
        createdAt: new Date()
      }
    });

    await teacher.save();

    res.status(201).json({
      message: 'Teacher added successfully',
      teacher: {
        id: teacher._id,
        userId: teacher.userId,
        name: teacher.name,
        email: teacher.email,
        role: teacher.role,
        tempPassword: password,
        // compatibility with frontend toast expecting `password`
        password: password
      }
    });
  } catch (error) {
    console.error('Error adding teacher:', error);
    res.status(500).json({ message: 'Server error', error: error?.message || String(error) });
  }
};

// Session Management
exports.getUserSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('activeSessions');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const activeSessions = user.activeSessions.filter(session => session.isActive);

    res.json({
      success: true,
      sessions: activeSessions.map(session => ({
        sessionId: session.sessionId,
        deviceInfo: session.deviceInfo,
        ipAddress: session.ipAddress,
        loginTime: session.loginTime,
        lastActivity: session.lastActivity
      }))
    });
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.terminateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.removeSession(sessionId);

    res.json({
      success: true,
      message: 'Session terminated successfully'
    });
  } catch (error) {
    console.error('Error terminating session:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.cleanupInactiveSessions = async (req, res) => {
  try {
    const cleanedCount = await DatabaseOptimization.cleanupInactiveSessions();

    res.json({
      success: true,
      message: `Cleaned up ${cleanedCount} inactive sessions`
    });
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add a new student
exports.addStudent = async (req, res) => {
  try {
    // Extract comprehensive student data from request
    const userData = req.body;

    // Destructure basic fields with fallbacks
    const name = userData.firstName && userData.lastName
      ? `${userData.firstName}${userData.middleName ? ' ' + userData.middleName : ''} ${userData.lastName}`.trim()
      : userData.name || '';
    const email = userData.email || '';
    const phone = userData.phone || userData.contact?.primaryPhone || '';
    const dateOfBirth = userData.dateOfBirth || userData.studentDetails?.personal?.dateOfBirth || '';
    const gender = userData.gender || userData.studentDetails?.personal?.gender || 'male';
    const className = userData.class || userData.studentDetails?.academic?.currentClass || '';
    const section = userData.section || userData.studentDetails?.academic?.currentSection || '';
    const address = userData.address || userData.addressDetails?.permanent?.street || '';
    const academicYear = userData.academicYear || userData.studentDetails?.academic?.academicYear || new Date().getFullYear().toString();

    // Extract parent/family fields with comprehensive fallback chain
    let parentName = userData.fatherName || userData.studentDetails?.family?.father?.name || userData.parentName || 'Parent';
    let parentEmail = userData.studentDetails?.family?.father?.email || userData.parentEmail || '';
    let parentPhone = userData.studentDetails?.family?.father?.phone || userData.parentPhone || userData.fatherPhone || userData.fatherMobileNo || '9999999999';
    let parentOccupation = userData.studentDetails?.family?.father?.occupation || userData.parentOccupation || userData.fatherOccupation || '';
    let parentRelationship = userData.parentRelationship || 'Father';

    // Check if user is admin or superadmin
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Resolve target school - use middleware-provided school context
    let targetSchoolId, school, schoolCode;

    if (req.school && req.schoolId) {
      // School context provided by middleware (preferred for multi-tenant)
      targetSchoolId = req.schoolId;
      school = req.school;
      schoolCode = req.schoolCode;
    } else {
      // Fallback: use user's school
      targetSchoolId = req.user.schoolId;
      if (!targetSchoolId) {
        return res.status(400).json({ message: 'School ID is required' });
      }
      school = await School.findById(targetSchoolId);
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }
      schoolCode = school.code;
    }

    // Use school-specific database
    const ModelFactory = require('../utils/modelFactory');
    const SchoolUser = ModelFactory.getUserModel(schoolCode);

    // Check if email already exists in school database
    const existingUser = await SchoolUser.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists in this school' });
    }

    // Try to find or reuse existing parent by email/phone match
    let parent = null;
    let parentPassword = null;  // Track parent password for response

    if (parentEmail) {
      parent = await SchoolUser.findOne({ email: parentEmail, role: 'parent' });
    }
    if (!parent && parentPhone) {
      parent = await SchoolUser.findOne({ 'contact.primaryPhone': parentPhone, role: 'parent' });
    }

    let parentId;
    if (parent) {
      // Reuse existing parent
      parentId = parent._id;
      parentPassword = parent.temporaryPassword || 'Contact admin for password reset';
      console.log(`[addStudent] Reused existing parent: ${parent.userId}`);
    } else {
      // Generate new parent ID and password
      parentId = await generateSequentialUserId(schoolCode, 'parent');
      parentPassword = generateParentPassword(parentName, parentId);
      const parentHashedPassword = await hashPassword(parentPassword);

      parent = new SchoolUser({
        userId: parentId,
        name: {
          firstName: parentName.split(' ')[0] || 'Parent',
          lastName: parentName.split(' ').slice(1).join(' ') || 'User',
          displayName: parentName
        },
        email: parentEmail,
        password: parentHashedPassword,
        temporaryPassword: parentPassword,
        passwordChangeRequired: true,
        role: 'parent',
        contact: {
          primaryPhone: parentPhone || '9999999999'
        },
        address: {
          permanent: {
            street: 'Address not provided',
            city: 'NA',
            state: 'NA',
            country: 'India',
            pincode: '560001'
          }
        },
        schoolId: targetSchoolId,
        schoolCode,
        parentDetails: {
          parentId,
          relationship: parentRelationship,
          occupation: parentOccupation,
          children: [] // Will be updated after student creation
        },
        schoolAccess: {
          joinedDate: new Date(),
          assignedBy: req.user._id,
          status: 'active',
          accessLevel: 'full'
        },
        auditTrail: {
          createdBy: req.user._id,
          createdAt: new Date()
        }
      });

      await parent.save();
    }

    // Generate student ID and password
    const studentId = await generateSequentialUserId(schoolCode, 'student');
    const password = generateStudentPassword(name, studentId);
    const hashedPassword = await hashPassword(password);

    // Build comprehensive studentDetails from all available sources
    const studentDetails = {
      // Academic Information
      academic: {
        currentClass: className,
        currentSection: section,
        academicYear: academicYear,
        admissionDate: userData.studentDetails?.academic?.admissionDate || new Date(),
        admissionClass: userData.studentDetails?.academic?.admissionClass || className,
        rollNumber: userData.studentDetails?.academic?.rollNumber || userData.rollNumber || `${className}${section}${Date.now().toString().slice(-3)}`,
        admissionNumber: userData.admissionNumber || userData.studentDetails?.academic?.admissionNumber || '',
        enrollmentNo: userData.enrollmentNo || userData.studentDetails?.academic?.enrollmentNo || '',
        tcNo: userData.tcNo || userData.studentDetails?.academic?.tcNo || '',
        previousSchool: userData.studentDetails?.academic?.previousSchool || {}
      },
      // Personal Information
      personal: {
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date(),
        placeOfBirth: userData.studentDetails?.personal?.placeOfBirth || userData.placeOfBirth || '',
        gender: gender,
        bloodGroup: userData.studentDetails?.personal?.bloodGroup || userData.bloodGroup || '',
        nationality: userData.nationality || userData.studentDetails?.personal?.nationality || 'Indian',
        religion: userData.studentDetails?.personal?.religion || userData.religion || '',
        caste: userData.studentDetails?.personal?.caste || userData.caste || userData.studentCaste || '',
        category: userData.studentDetails?.personal?.category || userData.category || '',
        motherTongue: userData.studentDetails?.personal?.motherTongue || userData.motherTongue || '',
        ageYears: userData.studentDetails?.personal?.ageYears || 0,
        ageMonths: userData.studentDetails?.personal?.ageMonths || 0,
        studentAadhaar: userData.studentAadhaar || userData.studentDetails?.personal?.studentAadhaar || userData.aadharKPRNo || '',
        studentCasteCertNo: userData.studentCasteCertNo || userData.studentDetails?.personal?.studentCasteCertNo || userData.studentCasteCertificateNo || '',
        belongingToBPL: userData.studentDetails?.personal?.belongingToBPL || 'No',
        disability: userData.studentDetails?.personal?.disability || 'Not Applicable',
        isRTECandidate: userData.isRTECandidate || userData.studentDetails?.personal?.isRTECandidate || 'No'
      },
      // Family Information
      family: {
        father: {
          name: userData.studentDetails?.family?.father?.name || userData.fatherName || parentName,
          occupation: userData.studentDetails?.family?.father?.occupation || userData.fatherOccupation || '',
          qualification: userData.studentDetails?.family?.father?.qualification || userData.fatherQualification || userData.fatherEducation || '',
          phone: userData.studentDetails?.family?.father?.phone || userData.fatherPhone || userData.fatherMobileNo || '',
          email: userData.studentDetails?.family?.father?.email || userData.fatherEmail || '',
          aadhaar: userData.studentDetails?.family?.father?.aadhaar || userData.fatherAadhaar || '',
          caste: userData.studentDetails?.family?.father?.caste || userData.fatherCaste || '',
          casteCertNo: userData.studentDetails?.family?.father?.casteCertNo || userData.fatherCasteCertNo || '',
          workAddress: userData.studentDetails?.family?.father?.workAddress || userData.fatherWorkAddress || '',
          annualIncome: userData.studentDetails?.family?.father?.annualIncome || 0
        },
        mother: {
          name: userData.studentDetails?.family?.mother?.name || userData.motherName || '',
          occupation: userData.studentDetails?.family?.mother?.occupation || userData.motherOccupation || '',
          qualification: userData.studentDetails?.family?.mother?.qualification || userData.motherQualification || userData.motherEducation || '',
          phone: userData.studentDetails?.family?.mother?.phone || userData.motherPhone || userData.motherMobileNo || '',
          email: userData.studentDetails?.family?.mother?.email || userData.motherEmail || '',
          aadhaar: userData.studentDetails?.family?.mother?.aadhaar || userData.motherAadhaar || '',
          caste: userData.studentDetails?.family?.mother?.caste || userData.motherCaste || '',
          casteCertNo: userData.studentDetails?.family?.mother?.casteCertNo || userData.motherCasteCertNo || '',
          workAddress: userData.studentDetails?.family?.mother?.workAddress || userData.motherWorkAddress || '',
          annualIncome: userData.studentDetails?.family?.mother?.annualIncome || 0
        },
        guardian: userData.studentDetails?.family?.guardian || {}
      },
      // Transport Information
      transport: {
        mode: userData.studentDetails?.transport?.mode || userData.transportMode || '',
        busRoute: userData.studentDetails?.transport?.busRoute || userData.busRoute || '',
        pickupPoint: userData.studentDetails?.transport?.pickupPoint || userData.pickupPoint || '',
        dropPoint: userData.studentDetails?.transport?.dropPoint || userData.dropPoint || '',
        pickupTime: userData.studentDetails?.transport?.pickupTime || userData.pickupTime || '',
        dropTime: userData.studentDetails?.transport?.dropTime || userData.dropTime || ''
      },
      // Financial Information
      financial: {
        feeCategory: userData.studentDetails?.financial?.feeCategory || '',
        concessionType: userData.studentDetails?.financial?.concessionType || '',
        concessionPercentage: userData.studentDetails?.financial?.concessionPercentage || 0,
        scholarshipDetails: userData.studentDetails?.financial?.scholarshipDetails || {},
        bankDetails: {
          bankName: userData.bankName || userData.studentDetails?.financial?.bankDetails?.bankName || '',
          accountNumber: userData.bankAccountNo || userData.studentDetails?.financial?.bankDetails?.accountNumber || '',
          ifscCode: userData.bankIFSC || userData.studentDetails?.financial?.bankDetails?.ifscCode || '',
          accountHolderName: userData.accountHolderName || userData.studentDetails?.financial?.bankDetails?.accountHolderName || ''
        }
      },
      // Medical Information
      medical: {
        allergies: userData.studentDetails?.medical?.allergies || userData.allergies || [],
        chronicConditions: userData.studentDetails?.medical?.chronicConditions || userData.chronicConditions || [],
        medications: userData.studentDetails?.medical?.medications || userData.medications || [],
        emergencyMedicalContact: userData.studentDetails?.medical?.emergencyMedicalContact || {
          doctorName: userData.doctorName || '',
          hospitalName: userData.hospitalName || '',
          phone: userData.doctorPhone || ''
        },
        lastMedicalCheckup: userData.studentDetails?.medical?.lastMedicalCheckup || userData.lastMedicalCheckup ? new Date(userData.studentDetails?.medical?.lastMedicalCheckup || userData.lastMedicalCheckup) : null
      },
      // IDs and metadata
      studentId: studentId,
      parentId: parent._id
    };

    // Create student user with comprehensive details
    const student = new SchoolUser({
      userId: studentId,
      name: {
        firstName: name.split(' ')[0] || 'Student',
        lastName: name.split(' ').slice(1).join(' ') || 'User',
        displayName: name
      },
      email,
      password: hashedPassword,
      temporaryPassword: password,
      passwordChangeRequired: true,
      role: 'student',
      contact: {
        primaryPhone: phone || '9999999999'
      },
      address: address || {
        permanent: {
          street: 'Address not provided',
          city: 'NA',
          state: 'NA',
          country: 'India',
          pincode: '560001'
        }
      },
      schoolId: targetSchoolId,
      schoolCode,
      studentDetails: studentDetails,
      schoolAccess: {
        joinedDate: new Date(),
        assignedBy: req.user._id,
        status: 'active',
        accessLevel: 'full'
      },
      auditTrail: {
        createdBy: req.user._id,
        createdAt: new Date()
      }
    });

    await student.save();

    // Update parent with student reference
    parent.parentDetails.children.push({
      studentId: student._id,
      name: student.name.displayName,
      class: className,
      section
    });
    await parent.save();

    // Update school stats - only increment parent count if new parent created
    const statUpdate = { $inc: { 'stats.totalStudents': 1 } };
    if (!parent || !parent._id) {
      statUpdate.$inc['stats.totalParents'] = 1;
    }
    await School.findByIdAndUpdate(targetSchoolId, statUpdate);

    res.status(201).json({
      message: 'Student and parent added successfully',
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        userId: student.userId,
        role: student.role,
        password: password
      },
      parent: {
        id: parent._id,
        name: parent.name,
        email: parent.email,
        userId: parent.userId,
        role: parent.role,
        password: parentPassword
      }
    });

  } catch (error) {
    console.error('Error adding student:', error);
    res.status(500).json({ message: 'Error adding student', error: error.message });
  }
};

// Add a new parent (standalone)
exports.addParent = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      occupation,
      relationship,
      address
    } = req.body;

    // Check if user is admin or superadmin
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Resolve target school - use middleware-provided school context
    let targetSchoolId, school, schoolCode;

    if (req.school && req.schoolId) {
      // School context provided by middleware (preferred for multi-tenant)
      targetSchoolId = req.schoolId;
      school = req.school;
      schoolCode = req.schoolCode;
    } else {
      // Fallback: use user's school
      targetSchoolId = req.user.schoolId;
      if (!targetSchoolId) {
        return res.status(400).json({ message: 'School ID is required' });
      }
      school = await School.findById(targetSchoolId);
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }
      schoolCode = school.code;
    }

    // Use school-specific database
    const ModelFactory = require('../utils/modelFactory');
    const SchoolUser = ModelFactory.getUserModel(schoolCode);

    // Check if email already exists in school database
    const existingUser = await SchoolUser.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists in this school' });
    }

    // Generate parent ID and password
    const parentId = await generateSequentialUserId(schoolCode, 'parent');
    const password = generateParentPassword(name, parentId);
    const hashedPassword = await hashPassword(password);

    // Create parent user
    const parent = new SchoolUser({
      userId: parentId,
      name: {
        firstName: name.split(' ')[0] || 'Parent',
        lastName: name.split(' ').slice(1).join(' ') || 'User',
        displayName: name
      },
      email,
      password: hashedPassword,
      temporaryPassword: password,
      passwordChangeRequired: true,
      role: 'parent',
      contact: {
        primaryPhone: phone || '9999999999'
      },
      address: address || {
        permanent: {
          street: 'Address not provided',
          city: 'NA',
          state: 'NA',
          country: 'India',
          pincode: '560001'
        }
      },
      schoolId: targetSchoolId,
      schoolCode,
      parentDetails: {
        parentId,
        relationship,
        occupation,
        children: []
      },
      schoolAccess: {
        joinedDate: new Date(),
        assignedBy: req.user._id,
        status: 'active',
        accessLevel: 'full'
      },
      auditTrail: {
        createdBy: req.user._id,
        createdAt: new Date()
      }
    });

    await parent.save();

    // Update school stats
    await School.findByIdAndUpdate(targetSchoolId, {
      $inc: { 'stats.totalParents': 1 }
    });

    res.status(201).json({
      message: 'Parent added successfully',
      parent: {
        id: parent._id,
        name: parent.name,
        email: parent.email,
        userId: parent.userId,
        role: parent.role,
        password: password // Send password to admin
      }
    });

  } catch (error) {
    console.error('Error adding parent:', error);
    res.status(500).json({ message: 'Error adding parent', error: error.message });
  }
};

// Get all users by role for a school
exports.getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params; // 'admin' | 'teacher' | 'student' | 'parent' | 'all'
    const pageNum = parseInt(req.query.page, 10) || 1;
    const limitNum = Math.min(parseInt(req.query.limit, 10) || 10, 200);
    const search = String(req.query.search || '').trim();

    // Check access
    if (!['admin', 'teacher', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Resolve target school - use middleware-provided school context
    let targetSchoolId, school, schoolCode;

    if (req.school && req.schoolId) {
      // School context provided by middleware (preferred for multi-tenant)
      targetSchoolId = req.schoolId;
      school = req.school;
      schoolCode = req.schoolCode;
    } else {
      // Fallback: use user's school
      targetSchoolId = req.user.schoolId;
      if (!targetSchoolId) {
        return res.status(400).json({ message: 'School ID is required' });
      }
      school = await School.findById(targetSchoolId);
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }
      schoolCode = school.code;
    }

    // Use school-specific database
    const ModelFactory = require('../utils/modelFactory');
    const SchoolUser = ModelFactory.getUserModel(schoolCode);

    // Build query
    const query = {};
    if (role && role !== 'all') {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { 'name.firstName': { $regex: search, $options: 'i' } },
        { 'name.lastName': { $regex: search, $options: 'i' } },
        { 'name.displayName': { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const docs = await SchoolUser.find(query)
      .select('-password')
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .sort({ createdAt: -1 });

    const total = await SchoolUser.countDocuments(query);

    // Shape response for frontend ManageUsers expectations
    const users = docs.map((u) => {
      const obj = u.toObject();
      const fullName = (obj.name && (obj.name.displayName || `${obj.name.firstName || ''} ${obj.name.lastName || ''}`.trim())) || (obj.fullName || 'User');
      const phone = obj.contact?.primaryPhone || '';
      const permanent = obj.address?.permanent || {};
      const addr = [permanent.street, permanent.city, permanent.state, permanent.pincode].filter(Boolean).join(', ');
      return {
        _id: obj._id,
        userId: obj.userId, // Include userId for attendance functionality
        name: fullName,
        email: obj.email,
        role: obj.role,
        phone,
        address: addr,
        isActive: obj.isActive,
        createdAt: obj.createdAt,
        // Add class and section for easier filtering
        class: obj.studentDetails?.academic?.currentClass || '',
        section: obj.studentDetails?.academic?.currentSection || '',
        studentDetails: obj.studentDetails ? {
          class: obj.studentDetails.academic?.currentClass || '',
          section: obj.studentDetails.academic?.currentSection || ''
        } : undefined,
        teacherDetails: obj.teacherDetails ? {
          subjects: Array.isArray(obj.teacherDetails.subjects) ? obj.teacherDetails.subjects.map(s => s.subjectCode || s.subjectName).filter(Boolean) : [],
          qualification: obj.teacherDetails.qualification || '',
          experience: obj.teacherDetails.experience || 0
        } : undefined,
        parentDetails: obj.parentDetails ? {
          parentId: obj.parentDetails.parentId || '',
          relationship: undefined,
          occupation: obj.parentDetails.professional?.occupation || ''
        } : undefined
      };
    });

    res.json({
      success: true,
      data: users, // Also include as 'data' for frontend compatibility
      users, // Keep for backward compatibility
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      total
    });

  } catch (error) {
    console.error('❌ Error fetching users:', error);
    // Always return JSON, never HTML
    return res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message,
      data: [] // Return empty array on error for frontend compatibility
    });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user has access
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has access to this user's school
    if (req.user.role === 'admin' && req.user.schoolId?.toString() !== user.schoolId?.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(user);

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    // Check if user has access
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Resolve target school - use middleware-provided school context
    let targetSchoolId, school, schoolCode;

    if (req.school && req.schoolId) {
      // School context provided by middleware (preferred for multi-tenant)
      targetSchoolId = req.schoolId;
      school = req.school;
      schoolCode = req.schoolCode;
    } else {
      // Fallback to user's school
      targetSchoolId = req.user.schoolId;
      if (!targetSchoolId) {
        return res.status(400).json({ message: 'School context not found' });
      }
      school = await School.findById(targetSchoolId);
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }
      schoolCode = school.code;
    }

    // Use school-specific database
    const ModelFactory = require('../utils/modelFactory');
    const SchoolUser = ModelFactory.getUserModel(schoolCode);

    const user = await SchoolUser.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has access to this user's school
    if (req.user.role === 'admin' && user.schoolCode !== schoolCode) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Remove sensitive fields from update
    delete updateData.password;
    delete updateData.role;
    delete updateData.schoolId;
    delete updateData.userId;

    // Handle student details update with Karnataka SATS fields
    if (user.role === 'student' && updateData.studentDetails) {
      const studentUpdate = {};

      // Academic Information
      if (updateData.class) studentUpdate['studentDetails.academic.currentClass'] = updateData.class;
      if (updateData.section) studentUpdate['studentDetails.academic.currentSection'] = updateData.section;
      if (updateData.rollNumber) studentUpdate['studentDetails.rollNumber'] = updateData.rollNumber;
      if (updateData.admissionDate) studentUpdate['studentDetails.academic.admissionDate'] = new Date(updateData.admissionDate);
      if (updateData.enrollmentNo) studentUpdate['studentDetails.academic.enrollmentNo'] = updateData.enrollmentNo;
      if (updateData.tcNo) studentUpdate['studentDetails.academic.tcNo'] = updateData.tcNo;

      // Personal Information - Karnataka SATS
      if (updateData.dateOfBirth) studentUpdate['studentDetails.personal.dateOfBirth'] = new Date(updateData.dateOfBirth);
      if (updateData.gender) studentUpdate['studentDetails.personal.gender'] = updateData.gender;
      if (updateData.religion) studentUpdate['studentDetails.personal.religion'] = updateData.religion;
      if (updateData.religionOther) studentUpdate['studentDetails.personal.religionOther'] = updateData.religionOther;
      if (updateData.socialCategory) studentUpdate['studentDetails.personal.socialCategory'] = updateData.socialCategory;
      if (updateData.socialCategoryOther) studentUpdate['studentDetails.personal.socialCategoryOther'] = updateData.socialCategoryOther;
      if (updateData.studentCaste) studentUpdate['studentDetails.personal.studentCaste'] = updateData.studentCaste;
      if (updateData.studentCasteOther) studentUpdate['studentDetails.personal.studentCasteOther'] = updateData.studentCasteOther;
      if (updateData.caste) studentUpdate['studentDetails.personal.caste'] = updateData.caste;
      if (updateData.casteOther) studentUpdate['studentDetails.personal.casteOther'] = updateData.casteOther;
      if (updateData.category) studentUpdate['studentDetails.personal.category'] = updateData.category;
      if (updateData.categoryOther) studentUpdate['studentDetails.personal.categoryOther'] = updateData.categoryOther;
      if (updateData.motherTongue) studentUpdate['studentDetails.personal.motherTongue'] = updateData.motherTongue;
      if (updateData.motherTongueOther) studentUpdate['studentDetails.personal.motherTongueOther'] = updateData.motherTongueOther;
      if (updateData.bloodGroup) studentUpdate['studentDetails.personal.bloodGroup'] = updateData.bloodGroup;
      if (updateData.nationality) studentUpdate['studentDetails.personal.nationality'] = updateData.nationality;
      if (updateData.studentNameKannada) studentUpdate['studentDetails.personal.studentNameKannada'] = updateData.studentNameKannada;
      if (updateData.ageYears !== undefined) studentUpdate['studentDetails.personal.ageYears'] = parseInt(updateData.ageYears);
      if (updateData.ageMonths !== undefined) studentUpdate['studentDetails.personal.ageMonths'] = parseInt(updateData.ageMonths);
      if (updateData.studentAadhaar) studentUpdate['studentDetails.personal.studentAadhaar'] = updateData.studentAadhaar;
      if (updateData.studentCasteCertNo) studentUpdate['studentDetails.personal.studentCasteCertNo'] = updateData.studentCasteCertNo;

      // Special Category and Disability
      if (updateData.specialCategory) studentUpdate['studentDetails.personal.specialCategory'] = updateData.specialCategory;
      if (updateData.specialCategoryOther) studentUpdate['studentDetails.personal.specialCategoryOther'] = updateData.specialCategoryOther;
      if (updateData.disability) studentUpdate['studentDetails.personal.disability'] = updateData.disability;
      if (updateData.disabilityOther) studentUpdate['studentDetails.personal.disabilityOther'] = updateData.disabilityOther;

      // RTE (Right to Education) Status
      if (updateData.isRTECandidate) studentUpdate['studentDetails.personal.isRTECandidate'] = updateData.isRTECandidate;

      // Economic Status
      if (updateData.belongingToBPL) studentUpdate['studentDetails.personal.belongingToBPL'] = updateData.belongingToBPL;
      if (updateData.bplCardNo) studentUpdate['studentDetails.personal.bplCardNo'] = updateData.bplCardNo;
      if (updateData.bhagyalakshmiBondNo) studentUpdate['studentDetails.personal.bhagyalakshmiBondNo'] = updateData.bhagyalakshmiBondNo;

      // Family Information - Karnataka SATS
      if (updateData.fatherName) studentUpdate['studentDetails.family.father.name'] = updateData.fatherName;
      if (updateData.fatherNameKannada) studentUpdate['studentDetails.family.father.nameKannada'] = updateData.fatherNameKannada;
      if (updateData.fatherAadhaar) studentUpdate['studentDetails.family.father.aadhaar'] = updateData.fatherAadhaar;
      if (updateData.fatherCaste) studentUpdate['studentDetails.family.father.caste'] = updateData.fatherCaste;
      if (updateData.fatherCasteOther) studentUpdate['studentDetails.family.father.casteOther'] = updateData.fatherCasteOther;
      if (updateData.fatherCasteCertNo) studentUpdate['studentDetails.family.father.casteCertNo'] = updateData.fatherCasteCertNo;
      if (updateData.fatherOccupation) studentUpdate['studentDetails.family.father.occupation'] = updateData.fatherOccupation;
      if (updateData.fatherEducation) studentUpdate['studentDetails.family.father.qualification'] = updateData.fatherEducation;
      if (updateData.fatherPhone || updateData.fatherMobile) studentUpdate['studentDetails.family.father.phone'] = updateData.fatherPhone || updateData.fatherMobile;
      if (updateData.fatherEmail) studentUpdate['studentDetails.family.father.email'] = updateData.fatherEmail;

      if (updateData.motherName) studentUpdate['studentDetails.family.mother.name'] = updateData.motherName;
      if (updateData.motherNameKannada) studentUpdate['studentDetails.family.mother.nameKannada'] = updateData.motherNameKannada;
      if (updateData.motherAadhaar) studentUpdate['studentDetails.family.mother.aadhaar'] = updateData.motherAadhaar;
      if (updateData.motherCaste) studentUpdate['studentDetails.family.mother.caste'] = updateData.motherCaste;
      if (updateData.motherCasteOther) studentUpdate['studentDetails.family.mother.casteOther'] = updateData.motherCasteOther;
      if (updateData.motherCasteCertNo) studentUpdate['studentDetails.family.mother.casteCertNo'] = updateData.motherCasteCertNo;
      if (updateData.motherOccupation) studentUpdate['studentDetails.family.mother.occupation'] = updateData.motherOccupation;
      if (updateData.motherEducation) studentUpdate['studentDetails.family.mother.qualification'] = updateData.motherEducation;
      if (updateData.motherPhone || updateData.motherMobile) studentUpdate['studentDetails.family.mother.phone'] = updateData.motherPhone || updateData.motherMobile;
      if (updateData.motherEmail) studentUpdate['studentDetails.family.mother.email'] = updateData.motherEmail;

      // Guardian Information
      if (updateData.guardianName) studentUpdate['studentDetails.family.guardian.name'] = updateData.guardianName;
      if (updateData.guardianRelation) studentUpdate['studentDetails.family.guardian.relationship'] = updateData.guardianRelation;
      if (updateData.emergencyContactPhone) studentUpdate['studentDetails.family.guardian.phone'] = updateData.emergencyContactPhone;
      if (updateData.parentEmail) studentUpdate['studentDetails.family.guardian.email'] = updateData.parentEmail;

      // Banking Information - Karnataka SATS
      if (updateData.bankName) studentUpdate['studentDetails.financial.bankDetails.bankName'] = updateData.bankName;
      if (updateData.bankAccountNo || updateData.bankAccountNumber) studentUpdate['studentDetails.financial.bankDetails.accountNumber'] = updateData.bankAccountNo || updateData.bankAccountNumber;
      if (updateData.bankIFSC || updateData.ifscCode) studentUpdate['studentDetails.financial.bankDetails.ifscCode'] = updateData.bankIFSC || updateData.ifscCode;
      if (updateData.accountHolderName) studentUpdate['studentDetails.financial.bankDetails.accountHolderName'] = updateData.accountHolderName;

      Object.assign(updateData, studentUpdate);
    }

    // Handle basic user information updates
    if (updateData.name) {
      const parts = String(updateData.name).trim().split(/\s+/);
      const firstName = parts[0] || 'User';
      const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
      updateData['name.firstName'] = firstName;
      updateData['name.lastName'] = lastName;
      updateData['name.displayName'] = `${firstName} ${lastName}`.trim();
      delete updateData.name;
    }

    if (updateData.phone) {
      updateData['contact.primaryPhone'] = updateData.phone;
      delete updateData.phone;
    }

    // Add audit trail
    updateData['auditTrail.lastModifiedBy'] = req.user._id;
    updateData['auditTrail.lastModifiedAt'] = new Date();

    const updatedUser = await SchoolUser.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ message: 'User updated successfully', user: updatedUser });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
};

// Reset user password
exports.resetUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user has access
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has access to this user's school
    if (req.user.role === 'admin' && req.user.schoolId?.toString() !== user.schoolId?.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Generate new password based on role
    let newPassword;
    switch (user.role) {
      case 'student':
        // Use DOB for students if available, otherwise use name-based password
        if (user.studentDetails?.personal?.dateOfBirth) {
          const { generateStudentPasswordFromDOB } = require('../utils/passwordGenerator');
          newPassword = generateStudentPasswordFromDOB(user.studentDetails.personal.dateOfBirth);
        } else {
          newPassword = generateStudentPassword(
            user.name.firstName || user.name.displayName || '',
            user.studentDetails?.studentId || ''
          );
        }
        break;
      case 'teacher':
        newPassword = generateTeacherPassword(
          user.name.firstName || user.name.displayName || '',
          user.teacherDetails?.employeeId || ''
        );
        break;
      case 'parent':
        newPassword = generateParentPassword(
          user.name.firstName || user.name.displayName || '',
          user.parentDetails?.parentId || ''
        );
        break;
      default:
        newPassword = generateRandomPassword(10);
    }

    const hashedPassword = await hashPassword(newPassword);
    user.password = hashedPassword;
    await user.save();

    res.json({
      message: 'Password reset successfully',
      newPassword: newPassword
    });

  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
};

// Deactivate/Activate user
exports.toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user has access
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has access to this user's school
    if (req.user.role === 'admin' && req.user.schoolId?.toString() !== user.schoolId?.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      user: { id: user._id, name: user.name, isActive: user.isActive }
    });

  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ message: 'Error toggling user status', error: error.message });
  }
};

// Get users by role from school-specific database
exports.getUsersByRole = async (req, res) => {
  try {
    console.log('🔍 Getting users by role:', req.params.role);
    const { role } = req.params;
    const { schoolCode, schoolDb } = req; // From school context middleware
    const { class: className, section, academicYear } = req.query; // Get class, section, and academicYear from query params

    if (!['admin', 'teacher', 'student', 'parent'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    console.log('🏫 School context:', { schoolCode, schoolName: req.school?.name });
    console.log('📋 Filter params:', { className, section, academicYear });

    // Use UserGenerator to get users from role-specific collections (like dashboard does)
    const UserGenerator = require('../utils/userGenerator');

    console.log('📋 Querying users with role:', role);

    // Get users from role-specific collection (students, teachers, etc.)
    let users = await UserGenerator.getUsersByRole(schoolCode, role);

    // Helper function to normalize academic year format (handles both 2024-2025 and 2024-25)
    const normalizeAcademicYear = (year) => {
      if (!year) return null;
      const yearStr = String(year).trim();
      // If format is already 2024-25, convert to 2024-2025
      const match = yearStr.match(/^(\d{4})-(\d{2})$/);
      if (match) {
        return `${match[1]}-20${match[2]}`;
      }
      // If format is 2024-2025, keep as is
      if (yearStr.match(/^\d{4}-\d{4}$/)) {
        return yearStr;
      }
      return yearStr;
    };

    // Filter by class, section, and academic year if provided (for students)
    if (role === 'student' && (className || section || academicYear)) {
      const normalizedFilterAY = normalizeAcademicYear(academicYear);
      console.log(`🔍 Filtering students by class: ${className}, section: ${section}, academicYear: ${academicYear} (normalized: ${normalizedFilterAY})`);
      console.log(`📚 Total students before filtering: ${users.length}`);

      users = users.filter(user => {
        // Check multiple possible field structures for class and section
        const userClass = user.academicInfo?.class ||
          user.studentDetails?.class ||
          user.studentDetails?.currentClass ||  // Added currentClass
          user.studentDetails?.academic?.currentClass ||
          user.class;
        const userSection = user.academicInfo?.section ||
          user.studentDetails?.section ||
          user.studentDetails?.currentSection ||  // Added currentSection
          user.studentDetails?.academic?.currentSection ||
          user.section;

        // Check academic year field - check multiple locations
        const userAcademicYear = user.studentDetails?.academic?.academicYear ||
          user.studentDetails?.academicYear ||
          user.academicYear;

        const normalizedUserAY = normalizeAcademicYear(userAcademicYear);

        console.log(`👤 Student ${user.userId}: class=${userClass}, section=${userSection}, academicYear=${userAcademicYear} (normalized: ${normalizedUserAY}) | filtering by: ${normalizedFilterAY}`);

        const classMatch = !className || userClass === className;
        const sectionMatch = !section || userSection === section;
        const academicYearMatch = !academicYear || normalizedUserAY === normalizedFilterAY;

        if (!academicYearMatch && academicYear) {
          console.log(`   ❌ EXCLUDED - AY mismatch: student has "${userAcademicYear}" (normalized: ${normalizedUserAY}), filtering for "${academicYear}" (normalized: ${normalizedFilterAY})`);
        }

        return classMatch && sectionMatch && academicYearMatch;
      });

      console.log(`📊 Filtered to ${users.length} students for class: ${className}, section: ${section}, academicYear: ${academicYear}`);
    }

    console.log(`✅ Found ${users.length} ${role}s in school ${schoolCode}`);

    res.json({
      success: true,
      count: users.length,
      school: req.school?.name || schoolCode,
      schoolCode: schoolCode,
      role: role,
      data: users // Changed from 'users' to 'data' for consistency
    });

  } catch (error) {
    console.error(`Error fetching ${req.params.role} users:`, error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

