const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Try to load .env from current dir or parent
const envPath = fs.existsSync('.env') ? '.env' : '../backend/.env';
require('dotenv').config({ path: envPath });

async function inspectData() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  console.log('Connecting to:', uri);
  
  try {
    const client = await mongoose.connect(uri);
    
    // List all databases to see if school_sb exists
    const admin = client.connection.db.admin();
    const dbs = await admin.listDatabases();
    console.log('\n--- DATABASES ---');
    console.log(dbs.databases.map(db => db.name).filter(name => name.startsWith('school_') || name === 'school_r'));

    const dbName = 'school_sb';
    const db = client.connection.useDb(dbName);
    
    console.log(`\n--- DATA FOR ${dbName} ---`);
    
    console.log('\n--- CLASSES ---');
    const classes = await db.collection('classes').find({}).toArray();
    if (classes.length > 0) {
      console.table(classes.map(c => ({
        _id: c._id,
        className: c.className,
        sections: c.sections?.join(','),
        academicYear: c.academicYear,
        isActive: c.isActive,
        schoolCode: c.schoolCode || c.schoolId
      })));
    } else {
      console.log('No classes found.');
    }

    console.log('\n--- TESTS ---');
    const tests = await db.collection('testdetails').find({}).toArray();
    if (tests.length > 0) {
      console.table(tests.map(t => ({
        _id: t._id,
        name: t.name || t.testName,
        className: t.className,
        academicYear: t.academicYear,
        isActive: t.isActive
      })));
    } else {
      console.log('No tests found.');
    }

    console.log('\n--- STUDENTS (first 5) ---');
    const students = await db.collection('users').find({ role: 'student' }).limit(5).toArray();
    const studentCount = await db.collection('users').countDocuments({ role: 'student' });
    console.log(`Total students: ${studentCount}`);
    
    students.forEach(s => {
      console.log(`- ${s.name}:`);
      console.log(`  Class: ${s.studentDetails?.academic?.currentClass || s.studentDetails?.currentClass || s.studentDetails?.class || s.class}`);
      console.log(`  Section: ${s.studentDetails?.academic?.currentSection || s.studentDetails?.currentSection || s.studentDetails?.section || s.section}`);
      console.log(`  Year: ${s.studentDetails?.academic?.academicYear || s.studentDetails?.academicYear || s.academicYear}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

inspectData();
