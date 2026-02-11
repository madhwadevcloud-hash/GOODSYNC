const Admission = require('../models/Admission');
const User = require('../models/User');
const School = require('../models/School');
const { generateAdmissionNumber } = require('../utils/idGenerator');

// --- ADD THESE TWO LINES AT THE TOP ---
const UserGenerator = require('../utils/userGenerator');
const academicYearHelper = require('../utils/academicYearHelper');

// Create a new admission application
exports.createAdmission = async (req, res) => {
  try {
    const admissionData = req.body;

    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only admin can create admissions' });
    }

    const schoolId = req.user.role === 'superadmin' ? admissionData.schoolId : req.user.schoolId;

    if (!schoolId) {
      return res.status(400).json({ message: 'School ID is required' });
    }

    const admissionNumber = await generateAdmissionNumber(schoolId, admissionData.academicYear);
    const dateOfBirth = new Date(admissionData.dateOfBirth.split('/').reverse().join('-'));
    const schoolAdmissionDate = new Date(admissionData.schoolAdmissionDate.split('/').reverse().join('-'));

    const admission = new Admission({
      schoolId,
      admissionNumber,
      academicYear: admissionData.academicYear,
      class: admissionData.admissionToClass,
      section: 'A',
      semester: admissionData.semester,
      mediumOfInstruction: admissionData.mediumOfInstruction,

      personalInfo: {
        firstName: admissionData.studentNameEnglish?.firstName || '',
        lastName: admissionData.studentNameEnglish?.lastName || '',
        firstNameKannada: admissionData.studentNameKannada?.firstName || '',
        lastNameKannada: admissionData.studentNameKannada?.lastName || '',
        dateOfBirth: dateOfBirth,
        age: admissionData.age || { years: 0, months: 0 },
        ageAppropriationReason: admissionData.ageAppropriationReason || '',
        gender: admissionData.gender,
        religion: admissionData.religion || 'Hindu',
        motherTongue: admissionData.motherTongue
      },

      familyInfo: {
        father: {
          firstName: admissionData.fatherNameEnglish?.firstName || '',
          middleName: admissionData.fatherNameEnglish?.middleName || '',
          lastName: admissionData.fatherNameEnglish?.lastName || '',
          firstNameKannada: admissionData.fatherNameKannada?.firstName || '',
          middleNameKannada: admissionData.fatherNameKannada?.middleName || '',
          lastNameKannada: admissionData.fatherNameKannada?.lastName || '',
          aadharNo: admissionData.fatherAadharNo
        },
        mother: {
          firstName: admissionData.motherNameEnglish?.firstName || '',
          middleName: admissionData.motherNameEnglish?.middleName || '',
          lastName: admissionData.motherNameEnglish?.lastName || '',
          firstNameKannada: admissionData.motherNameKannada?.firstName || '',
          middleNameKannada: admissionData.motherNameKannada?.middleName || '',
          lastNameKannada: admissionData.motherNameKannada?.lastName || '',
          aadharNo: admissionData.motherAadharNo
        }
      },

      identityDocuments: {
        aadharKPRNo: admissionData.aadharKPRNo,
        studentCasteCertificateNo: admissionData.studentCasteCertificateNo || '',
        fatherCasteCertificateNo: admissionData.fatherCasteCertificateNo || '',
        motherCasteCertificateNo: admissionData.motherCasteCertificateNo || '',
        // --- ADD TC/ENROLLMENT HERE IF YOU ADDED THEM TO THE FORM ---
        tcNo: admissionData.tcNo || '',
        enrollmentNo: admissionData.enrollmentNo || ''
      },

      casteCategoryInfo: {
        studentCaste: admissionData.studentCaste || '',
        fatherCaste: admissionData.fatherCaste || '',
        motherCaste: admissionData.motherCaste || '',
        socialCategory: admissionData.socialCategory,
        specialCategory: admissionData.specialCategory || 'None'
      },

      economicStatus: {
        belongingToBPL: admissionData.belongingToBPL,
        bplCardNo: admissionData.bplCardNo || '',
        bhagyalakshmiBondNo: admissionData.bhagyalakshmiBondNo || ''
      },

      specialNeeds: {
        disability: admissionData.disability,
        isRTECandidate: admissionData.isRTECandidate || 'No' // <-- FIX IS HERE
      },

      contactInfo: {
        address: {
          urbanRural: admissionData.urbanRural,
          pinCode: admissionData.pinCode,
          district: admissionData.district,
          taluka: admissionData.taluka || '',
          cityVillageTown: admissionData.cityVillageTown || '',
          locality: admissionData.locality || '',
          fullAddress: admissionData.address
        },
        communication: {
          studentMobileNo: admissionData.studentMobileNo || '',
          studentEmailId: admissionData.studentEmailId || '',
          fatherMobileNo: admissionData.fatherMobileNo,
          fatherEmailId: admissionData.fatherEmailId || '',
          motherMobileNo: admissionData.motherMobileNo,
          motherEmailId: admissionData.motherEmailId || ''
        },
        emergencyContact: {
          name: admissionData.fatherNameEnglish ? `${admissionData.fatherNameEnglish.firstName} ${admissionData.fatherNameEnglish.lastName}` : '',
          relationship: 'father',
          phone: admissionData.fatherMobileNo
        }
      },

      schoolBankingInfo: {
        schoolAdmissionDate: schoolAdmissionDate,
        bankingDetails: {
          bankName: admissionData.bankName || '',
          bankAccountNo: admissionData.bankAccountNo || '',
          bankIFSCCode: admissionData.bankIFSCCode || '' // <-- FIX IS HERE
        },
        transportation: {
          bmtcBusPass: admissionData.bmtcBusPass
        }
      },

      fees: {
        totalAmount: 0,
        paidAmount: 0,
        paymentStatus: 'pending'
      },

      processedBy: req.user._id
    });

    await admission.save();

    res.status(201).json({
      message: 'Admission application created successfully',
      admission: admission
    });

  } catch (error) {
    console.error('Error creating admission:', error);
    res.status(500).json({ message: 'Error creating admission', error: error.message });
  }
};

// --- THIS IS THE NEW, SAFER APPROVE FUNCTION ---
// Approve admission
exports.approveAdmission = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const { adminNotes } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can approve admissions' });
    }

    const admission = await Admission.findById(admissionId);
    if (!admission) {
      return res.status(404).json({ message: 'Admission not found' });
    }

    if (req.user.schoolId?.toString() !== admission.schoolId?.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (admission.status !== 'pending') {
      return res.status(400).json({ message: 'Admission is not in pending status' });
    }

    // --- START: NEW LOGIC (THE "GLUE CODE") ---

    // 1. Get School and Academic Year info
    const school = await School.findById(admission.schoolId);
    if (!school) {
      return res.status(404).json({ message: 'Associated school not found. Cannot create user.' });
    }

    const activeAcademicYear = await academicYearHelper.getCurrentAcademicYear(admission.schoolId);

    // 2. Build the complete userData object for the generator
    const userDataForCreator = {
      role: 'student',
      schoolId: admission.schoolId,
      email: admission.contactInfo.communication.studentEmailId || `student.${admission.admissionNumber}@${school.code.toLowerCase()}.school`,

      currentAcademicYear: activeAcademicYear.year,

      // --- SAFER SPREAD OPERATORS ---
      // This copies all fields and handles cases where sub-documents might be missing
      ...(admission.personalInfo?.toObject() || {}),
      ...(admission.familyInfo?.father?.toObject() || {}),
      ...(admission.familyInfo?.mother?.toObject() || {}),
      ...(admission.identityDocuments?.toObject() || {}), // <-- This provides aadharKPRNo, studentCasteCertificateNo
      ...(admission.casteCategoryInfo?.toObject() || {}),
      ...(admission.economicStatus?.toObject() || {}),
      ...(admission.specialNeeds?.toObject() || {}),      // <-- This provides isRTECandidate
      ...(admission.contactInfo?.address?.toObject() || {}),
      ...(admission.contactInfo?.communication?.toObject() || {}),
      ...(admission.schoolBankingInfo?.bankingDetails?.toObject() || {}), // <-- This provides bankIFSCCode

      // --- Explicitly map fields that are in objects ---
      studentNameEnglish: admission.personalInfo,
      fatherNameEnglish: admission.familyInfo.father,
      motherNameEnglish: admission.familyInfo.mother,

      // --- Pass top-level fields from the form ---
      academicYear: admission.academicYear, // The form's year (as a fallback)
      admissionToClass: admission.class,

      // --- Pass TC & Enrollment (now from identityDocuments) ---
      tcNo: admission.identityDocuments.tcNo || '',
      enrollmentNo: admission.identityDocuments.enrollmentNo || ''
    };

    // 3. Create the student user
    const creationResult = await UserGenerator.createUser(school.code, userDataForCreator);

    if (!creationResult.success) {
      return res.status(500).json({ message: 'Admission approved, but user creation failed.' });
    }

    // --- END: NEW LOGIC ---

    // Update admission status (original logic)
    admission.status = 'approved';
    admission.adminNotes = adminNotes;
    admission.processedAt = new Date();
    admission.studentId = creationResult.user._id; // Link the new user
    await admission.save();

    res.json({
      message: 'Admission approved and student user created successfully',
      admission: admission,
      newUser: creationResult.credentials // Send new credentials back
    });

  } catch (error) {
    console.error('Error approving admission:', error);
    res.status(500).json({ message: 'Error approving admission', error: error.message });
  }
};


// --- ALL OTHER FUNCTIONS (getAdmissions, rejectAdmission, etc.) ---
// (These are unchanged, but I include them for a complete file replacement)

// Get all admissions for a school
exports.getAdmissions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search = '' } = req.query;

    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const schoolId = req.user.role === 'superadmin' ? req.query.schoolId : req.user.schoolId;

    if (!schoolId) {
      return res.status(400).json({ message: 'School ID is required' });
    }

    const query = { schoolId };
    if (status) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { 'personalInfo.firstName': { $regex: search, $options: 'i' } },
        { 'personalInfo.lastName': { $regex: search, $options: 'i' } },
        { admissionNumber: { $regex: search, $options: 'i' } },
        { 'parentInfo.father.name': { $regex: search, $options: 'i' } },
        { 'parentInfo.mother.name': { $regex: search, $options: 'i' } },
        { 'parentInfo.guardian.name': { $regex: search, $options: 'i' } }
      ];
    }

    const admissions = await Admission.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Admission.countDocuments(query);

    res.json({
      admissions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Error fetching admissions:', error);
    res.status(500).json({ message: 'Error fetching admissions', error: error.message });
  }
};

// Get admission by ID
exports.getAdmissionById = async (req, res) => {
  try {
    const { admissionId } = req.params;

    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const admission = await Admission.findById(admissionId);
    if (!admission) {
      return res.status(404).json({ message: 'Admission not found' });
    }

    if (req.user.role === 'admin' && req.user.schoolId?.toString() !== admission.schoolId?.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(admission);

  } catch (error) {
    console.error('Error fetching admission:', error);
    res.status(500).json({ message: 'Error fetching admission', error: error.message });
  }
};

// Reject admission
exports.rejectAdmission = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const { rejectionReason, adminNotes } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can reject admissions' });
    }

    const admission = await Admission.findById(admissionId);
    if (!admission) {
      return res.status(404).json({ message: 'Admission not found' });
    }

    if (req.user.schoolId?.toString() !== admission.schoolId?.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (admission.status !== 'pending') {
      return res.status(400).json({ message: 'Admission is not in pending status' });
    }

    admission.status = 'rejected';
    admission.rejectionReason = rejectionReason;
    admission.adminNotes = adminNotes;
    admission.processedAt = new Date();
    await admission.save();

    res.json({
      message: 'Admission rejected successfully',
      admission: {
        id: admission._id,
        admissionNumber: admission.admissionNumber,
        status: admission.status
      }
    });

  } catch (error) {
    console.error('Error rejecting admission:', error);
    res.status(500).json({ message: 'Error rejecting admission', error: error.message });
  }
};

// Update admission
exports.updateAdmission = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const updateData = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can update admissions' });
    }

    const admission = await Admission.findById(admissionId);
    if (!admission) {
      return res.status(404).json({ message: 'Admission not found' });
    }

    if (req.user.schoolId?.toString() !== admission.schoolId?.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    delete updateData.status;
    delete updateData.processedBy;
    delete updateData.processedAt;

    const updatedAdmission = await Admission.findByIdAndUpdate(
      admissionId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Admission updated successfully',
      admission: updatedAdmission
    });

  } catch (error) {
    console.error('Error updating admission:', error);
    res.status(500).json({ message: 'Error updating admission', error: error.message });
  }
};

// Get admission statistics
exports.getAdmissionStats = async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(413).json({ message: 'Access denied' });
    }

    const schoolId = req.user.role === 'superadmin' ? req.query.schoolId : req.user.schoolId;

    if (!schoolId) {
      return res.status(400).json({ message: 'School ID is required' });
    }

    const stats = await Admission.aggregate([
      { $match: { schoolId: new require('mongoose').Types.ObjectId(schoolId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statsObj = {};
    stats.forEach(stat => {
      statsObj[stat._id] = stat.count;
    });

    res.json({
      pending: statsObj.pending || 0,
      approved: statsObj.approved || 0,
      rejected: statsObj.rejected || 0,
      admitted: statsObj.admitted || 0,
      withdrawn: statsObj.withdrawn || 0,
      total: Object.values(statsObj).reduce((a, b) => a + b, 0)
    });

  } catch (error) {
    console.error('Error fetching admission stats:', error);
    res.status(500).json({ message: 'Error fetching admission stats', error: error.message });
  }
};

// Search for existing student records
exports.searchAdmissions = async (req, res) => {
  try {
    const { enrollmentNo, tcNo, schoolCode } = req.query;

    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const schoolId = req.user.role === 'superadmin' ? req.query.schoolId : req.user.schoolId;

    if (!schoolId) {
      return res.status(400).json({ message: 'School ID is required' });
    }

    let query = { schoolId };

    if (enrollmentNo) {
      query.admissionNumber = { $regex: enrollmentNo, $options: 'i' };
    }

    if (tcNo) {
      query['academicInfo.transferCertificate'] = { $regex: tcNo, $options: 'i' };
    }

    const admissions = await Admission.find(query)
      .populate('schoolId', 'name code')
      .limit(10)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      admissions: admissions.map(admission => ({
        id: admission._id,
        admissionNumber: admission.admissionNumber,
        studentName: `${admission.personalInfo.firstName} ${admission.personalInfo.lastName}`,
        class: admission.class,
        academicYear: admission.academicYear,
        status: admission.status,
        dateOfBirth: admission.personalInfo.dateOfBirth,
        fatherName: `${admission.familyInfo.father.firstName} ${admission.familyInfo.father.lastName}`,
        motherName: `${admission.familyInfo.mother.firstName} ${admission.familyInfo.mother.lastName}`,
        address: admission.contactInfo.address.fullAddress,
        phone: admission.contactInfo.communication.fatherMobileNo
      }))
    });

  } catch (error) {
    console.error('Error searching admissions:', error);
    res.status(500).json({ message: 'Error searching admissions', error: error.message });
  }
};