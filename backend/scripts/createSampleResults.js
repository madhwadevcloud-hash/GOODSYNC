const mongoose = require('mongoose');
const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');

async function createSampleResults() {
  try {
    // Connect to school database
    const schoolCode = 'AB';
    const schoolConn = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const resultsCollection = schoolConn.collection('results');
    
    // Sample results for student AB-S-0006
    const sampleResults = [
      {
        _id: new mongoose.Types.ObjectId(),
        studentId: 'AB-S-0006',
        userId: 'AB-S-0006',
        schoolCode: 'AB',
        class: '7',
        section: 'C',
        academicYear: '2025',
        term: 'Mid Term Examination',
        examType: 'Mid Term Examination',
        subjects: [
          {
            name: 'Mathematics',
            subjectName: 'Mathematics',
            totalMarks: 85,
            maxMarks: 100,
            percentage: 85.0,
            grade: 'A'
          },
          {
            name: 'Science',
            subjectName: 'Science', 
            totalMarks: 78,
            maxMarks: 100,
            percentage: 78.0,
            grade: 'B+'
          },
          {
            name: 'English',
            subjectName: 'English',
            totalMarks: 92,
            maxMarks: 100,
            percentage: 92.0,
            grade: 'A+'
          },
          {
            name: 'Social Studies',
            subjectName: 'Social Studies',
            totalMarks: 80,
            maxMarks: 100,
            percentage: 80.0,
            grade: 'A'
          }
        ],
        totalMarks: 335,
        maxMarks: 400,
        percentage: 83.75,
        grade: 'A',
        rank: 5,
        totalStudents: 25,
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new mongoose.Types.ObjectId(),
        studentId: 'AB-S-0006',
        userId: 'AB-S-0006',
        schoolCode: 'AB',
        class: '7',
        section: 'C',
        academicYear: '2025',
        term: 'Unit Test 1',
        examType: 'Unit Test 1',
        subjects: [
          {
            name: 'Mathematics',
            subjectName: 'Mathematics',
            totalMarks: 42,
            maxMarks: 50,
            percentage: 84.0,
            grade: 'A'
          },
          {
            name: 'Science',
            subjectName: 'Science',
            totalMarks: 38,
            maxMarks: 50,
            percentage: 76.0,
            grade: 'B+'
          },
          {
            name: 'English',
            subjectName: 'English',
            totalMarks: 45,
            maxMarks: 50,
            percentage: 90.0,
            grade: 'A+'
          }
        ],
        totalMarks: 125,
        maxMarks: 150,
        percentage: 83.33,
        grade: 'A',
        rank: 3,
        totalStudents: 25,
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Insert sample results
    await resultsCollection.insertMany(sampleResults);
    console.log(`✅ Created ${sampleResults.length} sample results for student AB-S-0006`);
    
    // Verify insertion
    const count = await resultsCollection.countDocuments({ studentId: 'AB-S-0006' });
    console.log(`📊 Total results for AB-S-0006: ${count}`);
    
    return sampleResults;
  } catch (error) {
    console.error('❌ Error creating sample results:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createSampleResults()
    .then(() => {
      console.log('✅ Sample results creation completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to create sample results:', error);
      process.exit(1);
    });
}

module.exports = createSampleResults;
