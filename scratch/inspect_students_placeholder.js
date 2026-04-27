const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://ERP:ERP@consultancy.baiim7n.mongodb.net/?appName=consultancy";

async function inspectStudents() {
  try {
    const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
    const db = conn.useDb('school_r');
    
    const students = await db.collection('students').find({}).toArray();
    console.log(`Total students: ${students.length}`);
    
    const placeholderCount = students.filter(s => s._placeholder === true).length;
    console.log(`Students with _placeholder === true: ${placeholderCount}`);

    const inactiveCount = students.filter(s => s.isActive === false).length;
    console.log(`Students with isActive === false: ${inactiveCount}`);

    if (students.length > 0) {
      console.log('Sample student keys:', Object.keys(students[0]));
      console.log('Sample student _placeholder value:', students[0]._placeholder);
    }
    
    await conn.close();
  } catch (err) {
    console.error('Error:', err);
  }
}

inspectStudents();
