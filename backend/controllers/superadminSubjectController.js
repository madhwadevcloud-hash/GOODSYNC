const Subject = require('../models/Subject');
const School = require('../models/School');
const { connectToSchoolDatabase } = require('../utils/databaseManager');

/**
 * SuperAdmin Subject Controller
 * Manages subjects per class for schools in superadmin panel
 */

// Get all subjects for a specific school organized by class
exports.getSchoolSubjects = async (req, res) => {
  try {
    const { schoolId } = req.params;
    
    // Get school information
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // Connect to school-specific database
    const schoolDb = await connectToSchoolDatabase(school.code);
    const SchoolSubject = schoolDb.model('Subject', require('../models/Subject').schema);

    // Get all subjects for the school
    const subjects = await SchoolSubject.find({
      schoolCode: school.code,
      isActive: true
    }).sort({ subjectName: 1 });

    // Organize subjects by class
    const subjectsByClass = {};
    
    // Initialize all classes with empty arrays
    const allClasses = ['LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    allClasses.forEach(className => {
      subjectsByClass[className] = [];
    });

    // Group subjects by applicable grades
    subjects.forEach(subject => {
      subject.applicableGrades.forEach(gradeInfo => {
        if (subjectsByClass[gradeInfo.grade]) {
          subjectsByClass[gradeInfo.grade].push({
            _id: subject._id,
            subjectId: subject.subjectId,
            subjectName: subject.subjectName,
            subjectCode: subject.subjectCode,
            subjectType: subject.subjectType,
            category: subject.category,
            isCore: gradeInfo.isCore,
            isOptional: gradeInfo.isOptional,
            streams: gradeInfo.streams || [],
            academicDetails: subject.academicDetails,
            teacherCount: subject.teacherAssignments?.length || 0,
            isActive: subject.isActive
          });
        }
      });
    });

    res.json({
      success: true,
      data: {
        schoolId: school._id,
        schoolName: school.name,
        schoolCode: school.code,
        subjectsByClass
      }
    });

  } catch (error) {
    console.error('Error getting school subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve school subjects',
      error: error.message
    });
  }
};

// Get subjects for a specific class
exports.getClassSubjects = async (req, res) => {
  try {
    const { schoolId, className } = req.params;
    
    // Get school information
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // Connect to school-specific database
    const schoolDb = await connectToSchoolDatabase(school.code);
    const SchoolSubject = schoolDb.model('Subject', require('../models/Subject').schema);

    // Find subjects applicable to the specific class
    const subjects = await SchoolSubject.find({
      schoolCode: school.code,
      'applicableGrades.grade': className,
      isActive: true
    }).sort({ subjectName: 1 });

    // Format the subjects for the specific class
    const classSubjects = subjects.map(subject => {
      const gradeInfo = subject.applicableGrades.find(grade => grade.grade === className);
      return {
        _id: subject._id,
        subjectId: subject.subjectId,
        subjectName: subject.subjectName,
        subjectCode: subject.subjectCode,
        subjectType: subject.subjectType,
        category: subject.category,
        isCore: gradeInfo?.isCore || false,
        isOptional: gradeInfo?.isOptional || false,
        streams: gradeInfo?.streams || [],
        academicDetails: subject.academicDetails,
        teacherAssignments: subject.teacherAssignments || [],
        isActive: subject.isActive,
        createdAt: subject.createdAt
      };
    });

    res.json({
      success: true,
      data: {
        className,
        subjects: classSubjects,
        totalSubjects: classSubjects.length
      }
    });

  } catch (error) {
    console.error('Error getting class subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve class subjects',
      error: error.message
    });
  }
};

// Add a new subject to a specific class
exports.addSubjectToClass = async (req, res) => {
  try {
    const { schoolId, className } = req.params;
    const { subjectData } = req.body;
    
    // Validate required fields
    if (!subjectData || !subjectData.subjectName || !subjectData.subjectCode) {
      return res.status(400).json({
        success: false,
        message: 'Subject name and code are required'
      });
    }

    // Get school information
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // Connect to school-specific database
    const schoolDb = await connectToSchoolDatabase(school.code);
    const SchoolSubject = schoolDb.model('Subject', require('../models/Subject').schema);

    // Check if subject with same code already exists for this class
    const existingSubject = await SchoolSubject.findOne({
      schoolCode: school.code,
      subjectCode: subjectData.subjectCode.toUpperCase(),
      'applicableGrades.grade': className
    });

    if (existingSubject) {
      return res.status(400).json({
        success: false,
        message: 'Subject with this code already exists for this class'
      });
    }

    // Generate subject ID
    const subjectCount = await SchoolSubject.countDocuments({ schoolCode: school.code });
    const subjectId = `${school.code}_SUB_${String(subjectCount + 1).padStart(3, '0')}`;

    // Create new subject
    const newSubject = new SchoolSubject({
      subjectId,
      subjectName: subjectData.subjectName,
      subjectCode: subjectData.subjectCode.toUpperCase(),
      schoolId: school._id,
      schoolCode: school.code,
      subjectType: subjectData.subjectType || 'academic',
      category: subjectData.category || 'core',
      applicableGrades: [{
        grade: className,
        level: getGradeLevel(className),
        isCore: subjectData.isCore !== undefined ? subjectData.isCore : true,
        isOptional: subjectData.isOptional !== undefined ? subjectData.isOptional : false,
        streams: subjectData.streams || []
      }],
      academicDetails: {
        totalMarks: subjectData.totalMarks || 100,
        passingMarks: subjectData.passingMarks || 33,
        theoryMarks: subjectData.theoryMarks || 70,
        practicalMarks: subjectData.practicalMarks || 30,
        hasPractical: subjectData.hasPractical || false,
        hasProject: subjectData.hasProject || false,
        projectMarks: subjectData.projectMarks || 0
      },
      teacherAssignments: [],
      curriculum: {
        description: subjectData.description || '',
        objectives: subjectData.objectives || [],
        learningOutcomes: subjectData.learningOutcomes || []
      },
      isActive: true,
      academicYear: subjectData.academicYear || '2024-25'
    });

    await newSubject.save();

    res.json({
      success: true,
      message: 'Subject added to class successfully',
      data: {
        subject: {
          _id: newSubject._id,
          subjectId: newSubject.subjectId,
          subjectName: newSubject.subjectName,
          subjectCode: newSubject.subjectCode,
          className,
          isCore: newSubject.applicableGrades[0].isCore,
          isOptional: newSubject.applicableGrades[0].isOptional
        }
      }
    });

  } catch (error) {
    console.error('Error adding subject to class:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add subject to class',
      error: error.message
    });
  }
};

// Update a subject for a specific class
exports.updateClassSubject = async (req, res) => {
  try {
    const { schoolId, className, subjectId } = req.params;
    const { subjectData } = req.body;
    
    // Get school information
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // Connect to school-specific database
    const schoolDb = await connectToSchoolDatabase(school.code);
    const SchoolSubject = schoolDb.model('Subject', require('../models/Subject').schema);

    // Find the subject
    const subject = await SchoolSubject.findOne({
      _id: subjectId,
      schoolCode: school.code
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    // Update subject data
    if (subjectData.subjectName) subject.subjectName = subjectData.subjectName;
    if (subjectData.subjectCode) subject.subjectCode = subjectData.subjectCode.toUpperCase();
    if (subjectData.subjectType) subject.subjectType = subjectData.subjectType;
    if (subjectData.category) subject.category = subjectData.category;
    
    // Update grade-specific information
    const gradeIndex = subject.applicableGrades.findIndex(grade => grade.grade === className);
    if (gradeIndex !== -1) {
      if (subjectData.isCore !== undefined) subject.applicableGrades[gradeIndex].isCore = subjectData.isCore;
      if (subjectData.isOptional !== undefined) subject.applicableGrades[gradeIndex].isOptional = subjectData.isOptional;
      if (subjectData.streams) subject.applicableGrades[gradeIndex].streams = subjectData.streams;
    }

    // Update academic details
    if (subjectData.academicDetails) {
      Object.assign(subject.academicDetails, subjectData.academicDetails);
    }

    await subject.save();

    res.json({
      success: true,
      message: 'Subject updated successfully',
      data: {
        subject: {
          _id: subject._id,
          subjectId: subject.subjectId,
          subjectName: subject.subjectName,
          subjectCode: subject.subjectCode,
          className,
          isCore: subject.applicableGrades[gradeIndex]?.isCore,
          isOptional: subject.applicableGrades[gradeIndex]?.isOptional
        }
      }
    });

  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subject',
      error: error.message
    });
  }
};

// Remove a subject from a specific class
exports.removeSubjectFromClass = async (req, res) => {
  try {
    const { schoolId, className, subjectId } = req.params;
    
    // Get school information
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // Connect to school-specific database
    const schoolDb = await connectToSchoolDatabase(school.code);
    const SchoolSubject = schoolDb.model('Subject', require('../models/Subject').schema);

    // Find the subject
    const subject = await SchoolSubject.findOne({
      _id: subjectId,
      schoolCode: school.code
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    // Check if subject is applicable to multiple grades
    if (subject.applicableGrades.length > 1) {
      // Remove only the specific grade
      subject.applicableGrades = subject.applicableGrades.filter(grade => grade.grade !== className);
      await subject.save();
    } else {
      // Delete the entire subject if it's only applicable to this grade
      await SchoolSubject.findByIdAndDelete(subjectId);
    }

    res.json({
      success: true,
      message: 'Subject removed from class successfully',
      data: {
        className,
        subjectId
      }
    });

  } catch (error) {
    console.error('Error removing subject from class:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove subject from class',
      error: error.message
    });
  }
};

// Helper function to determine grade level
function getGradeLevel(grade) {
  const gradeLevels = {
    'LKG': 'elementary',
    'UKG': 'elementary',
    '1': 'elementary',
    '2': 'elementary',
    '3': 'elementary',
    '4': 'elementary',
    '5': 'elementary',
    '6': 'middle',
    '7': 'middle',
    '8': 'middle',
    '9': 'high',
    '10': 'high',
    '11': 'higherSecondary',
    '12': 'higherSecondary'
  };
  
  return gradeLevels[grade] || 'elementary';
}
