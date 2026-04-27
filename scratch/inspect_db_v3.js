const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://ERP:ERP@consultancy.baiim7n.mongodb.net/?appName=consultancy";

const inspect = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection;
    console.log('Connected.');
    
    // Check schools
    const schools = await db.collection('schools').find({}).toArray();
    console.log('Schools:', schools.map(s => ({ name: s.name, code: s.code })));
    
    // Check classsubjects in main DB
    const classsubjects = await db.collection('classsubjects').find({}).toArray();
    console.log('Class Subjects (Main DB) count:', classsubjects.length);
    if (classsubjects.length > 0) {
      console.log('Sample Class Subject:', {
        schoolCode: classsubjects[0].schoolCode,
        className: classsubjects[0].className,
        section: classsubjects[0].section,
        academicYear: classsubjects[0].academicYear
      });
    }
    
    // Check testdetails
    const tests = await db.collection('testdetails').find({}).toArray();
    console.log('Test Details count:', tests.length);
    if (tests.length > 0) {
      console.log('Sample Test:', {
        name: tests[0].name,
        academicYear: tests[0].academicYear,
        schoolCode: tests[0].schoolCode
      });
    }

    await mongoose.disconnect();
    console.log('Disconnected.');
  } catch (err) {
    console.error('Error:', err);
  }
};

inspect();
