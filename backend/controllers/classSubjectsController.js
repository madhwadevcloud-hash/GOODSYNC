const ClassSubjectsSimple = require('../models/ClassSubjectsSimple');
const { gradeSystem } = require('../utils/gradeSystem');
const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');

// Simple Class-based Subject Controller

/**
 * Create or Get Class and Add Subject
 * POST /api/class-subjects/add-subject
 * Body: { className, grade, section?, subjectName, teacherId?, teacherName? }
 */
const addSubjectToClass = async (req, res) => {
  try {
    console.log('[ADD SUBJECT] Request received:', {
      body: req.body,
      user: { userId: req.user?.userId, role: req.user?.role, schoolCode: req.user?.schoolCode }
    });

    // Validate request user data
    if (!req.user || !req.user.schoolCode || !req.user.userId) {
      console.error('[ADD SUBJECT] Missing user data:', req.user);
      return res.status(401).json({
        success: false,
        message: 'User authentication error: missing user data'
      });
    }

    const {
      className,
      grade,
      section = 'A',
      subjectName,
      teacherId = null,
      teacherName = null,
      academicYear = require('../utils/dateUtils').getDefaultAcademicYear(),
      applyToAllClasses = false,
      applyToAllSections = false
    } = req.body;

    let schoolCode = req.user.schoolCode;
    schoolCode = schoolCode.toUpperCase(); // <-- CRITICAL FIX: Store UPPERCASE schoolCode for consistent querying
    const userId = req.user.userId;

    // Validate required fields
    if (!subjectName || (!applyToAllClasses && (!className || !grade))) {
      console.log(`[ADD SUBJECT] Validation failed:`, { className, grade, subjectName, applyToAllClasses });
      return res.status(400).json({
        success: false,
        message: 'Subject name is required, and class/grade are required if not applying to all classes'
      });
    }

    try {
      // Get schoolId by finding the school document in main DB
      const School = require('../models/School');
      // Handle case sensitivity - the School model uses uppercase: true for code field
      const school = await School.findOne({ code: schoolCode.toUpperCase() });

      console.log(`[ADD SUBJECT] Looking for school with code: '${schoolCode}' (uppercase: '${schoolCode.toUpperCase()}')`);
      console.log(`[ADD SUBJECT] Found school:`, school ? { _id: school._id, code: school.code, name: school.name } : 'null');

      if (!school) {
        return res.status(400).json({
          success: false,
          message: `School not found with code: ${schoolCode}`
        });
      }

      const schoolId = school._id;

      try {
        // Get the per-school mongoose connection and bind the model to it
        const schoolConn = await SchoolDatabaseManager.getSchoolConnection(schoolCode);

        if (!schoolConn) {
          console.error(`[ADD SUBJECT] Failed to get school connection for: ${schoolCode}`);
          return res.status(500).json({
            success: false,
            message: `Failed to connect to school database: ${schoolCode}`
          });
        }

        try {
          const SchoolClassSubjects = ClassSubjectsSimple.getModelForConnection(schoolConn);

          // Logic to determine which classes/sections to add the subject to
          let targetClasses = [];

          if (applyToAllClasses) {
            // Fetch all active classes for this school and academic year
            const classesCollection = schoolConn.collection('classes');
            let allClasses = await classesCollection.find({ 
              isActive: true,
              academicYear: academicYear,
              $or: [{ schoolCode: schoolCode }, { schoolId: schoolId.toString() }]
            }).toArray();

            console.log(`[ADD SUBJECT] Found ${allClasses.length} classes for ${academicYear}`);

            // SMART INHERIT: If no classes found for target year, find latest available
            if (allClasses.length === 0) {
              console.log(`💡 Auto-adjusting: No classes for ${academicYear}, searching previous year...`);
              const latestClasses = await classesCollection.find({
                isActive: true,
                $or: [{ schoolCode: schoolCode }, { schoolId: schoolId.toString() }]
              }).sort({ academicYear: -1 }).toArray();

              if (latestClasses.length > 0) {
                const latestYear = latestClasses[0].academicYear;
                allClasses = latestClasses.filter(c => c.academicYear === latestYear);
                console.log(`✨ Found structure from ${latestYear}. Auto-migrating ${allClasses.length} classes.`);
                
                // Perform implicit migration of classes
                const migratedClasses = allClasses.map(cls => {
                  const { _id, ...rest } = cls;
                  return {
                    ...rest,
                    academicYear: academicYear,
                    createdAt: new Date(),
                    updatedAt: new Date()
                  };
                });
                await classesCollection.insertMany(migratedClasses);
                // Use the new year's instances
                allClasses = await classesCollection.find({ 
                  academicYear: academicYear,
                  $or: [{ schoolCode: schoolCode }, { schoolId: schoolId.toString() }]
                }).toArray();
              }
            }
            
            // Map to the format we need
            targetClasses = allClasses.flatMap(cls => {
              const sectionsToUse = (cls.sections && cls.sections.length > 0) ? cls.sections : ['A'];
              return sectionsToUse.map(sec => ({
                className: cls.className,
                grade: cls.grade || cls.className,
                section: sec
              }));
            });
          } else if (applyToAllSections) {
            // Fetch all sections for this specific class
            const classesCollection = schoolConn.collection('classes');
            let targetClassDoc = await classesCollection.findOne({ 
              isActive: true,
              className: className,
              academicYear: academicYear,
              $or: [{ schoolCode: schoolCode }, { schoolId: schoolId.toString() }]
            });

            // SMART INHERIT: If class not found for target year, find latest available
            if (!targetClassDoc) {
              console.log(`💡 Auto-adjusting Class ${className}: Not found in ${academicYear}, searching previous year...`);
              const latestClassDoc = await classesCollection.findOne({
                isActive: true,
                className: className,
                $or: [{ schoolCode: schoolCode }, { schoolId: schoolId.toString() }]
              }, { sort: { academicYear: -1 } });

              if (latestClassDoc) {
                console.log(`✨ Found Class ${className} in ${latestClassDoc.academicYear}. Auto-migrating.`);
                const { _id, ...rest } = latestClassDoc;
                const newClassDoc = {
                  ...rest,
                  academicYear: academicYear,
                  createdAt: new Date(),
                  updatedAt: new Date()
                };
                const result = await classesCollection.insertOne(newClassDoc);
                targetClassDoc = { ...newClassDoc, _id: result.insertedId };
              }
            }

            if (targetClassDoc && targetClassDoc.sections && targetClassDoc.sections.length > 0) {
              targetClasses = targetClassDoc.sections.map(sec => ({
                className,
                grade,
                section: sec
              }));
            } else {
              targetClasses = [{ className, grade, section }];
            }
          } else {
            targetClasses = [{ className, grade, section }];
          }

          console.log(`[ADD SUBJECT] Applying to ${targetClasses.length} target classes/sections`);

          const processResults = [];

          for (const target of targetClasses) {
            try {
              // Find or create the class on the school's DB
              let classSubjects = await SchoolClassSubjects.findOne({
                schoolCode,
                className: target.className,
                section: target.section,
                academicYear: academicYear,
                isActive: true
              });

              if (!classSubjects) {
                // Use static helper of the model if available, otherwise create directly
                if (typeof SchoolClassSubjects.findOrCreateClass === 'function') {
                  classSubjects = await SchoolClassSubjects.findOrCreateClass({
                    className: target.className,
                    grade: target.grade,
                    section: target.section,
                    schoolCode,
                    schoolId,
                    academicYear, // Pass academic year to helper
                    createdBy: userId
                  });
                } else {
                  classSubjects = new SchoolClassSubjects({
                    className: target.className,
                    grade: target.grade,
                    section: target.section,
                    schoolCode,
                    schoolId,
                    academicYear: academicYear,
                    subjects: [],
                    createdBy: userId,
                    lastModifiedBy: userId
                  });
                  await classSubjects.save();
                }
              }

              // Add the subject
              classSubjects.addSubject({
                name: subjectName,
                teacherId,
                teacherName
              });

              classSubjects.lastModifiedBy = userId;
              await classSubjects.save();
              processResults.push({ success: true, target: `${target.className}-${target.section}` });
            } catch (err) {
              console.error(`[ADD SUBJECT] Error for ${target.className}-${target.section}:`, err.message);
              processResults.push({ success: false, target: `${target.className}-${target.section}`, error: err.message });
            }
          }

          const successful = processResults.filter(r => r.success).length;
          
          res.status(200).json({
            success: true,
            message: `Subject "${subjectName}" processed for ${successful} of ${processResults.length} classes/sections`,
            data: {
              processed: processResults,
              subjectName
            }
          });

        } catch (modelError) {
          console.error(`[ADD SUBJECT] Error getting model for connection:`, modelError);
          return res.status(500).json({
            success: false,
            message: 'Error getting database model',
            error: modelError.message
          });
        }
      } catch (connectionError) {
        console.error(`[ADD SUBJECT] Error getting school connection:`, connectionError);
        return res.status(500).json({
          success: false,
          message: 'Error connecting to school database',
          error: connectionError.message
        });
      }
    } catch (schoolError) {
      console.error(`[ADD SUBJECT] Error finding school:`, schoolError);
      return res.status(500).json({
        success: false,
        message: 'Error finding school information',
        error: schoolError.message
      });
    }
  } catch (error) {
    console.error('[ADD SUBJECT] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while adding subject',
      error: error.message
    });
  }
};

/**
 * Remove Subject from Class
 * DELETE /api/subjects/class/remove-subject
 * Body: { className, subjectName }
 */
const removeSubjectFromClass = async (req, res) => {
  try {
    const { className, subjectName, section = 'A', academicYear = require('../utils/dateUtils').getDefaultAcademicYear() } = req.body;
    let schoolCode = req.user.schoolCode;
    schoolCode = schoolCode.toUpperCase(); // <-- CRITICAL FIX: Store UPPERCASE schoolCode for consistent querying
    const userId = req.user.userId;

    // Validate required fields
    if (!className || !subjectName) {
      return res.status(400).json({
        success: false,
        message: 'Class name and subject name are required'
      });
    }

    // Find the class
    // Use per-school model to find class
    const schoolConn = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const SchoolClassSubjects = ClassSubjectsSimple.getModelForConnection(schoolConn);

    const classSubjects = await SchoolClassSubjects.findOne({
      schoolCode,
      className,
      section,
      academicYear,
      isActive: true
    });

    if (!classSubjects) {
      return res.status(404).json({
        success: false,
        message: `Class "${className}" not found`
      });
    }

    // Remove the subject
    try {
      classSubjects.removeSubject(subjectName);
      classSubjects.lastModifiedBy = userId;
      await classSubjects.save();

      res.status(200).json({
        success: true,
        message: `Subject "${subjectName}" removed from ${className} successfully`,
        data: {
          classId: classSubjects._id,
          className: classSubjects.className,
          totalSubjects: classSubjects.totalSubjects,
          subjects: classSubjects.getActiveSubjects()
        }
      });

    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

  } catch (error) {
    console.error('Error removing subject from class:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while removing subject'
    });
  }
};

/**
 * Get All Classes with Subjects
 * GET /api/class-subjects/classes
 */
const getAllClassesWithSubjects = async (req, res) => {
  try {
    console.log('[GET ALL CLASSES] Request received from:', {
      userId: req.user?.userId,
      role: req.user?.role,
      schoolCode: req.user?.schoolCode
    });

    // Validate request user data
    if (!req.user || !req.user.schoolCode) {
      console.error('[GET ALL CLASSES] Missing user data:', req.user);
      return res.status(401).json({
        success: false,
        message: 'User authentication error: missing school code'
      });
    }

    let schoolCode = req.user.schoolCode;
    schoolCode = schoolCode.toUpperCase(); // <-- CRITICAL FIX: Store UPPERCASE schoolCode for consistent querying
    const { academicYear = require('../utils/dateUtils').getDefaultAcademicYear() } = req.query;

    console.log(`[GET ALL CLASSES] Looking for classes in school: ${schoolCode}, academic year: ${academicYear}`);

    try {
      // Get classes from the school's DB
      const schoolConn = await SchoolDatabaseManager.getSchoolConnection(schoolCode);

      if (!schoolConn) {
        console.error(`[GET ALL CLASSES] Failed to get school connection for: ${schoolCode}`);
        return res.status(500).json({
          success: false,
          message: `Failed to connect to school database: ${schoolCode}`
        });
      }

      try {
        const SchoolClassSubjects = ClassSubjectsSimple.getModelForConnection(schoolConn);

        try {
          let classes = await SchoolClassSubjects.getAllClasses(schoolCode, academicYear);

          // --- SMART INHERIT FALLBACK REMOVED ---

          console.log(`[GET ALL CLASSES] Found ${classes.length} classes for school: ${schoolCode}`);

          const classesData = classes.map(classItem => ({
            classId: classItem._id,
            className: classItem.className,
            grade: classItem.grade,
            section: classItem.section,
            totalSubjects: classItem.totalSubjects,
            subjects: classItem.getActiveSubjects(),
            createdAt: classItem.createdAt,
            updatedAt: classItem.updatedAt
          }));

          res.status(200).json({
            success: true,
            message: 'Classes retrieved successfully',
            data: {
              academicYear,
              totalClasses: classesData.length,
              classes: classesData
            }
          });
        } catch (fetchError) {
          console.error(`[GET ALL CLASSES] Error fetching classes:`, fetchError);
          return res.status(500).json({
            success: false,
            message: 'Error fetching classes from database',
            error: fetchError.message
          });
        }
      } catch (modelError) {
        console.error(`[GET ALL CLASSES] Error getting model for connection:`, modelError);
        return res.status(500).json({
          success: false,
          message: 'Error getting database model',
          error: modelError.message
        });
      }
    } catch (connectionError) {
      console.error(`[GET ALL CLASSES] Error getting school connection:`, connectionError);
      return res.status(500).json({
        success: false,
        message: 'Error connecting to school database',
        error: connectionError.message
      });
    }
  } catch (error) {
    console.error('[GET ALL CLASSES] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching classes',
      error: error.message
    });
  }
};

/**
 * Get Subjects for a Specific Class
 * GET /api/subjects/class/:className
 */
const getSubjectsForClass = async (req, res) => {
  console.log('🎯 [CONTROLLER] getSubjectsForClass called for class:', req.params.className);
  try {
    // Validate request user data
    if (!req.user || !req.user.schoolCode) {
      console.error('[GET CLASS SUBJECTS] Missing user data:', req.user);
      return res.status(401).json({
        success: false,
        message: 'User authentication error: missing school code'
      });
    }

    const { className } = req.params;
    const schoolCode = req.user.schoolCode;
    const { academicYear = require('../utils/dateUtils').getDefaultAcademicYear(), section } = req.query;

    console.log(`[GET CLASS SUBJECTS] Fetching subjects for class: ${className}, section: ${section || 'ALL'}, academicYear: ${academicYear}`);

    // Build query object
    const query = {
      schoolCode,
      className,
      academicYear,
      isActive: true
    };

    // Add section filter if provided and not "ALL"
    if (section && section !== 'ALL') {
      query.section = section;
      console.log(`[GET CLASS SUBJECTS] Filtering by section: ${section}`);
    }

    // Try main database first since admin-added subjects are stored there
    try {
      const mainClassSubjects = await ClassSubjectsSimple.findOne(query);

      if (mainClassSubjects) {
        console.log(`[GET CLASS SUBJECTS] Found class "${className}" in main database with ${mainClassSubjects.totalSubjects} subjects`);
        return res.status(200).json({
          success: true,
          message: 'Subjects retrieved successfully from main database',
          data: {
            classId: mainClassSubjects._id,
            className: mainClassSubjects.className,
            grade: mainClassSubjects.grade,
            section: mainClassSubjects.section,
            academicYear: mainClassSubjects.academicYear,
            totalSubjects: mainClassSubjects.totalSubjects,
            subjects: mainClassSubjects.getActiveSubjects()
          }
        });
      }
    } catch (mainDbError) {
      console.error('[GET CLASS SUBJECTS] Main database error:', mainDbError.message);
    }

    // Try school-specific database as fallback
    try {
      const schoolConn = await SchoolDatabaseManager.getSchoolConnection(schoolCode);

      if (schoolConn) {
        try {
          const SchoolClassSubjects = ClassSubjectsSimple.getModelForConnection(schoolConn);

          const classSubjects = await SchoolClassSubjects.findOne(query);

          if (classSubjects) {
            console.log(`[GET CLASS SUBJECTS] Found class "${className}" in school database with ${classSubjects.totalSubjects} subjects`);
            return res.status(200).json({
              success: true,
              message: 'Subjects retrieved successfully from school database',
              data: {
                classId: classSubjects._id,
                className: classSubjects.className,
                grade: classSubjects.grade,
                section: classSubjects.section,
                academicYear: classSubjects.academicYear,
                totalSubjects: classSubjects.totalSubjects,
                subjects: classSubjects.getActiveSubjects()
              }
            });
          }
        } catch (schoolDbError) {
          console.error('[GET CLASS SUBJECTS] School database error:', schoolDbError.message);
        }
      }
    } catch (connectionError) {
      console.error('[GET CLASS SUBJECTS] Connection error:', connectionError.message);
    }

    // Return empty subjects array if not found in either database
    console.log(`[GET CLASS SUBJECTS] Class "${className}" not found in either database, returning empty subjects`);
    return res.status(200).json({
      success: true,
      message: `Class "${className}" exists but has no subjects configured yet`,
      data: {
        className: className,
        grade: className,
        section: null,
        academicYear: academicYear,
        totalSubjects: 0,
        subjects: []
      }
    });
  } catch (error) {
    console.error('[GET CLASS SUBJECTS] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving subjects',
      error: error.message
    });
  }
};

/**
 * Get Subjects by Grade and Section
 * GET /api/subjects/grade/:grade/section/:section
 */
const getSubjectsByGradeSection = async (req, res) => {
  try {
    const { grade, section } = req.params;
    const schoolCode = req.user.schoolCode;
    const { academicYear = require('../utils/dateUtils').getDefaultAcademicYear() } = req.query;

    const schoolConn = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const SchoolClassSubjects = ClassSubjectsSimple.getModelForConnection(schoolConn);

    const classSubjects = await SchoolClassSubjects.findByGradeSection(
      schoolCode,
      grade,
      section,
      academicYear
    );

    if (!classSubjects) {
      return res.status(404).json({
        success: false,
        message: `No class found for Grade ${grade}, Section ${section}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Subjects retrieved successfully',
      data: {
        classId: classSubjects._id,
        className: classSubjects.className,
        grade: classSubjects.grade,
        section: classSubjects.section,
        academicYear: classSubjects.academicYear,
        totalSubjects: classSubjects.totalSubjects,
        subjects: classSubjects.getActiveSubjects()
      }
    });
  } catch (error) {
    console.error('Error getting subjects by grade and section:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving subjects'
    });
  }
};

/**
 * Update Subject in Class (assign teacher, etc.)
 * PUT /api/class-subjects/update-subject
 * Body: { className, subjectName, teacherId?, teacherName? }
 */
const updateSubjectInClass = async (req, res) => {
  try {
    const { className, subjectName, teacherId, teacherName } = req.body;
    const schoolCode = req.user.schoolCode;
    const userId = req.user.userId;

    // Validate required fields
    if (!className || !subjectName) {
      return res.status(400).json({
        success: false,
        message: 'Class name and subject name are required'
      });
    }

    // Find the class
    const schoolConn = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const SchoolClassSubjects = ClassSubjectsSimple.getModelForConnection(schoolConn);

    const classSubjects = await SchoolClassSubjects.findOne({
      schoolCode,
      className,
      isActive: true
    });

    if (!classSubjects) {
      return res.status(404).json({
        success: false,
        message: `Class "${className}" not found`
      });
    }

    // Find the subject
    const subject = classSubjects.subjects.find(sub =>
      sub.name.toLowerCase() === subjectName.toLowerCase() && sub.isActive
    );

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: `Subject "${subjectName}" not found in class "${className}"`
      });
    }

    // Update subject fields (simplified - only teacher info)
    if (teacherId !== undefined) subject.teacherId = teacherId;
    if (teacherName !== undefined) subject.teacherName = teacherName;

    classSubjects.lastModifiedBy = userId;
    await classSubjects.save();

    res.status(200).json({
      success: true,
      message: `Subject "${subjectName}" updated successfully`,
      data: {
        classId: classSubjects._id,
        className: classSubjects.className,
        updatedSubject: subject,
        totalSubjects: classSubjects.totalSubjects
      }
    });
  } catch (error) {
    console.error('Error updating subject in class:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating subject'
    });
  }
};

/**
 * Bulk Add Subjects to Class
 * POST /api/class-subjects/bulk-add
 * Body: { className, grade, section?, subjects: [{ name }] }
 */
const bulkAddSubjectsToClass = async (req, res) => {
  try {
    const {
      className,
      grade,
      section = 'A',
      subjects,
      academicYear = require('../utils/dateUtils').getDefaultAcademicYear()
    } = req.body;

    const schoolCode = req.user.schoolCode;
    const userId = req.user.userId;

    // Get schoolId by finding the school document
    const School = require('../models/School');
    // Handle case sensitivity - the School model uses uppercase: true for code field
    const school = await School.findOne({ code: schoolCode.toUpperCase() });

    console.log(`[DEBUG] Looking for school with code: '${schoolCode}' (uppercase: '${schoolCode.toUpperCase()}')`);
    console.log(`[DEBUG] Found school:`, school ? { _id: school._id, code: school.code, name: school.name } : 'null');

    if (!school) {
      return res.status(400).json({
        success: false,
        message: `School not found with code: ${schoolCode}`
      });
    }

    const schoolId = school._id;

    // Validate required fields
    if (!className || !grade || !subjects || !Array.isArray(subjects)) {
      return res.status(400).json({
        success: false,
        message: 'Class name, grade, and subjects array are required'
      });
    }

    if (subjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one subject is required'
      });
    }

    // Find or create the class
    let classSubjects = await ClassSubjectsSimple.findOrCreateClass({
      className,
      grade,
      section,
      schoolCode,
      schoolId,
      academicYear,
      createdBy: userId
    });

    const results = {
      added: [],
      skipped: [],
      errors: []
    };

    // Add each subject (simplified)
    for (const subjectData of subjects) {
      try {
        if (!subjectData.name) {
          results.errors.push({ subject: subjectData, error: 'Subject name is required' });
          continue;
        }

        classSubjects.addSubject({
          name: subjectData.name
        });

        results.added.push(subjectData.name);
      } catch (error) {
        if (error.message.includes('already exists')) {
          results.skipped.push(subjectData.name);
        } else {
          results.errors.push({ subject: subjectData.name, error: error.message });
        }
      }
    }

    classSubjects.lastModifiedBy = userId;
    await classSubjects.save();

    res.status(200).json({
      success: true,
      message: 'Bulk subject addition completed',
      data: {
        classId: classSubjects._id,
        className: classSubjects.className,
        totalSubjects: classSubjects.totalSubjects,
        results,
        subjects: classSubjects.getActiveSubjects()
      }
    });
  } catch (error) {
    console.error('Error bulk adding subjects to class:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while bulk adding subjects'
    });
  }
};

/**
 * Initialize basic subjects for a class if none exist
 * POST /api/class-subjects/initialize
 */
const initializeBasicSubjects = async (req, res) => {
  try {
    console.log('[INITIALIZE BASIC] Request received:', {
      body: req.body,
      user: { userId: req.user?.userId, role: req.user?.role, schoolCode: req.user?.schoolCode }
    });

    if (!req.user || !req.user.schoolCode || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication error: missing user data'
      });
    }

    const { className, grade, section = 'A', academicYear = require('../utils/dateUtils').getDefaultAcademicYear() } = req.body;
    const schoolCode = req.user.schoolCode;
    const userId = req.user.userId;

    if (!className || !grade) {
      return res.status(400).json({
        success: false,
        message: 'Class name and grade are required'
      });
    }

    try {
      // Get schoolId
      const School = require('../models/School');
      const school = await School.findOne({ code: schoolCode.toUpperCase() });

      if (!school) {
        return res.status(400).json({
          success: false,
          message: `School not found with code: ${schoolCode}`
        });
      }

      const schoolId = school._id;
      const schoolConn = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
      const SchoolClassSubjects = ClassSubjectsSimple.getModelForConnection(schoolConn);

      // Check if class already has subjects
      const existingClass = await SchoolClassSubjects.findOne({
        schoolCode,
        className,
        section,
        academicYear,
        isActive: true
      });

      if (existingClass && existingClass.subjects && existingClass.subjects.length > 0) {
        return res.status(200).json({
          success: true,
          message: `Class "${className}" already has ${existingClass.subjects.length} subjects`,
          data: {
            classId: existingClass._id,
            className: existingClass.className,
            totalSubjects: existingClass.totalSubjects,
            subjects: existingClass.getActiveSubjects()
          }
        });
      }

      // Basic subjects based on grade
      const gradeNum = parseInt(grade);
      let basicSubjects = [];

      if (gradeNum >= 1 && gradeNum <= 5) {
        basicSubjects = ['English', 'Mathematics', 'Hindi', 'Science', 'Social Studies'];
      } else if (gradeNum >= 6 && gradeNum <= 10) {
        basicSubjects = ['English', 'Mathematics', 'Hindi', 'Science', 'Social Studies', 'Computer Science'];
      } else {
        basicSubjects = ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology'];
      }

      // Create or update class with basic subjects
      const classSubjects = await SchoolClassSubjects.findOneAndUpdate(
        {
          schoolCode,
          className,
          section,
          academicYear
        },
        {
          $setOnInsert: {
            schoolCode,
            className,
            grade,
            section,
            schoolId,
            academicYear,
            isActive: true,
            createdBy: userId,
            createdAt: new Date()
          },
          $set: {
            subjects: basicSubjects.map(name => ({
              name,
              code: name.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
              isActive: true,
              addedDate: new Date()
            })),
            totalSubjects: basicSubjects.length,
            lastModifiedBy: userId,
            updatedAt: new Date()
          }
        },
        {
          upsert: true,
          new: true
        }
      );

      res.status(200).json({
        success: true,
        message: `Initialized Class "${className}" with ${basicSubjects.length} basic subjects`,
        data: {
          classId: classSubjects._id,
          className: classSubjects.className,
          grade: classSubjects.grade,
          section: classSubjects.section,
          totalSubjects: classSubjects.totalSubjects,
          subjects: classSubjects.getActiveSubjects()
        }
      });

    } catch (error) {
      console.error(`[INITIALIZE BASIC] Error:`, error);
      return res.status(500).json({
        success: false,
        message: 'Error initializing basic subjects',
        error: error.message
      });
    }
  } catch (error) {
    console.error('[INITIALIZE BASIC] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  addSubjectToClass,
  removeSubjectFromClass,
  getAllClassesWithSubjects,
  getSubjectsForClass,
  getSubjectsByGradeSection,
  updateSubjectInClass,
  bulkAddSubjectsToClass,
  initializeBasicSubjects
};
