/**
 * Script to populate classsubjects collection with default subjects
 * Run this to initialize subjects for all classes
 */

const mongoose = require('mongoose');
const DatabaseManager = require('../utils/databaseManager');
const ClassSubjectsSimple = require('../models/ClassSubjectsSimple');

// Default subjects for each grade
const defaultSubjectsByGrade = {
  '1': ['English', 'Mathematics', 'Hindi', 'EVS', 'Art & Craft', 'Physical Education'],
  '2': ['English', 'Mathematics', 'Hindi', 'EVS', 'Art & Craft', 'Physical Education'],
  '3': ['English', 'Mathematics', 'Hindi', 'EVS', 'Art & Craft', 'Physical Education'],
  '4': ['English', 'Mathematics', 'Hindi', 'EVS', 'Art & Craft', 'Physical Education'],
  '5': ['English', 'Mathematics', 'Hindi', 'Science', 'Social Studies', 'Art & Craft', 'Physical Education'],
  '6': ['English', 'Mathematics', 'Hindi', 'Science', 'Social Studies', 'Computer Science', 'Physical Education'],
  '7': ['English', 'Mathematics', 'Hindi', 'Science', 'Social Studies', 'Computer Science', 'Physical Education'],
  '8': ['English', 'Mathematics', 'Hindi', 'Science', 'Social Studies', 'Computer Science', 'Physical Education'],
  '9': ['English', 'Mathematics', 'Hindi', 'Science', 'Social Studies', 'Computer Science', 'Physical Education'],
  '10': ['English', 'Mathematics', 'Hindi', 'Science', 'Social Studies', 'Computer Science', 'Physical Education'],
  '11': ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Physical Education'],
  '12': ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Physical Education']
};

async function populateSubjectsForSchool(schoolCode, academicYear = '2024-25') {
  try {
    console.log(`\n📚 Populating subjects for school: ${schoolCode}`);
    
    // Connect to school database
    const schoolConn = await DatabaseManager.getSchoolConnection(schoolCode);
    const SchoolClassSubjects = ClassSubjectsSimple.getModelForConnection(schoolConn);
    
    let totalCreated = 0;
    let totalUpdated = 0;
    
    for (const [grade, subjectNames] of Object.entries(defaultSubjectsByGrade)) {
      const className = grade;
      
      // Check if class already has subjects
      const existing = await SchoolClassSubjects.findOne({
        schoolCode,
        className,
        academicYear,
        isActive: true
      });
      
      if (existing && existing.subjects && existing.subjects.length > 0) {
        console.log(`  ⏭️  Class ${className} already has ${existing.subjects.length} subjects - skipping`);
        continue;
      }
      
      // Create subjects array
      const subjects = subjectNames.map(name => ({
        name,
        subjectCode: name.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
        type: 'core',
        isActive: true,
        addedAt: new Date()
      }));
      
      // Create or update class with subjects
      const result = await SchoolClassSubjects.findOneAndUpdate(
        {
          schoolCode,
          className,
          academicYear
        },
        {
          $setOnInsert: {
            schoolCode,
            className,
            grade: className,
            academicYear,
            isActive: true,
            createdAt: new Date()
          },
          $set: {
            subjects,
            totalSubjects: subjects.length,
            updatedAt: new Date()
          }
        },
        {
          upsert: true,
          new: true
        }
      );
      
      if (result) {
        if (existing) {
          console.log(`  ✅ Updated Class ${className} with ${subjects.length} subjects`);
          totalUpdated++;
        } else {
          console.log(`  ✅ Created Class ${className} with ${subjects.length} subjects`);
          totalCreated++;
        }
      }
    }
    
    console.log(`\n📊 Summary for ${schoolCode}:`);
    console.log(`   Created: ${totalCreated} classes`);
    console.log(`   Updated: ${totalUpdated} classes`);
    console.log(`   Total: ${totalCreated + totalUpdated} classes processed`);
    
    return { created: totalCreated, updated: totalUpdated };
    
  } catch (error) {
    console.error(`❌ Error populating subjects for ${schoolCode}:`, error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    // Connect to main database
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://nitopunk04o:IOilWo4osDam0vmN@erp.ua5qems.mongodb.net/institute_erp?retryWrites=true&w=majority&appName=erp';
    
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get school code from command line or use default
    const schoolCode = process.argv[2] || 'TS';
    const academicYear = process.argv[3] || '2024-25';
    
    console.log(`\n🎯 Target School: ${schoolCode}`);
    console.log(`📅 Academic Year: ${academicYear}`);
    
    // Populate subjects
    await populateSubjectsForSchool(schoolCode, academicYear);
    
    console.log('\n✅ All done!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { populateSubjectsForSchool, defaultSubjectsByGrade };
