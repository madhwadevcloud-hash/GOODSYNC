const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');
const ReportCalculations = require('./reportCalculations');
const { ObjectId } = require('mongodb');
const cleanTestName = (name) => {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
};

class ReportService {
  async getSchoolSummary(schoolId, schoolCode, filters = {}) {
    try {
      console.log('🔍 [getSchoolSummary] Starting summary for school:', schoolCode, 'with filters:', JSON.stringify(filters, null, 2));
      
      const { targetClass, targetSection, from, to } = filters;
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const academicYear = `${currentYear}-${currentYear + 1}`;
      
      // Set default date range to current month if not provided
      const startDate = from || new Date(currentYear, currentDate.getMonth(), 1);
      const endDate = to || new Date(currentYear, currentDate.getMonth() + 1, 0);
      
      // Convert schoolId to ObjectId (handle both string and ObjectId)
      let schoolObjectId;
      try {
        schoolObjectId = typeof schoolId === 'string' ? new ObjectId(schoolId) : schoolId;
      } catch (err) {
        console.error(' Invalid schoolId format:', schoolId);
        schoolObjectId = schoolId; // Use as-is if conversion fails
      }
      
      console.log(' [getSchoolSummary] SchoolId:', schoolId, 'ObjectId:', schoolObjectId);
      
      // Get database connection
      const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
      const db = connection.db;
      
      console.log(' [getSchoolSummary] Database name:', db.databaseName);
      
      // Build match query for results - more flexible to find any results
      const matchQuery = {
        $or: [
          { schoolId: schoolObjectId },
          { schoolId: schoolId.toString() },
          { schoolCode: { $regex: `^${schoolCode}$`, $options: 'i' } } // Case-insensitive schoolCode match
        ]
        // Don't filter by academicYear or status initially to see what data exists
      };
      
      // Add class filter if provided (match both 'class' and 'className' fields)
      if (targetClass && targetClass !== 'ALL') {
        matchQuery.$and = matchQuery.$and || [];
        matchQuery.$and.push({
          $or: [
            { class: targetClass.toString() },
            { className: targetClass.toString() }
          ]
        });
      }
      
      // Add section filter if provided (case-insensitive)
      if (targetSection && targetSection !== 'ALL') {
        matchQuery.$and = matchQuery.$and || [];
        // Create case-insensitive regex for section matching
        const sectionRegex = new RegExp(`^${targetSection.toString()}$`, 'i');
        matchQuery.$and.push({
          $or: [
            { section: sectionRegex },
            { sectionName: sectionRegex },
            { section: targetSection.toString() },
            { sectionName: targetSection.toString() }
          ]
        });
        console.log(' [getSchoolSummary] Section filter applied:', targetSection);
      }
      
      console.log(' [getSchoolSummary] Final match query:', JSON.stringify(matchQuery, null, 2));
      
      // Debug: First, check if we have any documents at all in school database
      const totalDocs = await db.collection('results').countDocuments({});
      console.log(` [getSchoolSummary] Total documents in school results collection: ${totalDocs}`);
      
      if (totalDocs === 0) {
        console.log(' [getSchoolSummary] The school results collection is empty');
        return {
          totalStudents: 0,
          totalMarks: 0,
          totalResults: 0,
          avgMarks: 0,
          avgAttendance: 0,
          classResults: [],
          attendanceData: []
        };
      }
      
      // Check with match query
      const resultCount = await db.collection('results').countDocuments(matchQuery);
      console.log(` [getSchoolSummary] Found ${resultCount} results matching query`);
      
      // Get sample document to debug
      const sampleDoc = await db.collection('results').findOne({});
      console.log(' [getSchoolSummary] Sample result document:', JSON.stringify(sampleDoc, null, 2));
      
      // Check what schoolId format is in the database
      if (sampleDoc && sampleDoc.schoolId) {
        console.log(' [getSchoolSummary] Sample schoolId type:', typeof sampleDoc.schoolId, 'Value:', sampleDoc.schoolId);
      }
      
      // Debug: Check section field values
      if (targetSection && targetSection !== 'ALL') {
        const sectionSample = await db.collection('results').findOne({
          $or: [
            { section: { $exists: true } },
            { sectionName: { $exists: true } }
          ]
        });
        console.log(' [getSchoolSummary] Sample section data:', {
          section: sectionSample?.section,
          sectionName: sectionSample?.sectionName,
          requestedSection: targetSection
        });
      }
      
      // Get class-wise results using school database
      const [allResults, allTests, attendanceData, classSubjectsList] = await Promise.all([
        db.collection('results').find({
          ...matchQuery,
          subjects: { $exists: true, $ne: [] },
          className: { $exists: true, $ne: null, $ne: '' }
        }).toArray(),
        
        db.collection('testdetails').find({ isActive: true }).toArray(),
        
        db.collection('attendances').aggregate([
          {
            $match: {
              schoolCode: schoolCode,
              documentType: 'session_attendance'
            }
          },
          // Add class/section filters if provided (case-insensitive)
          ...(targetClass && targetClass !== 'ALL' ? [{ $match: { class: new RegExp(`^${targetClass.toString()}$`, 'i') } }] : []),
          ...(targetSection && targetSection !== 'ALL' ? [{ $match: { section: new RegExp(`^${targetSection.toString()}$`, 'i') } }] : []),
          {
            $unwind: '$students'
          },
          {
            $group: {
              _id: {
                class: '$class',
                section: '$section',
                studentId: '$students.studentId'
              },
              totalSessions: { $sum: 1 },
              presentSessions: {
                $sum: {
                  $cond: [
                    { $eq: ['$students.status', 'present'] },
                    1,
                    0
                  ]
                }
              },
              halfDaySessions: {
                $sum: {
                  $cond: [
                    { $eq: ['$students.status', 'half_day'] },
                    0.5,
                    0
                  ]
                }
              }
            }
          },
          {
            $group: {
              _id: {
                class: '$_id.class',
                section: '$_id.section'
              },
              totalStudents: { $sum: 1 },
              avgAttendance: {
                $avg: {
                  $multiply: [
                    {
                      $divide: [
                        { $add: ['$presentSessions', '$halfDaySessions'] },
                        '$totalSessions'
                      ]
                    },
                    100
                  ]
                }
              }
            }
          },
          {
            $project: {
              _id: 0,
              class: '$_id.class',
              section: '$_id.section',
              totalStudents: 1,
              attendancePercentage: { $round: ['$avgAttendance', 2] }
            }
          },
          { $sort: { class: 1, section: 1 } }
        ]).toArray(),

        db.collection('classsubjects').find({ isActive: true }).toArray()
      ]);

      // Map classSubjects to group subjects by `${className}-${section}`
      const subjectsByClassMap = {};
      classSubjectsList.forEach(cs => {
        const key = `${cs.className}-${cs.section}`;
        subjectsByClassMap[key] = cs.subjects?.filter(s => s.isActive).map(s => s.name) || [];
      });

      // Group results by class and section
      const classSectionGroups = {};
      allResults.forEach(doc => {
        const cls = doc.className || 'Unknown';
        const sec = doc.section || 'Not Assigned';
        const key = `${cls}-${sec}`;
        if (!classSectionGroups[key]) {
          classSectionGroups[key] = {
            class: cls,
            section: sec,
            students: []
          };
        }
        classSectionGroups[key].students.push(doc);
      });

      const classResults = [];
      let totalStudentsCount = 0;
      let totalWeightedSum = 0;
      let totalStudentsWithResults = 0;

      for (const key in classSectionGroups) {
        const group = classSectionGroups[key];
        const classKey = `${group.class}-${group.section}`;
        const expectedSubjects = subjectsByClassMap[classKey] || [];
        const classTests = allTests.filter(t => t.className === group.class && t.isActive);

        let studentPercentsSum = 0;
        let eligibleStudentsCount = 0;

        group.students.forEach(studentDoc => {
          let weightedPercentSum = 0;
          let totalWeight = 0;
          let isStudentComplete = true;

          if (classTests.length === 0 || expectedSubjects.length === 0) {
            isStudentComplete = false;
          } else {
            for (const test of classTests) {
              const testName = test.name || test.testName;
              let testObtained = 0;
              let testMax = 0;
              let testHasMarks = true;

              for (const subjectName of expectedSubjects) {
                const match = studentDoc.subjects?.find(s => 
                  cleanTestName(s.testType) === cleanTestName(testName) && 
                  s.subjectName === subjectName
                );

                if (!match || match.obtainedMarks === null || match.obtainedMarks === undefined) {
                  testHasMarks = false;
                  break;
                } else {
                  testObtained += Number(match.obtainedMarks);
                  testMax += Number(match.maxMarks || match.totalMarks || test.maxMarks || 100);
                }
              }

              if (!testHasMarks) {
                isStudentComplete = false;
                break;
              }

              const testPercent = testMax > 0 ? (testObtained / testMax) * 100 : 0;
              const weight = Number(test.weightage || 0);
              weightedPercentSum += testPercent * (weight / 100);
              totalWeight += weight;
            }
          }

          if (isStudentComplete && totalWeight > 0) {
            const finalStudentPercent = weightedPercentSum;
            studentPercentsSum += finalStudentPercent;
            eligibleStudentsCount++;
            totalWeightedSum += finalStudentPercent;
            totalStudentsWithResults++;
          }
        });

        const avgPercent = eligibleStudentsCount > 0 ? studentPercentsSum / eligibleStudentsCount : 0;
        totalStudentsCount += group.students.length;

        classResults.push({
          class: group.class,
          section: group.section,
          totalStudents: group.students.length,
          avgMarks: Math.round(avgPercent * 100) / 100,
          totalResults: eligibleStudentsCount
        });
      }

      classResults.sort((a, b) => {
        const classCompare = String(a.class).localeCompare(String(b.class));
        if (classCompare !== 0) return classCompare;
        return String(a.section).localeCompare(String(b.section));
      });

      // Debug: Log raw data before calculations
      console.log(' [getSchoolSummary] Raw classResults:', JSON.stringify(classResults, null, 2));
      console.log(' [getSchoolSummary] Raw attendanceData:', JSON.stringify(attendanceData, null, 2));
      
      // Calculate overall summary
      let totalStudents = classResults.reduce((sum, item) => sum + (item.totalStudents || 0), 0);
      const avgMarks = totalStudentsWithResults > 0 ? totalWeightedSum / totalStudentsWithResults : 0;
      
      // Calculate average attendance
      const totalAttendance = attendanceData.reduce((sum, item) => sum + (item.attendancePercentage || 0), 0);
      const avgAttendance = attendanceData.length > 0 ? totalAttendance / attendanceData.length : 0;
      
      // If no students from results, use attendance data for student count
      if (totalStudents === 0 && attendanceData.length > 0) {
        totalStudents = attendanceData.reduce((sum, item) => sum + (item.totalStudents || 0), 0);
        console.log(' [getSchoolSummary] Using attendance data for student count:', totalStudents);
      }
      
      // Debug: Log calculated values
      console.log(' [getSchoolSummary] Calculated values:', {
        totalStudents,
        totalMarks,
        totalResults,
        avgMarks: Math.round(avgMarks * 10) / 10,
        avgAttendance: Math.round(avgAttendance * 10) / 10,
        classResultsCount: classResults.length,
        attendanceDataCount: attendanceData.length
      });

      // Merge results and attendance data for class-wise display
      let classWiseResults = classResults;
      
      // If no results data, use attendance data to populate class-wise table
      if (classResults.length === 0 && attendanceData.length > 0) {
        classWiseResults = attendanceData.map(att => ({
          class: att.class,
          section: att.section,
          totalStudents: att.totalStudents,
          avgMarks: 0,
          avgAttendance: att.attendancePercentage,
          totalResults: 0
        }));
      } else if (classResults.length > 0) {
        // Merge attendance data into results
        classWiseResults = classResults.map(result => {
          let avgAttendance = 0;
          
          console.log(` [getSchoolSummary] Processing result for class: ${result.class}, section: ${result.section}`);
          
          // Match attendance by both class AND section for accurate section-wise data
          const classAttendance = attendanceData.filter(att => {
            const classMatches = att.class === result.class;
            const sectionMatches = att.section === result.section;
            console.log(`   Comparing attendance (${att.class}, ${att.section}) with result (${result.class}, ${result.section}): class=${classMatches}, section=${sectionMatches}`);
            return classMatches && sectionMatches;
          });
          
          console.log(`   Found ${classAttendance.length} attendance records for class ${result.class}`);
          
          if (classAttendance.length > 0) {
            const totalAttendance = classAttendance.reduce((sum, att) => sum + (att.attendancePercentage || 0), 0);
            avgAttendance = totalAttendance / classAttendance.length;
            console.log(`   Calculated avgAttendance: ${avgAttendance}`);
          } else {
            console.log(`   No attendance data found for class ${result.class}`);
          }
          
          return {
            ...result,
            avgAttendance: Math.round(avgAttendance * 10) / 10
          };
        });
      }

      return {
        classWiseResults,
        summary: {
          totalClasses: classWiseResults.length > 0 
            ? new Set(classWiseResults.map(r => r.class)).size 
            : 0,
          totalStudents,
          avgMarks: Math.round(avgMarks * 10) / 10,
          avgAttendance: Math.round(avgAttendance * 10) / 10
        }
      };
      
    } catch (error) {
      console.error('❌ [getSchoolSummary] Error:', {
        message: error.message,
        stack: error.stack,
        schoolId,
        filters
      });
      
      // Return a more detailed error response
      const errorResponse = {
        success: false,
        error: 'Failed to generate school summary',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        classWiseResults: [],
        summary: {
          totalClasses: 0,
          totalStudents: 0,
          avgMarks: 0
        }
      };
      
      return errorResponse;
    }
  }

  // Add the exportToCSV method
  async exportToCSV(schoolId, schoolCode, exportType, filters = {}) {
    try {
      const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
      const db = connection.db;

      const { class: targetClass, section: targetSection, from, to } = filters;
      let data = [];
      let headers = [];

      switch (exportType) {
        case 'dues':
          const duesQuery = { 
            schoolId: new ObjectId(schoolId)
          };
          
          if (targetClass && targetClass !== 'ALL') duesQuery.studentClass = targetClass;
          if (targetSection && targetSection !== 'ALL') duesQuery.studentSection = targetSection;
          if (filters.status && String(filters.status).trim().toLowerCase() !== 'all') {
            const normalizedStatus = String(filters.status).trim().toLowerCase();
            duesQuery.status = { $regex: `^${new RegExp(escapeRegExp(normalizedStatus)).source}$`, $options: 'i' };
          }
          if (filters.search) {
            const searchRegex = new RegExp(filters.search, 'i');
            duesQuery.$or = [
              { studentName: searchRegex },
              { rollNumber: searchRegex }
            ];
          }

          const dues = await db.collection('studentfeerecords').aggregate([
            { $match: duesQuery },
            { $unwind: '$installments' },
            {
              $project: {
                _id: 0,
                'Student Name': '$studentName',
                'Class': '$studentClass',
                'Section': '$studentSection',
                'Fee Structure': '$feeStructureName',
                'Installment': '$installments.name',
                'Amount': '$installments.amount',
                'Paid Amount': '$installments.paidAmount',
                'Balance': { $subtract: ['$installments.amount', '$installments.paidAmount'] },
                'Status': {
                  $let: {
                    vars: {
                      isPaid: { $eq: ['$installments.status', 'PAID'] },
                      hasPartial: { $gt: ['$installments.paidAmount', 0] },
                      isOverdue: { $lt: ['$installments.dueDate', new Date()] }
                    },
                    in: {
                      $switch: {
                        branches: [
                          { case: '$$isPaid', then: 'Paid' },
                          { case: '$$hasPartial', then: 'Partial' },
                          { case: '$$isOverdue', then: 'Overdue' }
                        ],
                        default: 'Pending'
                      }
                    }
                  }
                }
              }
            },
            { $sort: { 'Class': 1, 'Section': 1, 'Student Name': 1 } }
          ]).toArray();

          if (dues.length > 0) {
            headers = Object.keys(dues[0]);
            data = dues.map(record => Object.values(record));
          } else {
            headers = ['Message'];
            data = [['No dues records found matching the criteria']];
          }
          break;

        // Add other export types (students, attendance, results) as needed
        default:
          headers = ['Message'];
          data = [['Export type not supported']];
      }

      // Convert to CSV format
      const csvContent = [
        headers.join(','),
        ...data.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      return csvContent;
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  } // Added closing brace here

  // Get students by class and section with their marks and attendance
  async getStudentsByClassSection(schoolId, schoolCode, className, section, academicYear) {
    try {
      console.log('🔍 [getStudentsByClassSection] Fetching students for:', { schoolCode, className, section, academicYear });
      
      const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
      const db = connection.db;
      
      // STEP 1: Fetch ALL students from students collection first
      // Use the SAME matching logic as the frontend to ensure consistency
      const studentsMatchQuery = {
        role: 'student',
        isActive: { $ne: false }
      };

      // Add class filter - PRIORITY: academicInfo.class > studentDetails.currentClass > class
      if (className) {
        // Create a robust regex: "10" matches "10", "10th", "10th Class", "Class 10"
        const cleanName = className.toString().trim();
        const numericPart = cleanName.match(/\d+/)?.[0];
        
        let regexStr = `^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`; // Escape special chars for exact match
        if (numericPart) {
           // If it's numeric like "10", match "10", "10th", "10th Class", "Class 10"
           regexStr = `^(${cleanName}|${numericPart}|${numericPart}(st|nd|rd|th)|(Class|Grade)\\s*${numericPart})(\\s+Class|\\s+Grade)?$`;
        }
        
        const classRegex = { $regex: regexStr, $options: 'i' };
        studentsMatchQuery.$or = [
          { 'academicInfo.class': classRegex },
          { 'studentDetails.academic.currentClass': classRegex },
          { 'studentDetails.currentClass': classRegex },
          { 'studentDetails.class': classRegex },
          { class: classRegex }
        ];
      }

      // Add section filter - PRIORITY: academicInfo.section > studentDetails.currentSection > section
      if (section && section !== 'ALL' && section !== 'All' && section !== 'All Sections') {
        let sectionFilter;
        
        if (section === 'Not Assigned') {
          // Match documents where section is missing or explicitly empty/'Not Assigned'
          const emptyValues = [null, '', undefined, 'Not Assigned'];
          sectionFilter = {
            $or: [
              { 'academicInfo.section': { $in: emptyValues } },
              { 'studentDetails.academic.currentSection': { $in: emptyValues } },
              { 'studentDetails.currentSection': { $in: emptyValues } },
              { 'studentDetails.section': { $in: emptyValues } },
              { section: { $in: emptyValues } },
              { 'academicInfo.section': { $exists: false } },
              { 'studentDetails.academic.currentSection': { $exists: false } }
            ]
          };
        } else {
          // Normal regex match for specific sections, trimming whitespace
          const sectionRegex = { $regex: `^${section.toString().trim()}$`, $options: 'i' };
          sectionFilter = {
            $or: [
              { 'academicInfo.section': sectionRegex },
              { 'studentDetails.academic.currentSection': sectionRegex },
              { 'studentDetails.currentSection': sectionRegex },
              { 'studentDetails.section': sectionRegex },
              { section: sectionRegex }
            ]
          };
        }
        
        if (studentsMatchQuery.$or) {
          // Combine both class and section filters with $and
          studentsMatchQuery.$and = [
            { $or: studentsMatchQuery.$or },
            sectionFilter
          ];
          delete studentsMatchQuery.$or;
        } else {
          // No class filter, just add section filter
          Object.assign(studentsMatchQuery, sectionFilter);
        }
      }

      // Add academic year filter if provided
      if (academicYear) {
        // Normalize: support both "2024-25" and "2024-2025" formats
        const yearStr = academicYear.toString().trim();
        const yearVariants = [yearStr];
        
        // Generate the alternate format
        const parts = yearStr.split('-');
        if (parts.length === 2) {
          const startYear = parts[0].trim();
          const endPart = parts[1].trim();
          if (endPart.length === 2) {
            // Short format "2024-25" -> also match "2024-2025"
            yearVariants.push(`${startYear}-${startYear.substring(0, 2)}${endPart}`);
          } else if (endPart.length === 4) {
            // Full format "2024-2025" -> also match "2024-25"
            yearVariants.push(`${startYear}-${endPart.substring(2)}`);
          }
        }
        
        console.log('📅 Academic year variants to match:', yearVariants);
        
        const academicYearFilter = {
          $or: [
            { 'studentDetails.academicYear': { $in: yearVariants } },
            { 'studentDetails.academic.academicYear': { $in: yearVariants } },
            { 'academicYear': { $in: yearVariants } },
            { 'academicInfo.academicYear': { $in: yearVariants } },
            // Also allow students with no academic year set (they belong to current year)
            { 'studentDetails.academicYear': { $exists: false } },
            { $and: [
              { 'studentDetails.academic.academicYear': { $exists: false } },
              { 'academicInfo.academicYear': { $exists: false } },
              { 'academicYear': { $exists: false } }
            ]}
          ]
        };
        
        if (studentsMatchQuery.$and) {
          studentsMatchQuery.$and.push(academicYearFilter);
        } else {
          studentsMatchQuery.$and = [academicYearFilter];
        }
      }

      console.log('📋 Students collection query:', JSON.stringify(studentsMatchQuery, null, 2));
      
      const allStudents = await db.collection('students').find(studentsMatchQuery).toArray();
      console.log(`✅ Found ${allStudents.length} students in students collection matching class/section/academic year filters`);
      
      if (allStudents.length === 0) {
        console.log('⚠️ No students found in students collection');
        return { success: true, students: [] };
      }

      // Get student IDs for lookup
      const studentIds = allStudents.map(s => s.userId);
      console.log(`📝 Student IDs to lookup:`, studentIds.slice(0, 5), `... (${studentIds.length} total)`);

      // STEP 2: Fetch results and test details to calculate weightage-based averages
      const resultsMatchQuery = {
        userId: { $in: studentIds },
        subjects: { $exists: true, $ne: [] }
      };

      if (academicYear) {
        resultsMatchQuery.academicYear = academicYear;
      }

      console.log('📊 Results query:', JSON.stringify(resultsMatchQuery, null, 2));
      
      const defaultYear = require('../utils/dateUtils').getDefaultAcademicYear();
      const [studentResultsDocs, classTests, classSubjectsDoc] = await Promise.all([
        db.collection('results').find(resultsMatchQuery).toArray(),
        db.collection('testdetails').find({ className: className, isActive: true }).toArray(),
        db.collection('classsubjects').findOne({
          className: className,
          section: section || 'A',
          academicYear: academicYear || defaultYear,
          isActive: true
        })
      ]);

      const expectedSubjects = classSubjectsDoc?.subjects?.filter(s => s.isActive).map(s => s.name) || [];
      
      const studentResults = studentResultsDocs.map(doc => {
        let weightedPercentSum = 0;
        let totalWeight = 0;
        let isComplete = true;

        if (classTests.length === 0 || expectedSubjects.length === 0) {
          isComplete = false;
        } else {
          for (const test of classTests) {
            const testName = test.name || test.testName;
            let testObtained = 0;
            let testMax = 0;
            let testHasMarks = true;

            for (const subjectName of expectedSubjects) {
              const match = doc.subjects?.find(s => 
                cleanTestName(s.testType) === cleanTestName(testName) && 
                s.subjectName === subjectName
              );

              if (!match || match.obtainedMarks === null || match.obtainedMarks === undefined) {
                testHasMarks = false;
                break;
              } else {
                testObtained += Number(match.obtainedMarks);
                testMax += Number(match.maxMarks || match.totalMarks || test.maxMarks || 100);
              }
            }

            if (!testHasMarks) {
              isComplete = false;
              break;
            }

            const testPercent = testMax > 0 ? (testObtained / testMax) * 100 : 0;
            const weight = Number(test.weightage || 0);
            weightedPercentSum += testPercent * (weight / 100);
            totalWeight += weight;
          }
        }

        let finalStudentPercent = null;
        if (isComplete && totalWeight > 0) {
          finalStudentPercent = Math.round(weightedPercentSum * 100) / 100;
        }

        return {
          studentId: doc.userId || doc.studentId?.toString(),
          dbId: doc.studentId?.toString() || doc.userId,
          avgMarks: finalStudentPercent
        };
      });
      
      console.log(`✅ Found results for ${studentResults.length} students`);

      // STEP 3: Fetch attendance for these students
      const attendanceMatchQuery = {
        schoolCode: schoolCode,
        documentType: 'session_attendance',
        'students.studentId': { $in: studentIds }
      };

      if (academicYear) {
        attendanceMatchQuery.academicYear = academicYear;
      }

      console.log('👥 Attendance query:', JSON.stringify(attendanceMatchQuery, null, 2));

      const studentAttendance = await db.collection('attendances').aggregate([
        { $match: attendanceMatchQuery },
        { $unwind: '$students' },
        { $match: { 'students.studentId': { $in: studentIds } } },
        {
          $group: {
            _id: '$students.studentId',
            totalSessions: { $sum: 1 },
            presentSessions: {
              $sum: {
                $cond: [
                  { $eq: ['$students.status', 'present'] },
                  1,
                  0
                ]
              }
            },
            halfDaySessions: {
              $sum: {
                $cond: [
                  { $eq: ['$students.status', 'half_day'] },
                  0.5,
                  0
                ]
              }
            }
          }
        },
        {
          $project: {
            _id: 0,
            studentId: '$_id',
            attendancePercentage: {
              $round: [
                {
                  $multiply: [
                    {
                      $divide: [
                        { $add: ['$presentSessions', '$halfDaySessions'] },
                        '$totalSessions'
                      ]
                    },
                    100
                  ]
                },
                2
              ]
            }
          }
        }
      ]).toArray();

      console.log(`✅ Found attendance for ${studentAttendance.length} students`);
      console.log(`📊 [DEBUG] Total students returned: ${allStudents.length}`);
      
      // STEP 4: Create lookup maps
      const resultsMap = new Map();
      studentResults.forEach(result => {
        if (result.studentId) resultsMap.set(result.studentId, result.avgMarks);
        if (result.dbId) resultsMap.set(result.dbId, result.avgMarks);
      });

      const attendanceMap = new Map();
      studentAttendance.forEach(att => {
        attendanceMap.set(att.studentId, att.attendancePercentage);
      });

      // STEP 5: Extract student names consistently - match frontend logic
      const studentsArray = [];
      allStudents.forEach(student => {
        // Extract name using same priority as elsewhere in the codebase
        let studentName = 'Unknown';
        
        if (student.name?.displayName) {
          studentName = student.name.displayName;
        } else if (student.name?.firstName && student.name?.lastName) {
          studentName = `${student.name.firstName} ${student.name.lastName}`;
        } else if (student.name?.firstName) {
          studentName = student.name.firstName;
        } else if (student.name?.lastName) {
          studentName = student.name.lastName;
        } else if (typeof student.name === 'string') {
          studentName = student.name;
        }
        
        // Debug: Log first few students' extracted details
        if (studentsArray.length < 5) {
          console.log(`📝 Student: ${studentName} (ID: ${student.userId}), Class: ${className}, Section: ${section}`);
        }
        
        let avgMarksVal = null;
        if (resultsMap.has(student.userId)) {
          avgMarksVal = resultsMap.get(student.userId);
        } else if (resultsMap.has(student._id.toString())) {
          avgMarksVal = resultsMap.get(student._id.toString());
        }

        studentsArray.push({
          studentId: student.userId,
          dbId: student._id.toString(),
          studentName: studentName,
          avgMarks: avgMarksVal,
          avgAttendance: attendanceMap.get(student.userId) || attendanceMap.get(student._id.toString()) || 0
        });
      });
      
      const students = studentsArray;

      console.log(`✅ Returning ${students.length} students with enriched data`);
          
      return {
        success: true,
        students: students.sort((a, b) => a.studentName.localeCompare(b.studentName))
      };
      
    } catch (error) {
      console.error('❌ [getStudentsByClassSection] Error:', error);
      throw error;
    }
  }
}

module.exports = new ReportService();