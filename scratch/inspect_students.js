const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://ERP:ERP@consultancy.baiim7n.mongodb.net/?appName=consultancy";

const inspect = async () => {
  try {
    const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
    const db = conn.useDb('school_r');
    
    console.log('--- STUDENT SAMPLE FROM SCHOOL_R DB ---');
    const students = await db.collection('students').find({ isActive: true }).limit(5).toArray();
    console.log(JSON.stringify(students.map(s => ({
      name: s.name,
      academicYear: s.studentDetails?.academic?.academicYear || s.academicYear,
      class: s.studentDetails?.academic?.currentClass || s.class,
      section: s.studentDetails?.academic?.currentSection || s.section
    })), null, 2));

    await conn.close();
  } catch (err) {
    console.error('Error:', err);
  }
};

inspect();
