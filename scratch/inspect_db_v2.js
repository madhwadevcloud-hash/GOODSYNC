const mongoose = require('mongoose');
require('dotenv').config();

const inspect = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection;
    
    // Check schools
    const schools = await db.collection('schools').find({}).toArray();
    console.log('Schools:', schools.map(s => ({ name: s.name, code: s.code })));
    
    // Check classsubjects in one of the school DBs or main DB
    // Let's check main DB first
    const classsubjects = await db.collection('classsubjects').find({}).toArray();
    console.log('Class Subjects (Main DB) count:', classsubjects.length);
    if (classsubjects.length > 0) {
      console.log('Sample Class Subject schoolCode:', classsubjects[0].schoolCode);
      console.log('Sample Class Subject academicYear:', classsubjects[0].academicYear);
    }
    
    // Check testdetails
    const tests = await db.collection('testdetails').find({}).toArray();
    console.log('Test Details count:', tests.length);
    if (tests.length > 0) {
      console.log('Sample Test academicYear:', tests[0].academicYear);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
};

inspect();
