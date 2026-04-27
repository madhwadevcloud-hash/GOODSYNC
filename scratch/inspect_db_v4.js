const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://ERP:ERP@consultancy.baiim7n.mongodb.net/?appName=consultancy";
const SCHOOL_DB_NAME = "school_r"; // Based on school code 'R'

const inspect = async () => {
  try {
    console.log('Connecting to MongoDB...');
    const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
    console.log('Connected.');
    
    const schoolDb = conn.useDb(SCHOOL_DB_NAME);
    
    // Check classsubjects in school DB
    const classsubjects = await schoolDb.collection('classsubjects').find({}).toArray();
    console.log(`Class Subjects (${SCHOOL_DB_NAME}) count:`, classsubjects.length);
    if (classsubjects.length > 0) {
      console.log('Sample Class Subject:', {
        schoolCode: classsubjects[0].schoolCode,
        className: classsubjects[0].className,
        section: classsubjects[0].section,
        academicYear: classsubjects[0].academicYear,
        subjectCount: classsubjects[0].subjects ? classsubjects[0].subjects.length : 0
      });
    }

    // Check testdetails in school DB
    const tests = await schoolDb.collection('testdetails').find({}).toArray();
    console.log(`Test Details (${SCHOOL_DB_NAME}) count:`, tests.length);
    if (tests.length > 0) {
      console.log('Sample Test:', {
        name: tests[0].name,
        testName: tests[0].testName,
        academicYear: tests[0].academicYear,
        schoolCode: tests[0].schoolCode
      });
    }

    // Check classes in school DB
    const classes = await schoolDb.collection('classes').find({}).toArray();
    console.log(`Classes (${SCHOOL_DB_NAME}) count:`, classes.length);
    if (classes.length > 0) {
      console.log('Sample Class:', {
        className: classes[0].className,
        academicYear: classes[0].academicYear
      });
    }

    await conn.close();
    console.log('Disconnected.');
  } catch (err) {
    console.error('Error:', err);
  }
};

inspect();
