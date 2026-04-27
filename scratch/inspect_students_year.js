const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://ERP:ERP@consultancy.baiim7n.mongodb.net/?appName=consultancy";

async function inspectStudents() {
  try {
    const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
    const db = conn.useDb('school_r');
    
    const students = await db.collection('students').find({}).toArray();
    console.log(`Total students in school_r: ${students.length}`);
    
    if (students.length > 0) {
      console.log('Sample student academic details:');
      students.slice(0, 5).forEach(s => {
        console.log({
          userId: s.userId,
          name: s.name?.displayName,
          academic: s.studentDetails?.academic,
          academicYear: s.academicYear || s.studentDetails?.academicYear
        });
      });
      
      const years = [...new Set(students.map(s => s.studentDetails?.academic?.academicYear || s.academicYear))];
      console.log('Unique academic years found:', years);
    }
    
    await conn.close();
  } catch (err) {
    console.error('Error:', err);
  }
}

inspectStudents();
