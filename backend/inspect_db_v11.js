const mongoose = require('mongoose');
require('dotenv').config();

async function inspectData() {
  const uri = process.env.MONGODB_URI;
  console.log('Connecting...');
  
  const client = await mongoose.connect(uri);
  
  // 1. Check the main DB for schools
  const mainDb = client.connection.useDb('institute_erp');
  const schools = await mainDb.collection('schools').find({}).toArray();
  console.log('\n=== SCHOOLS IN MAIN DB ===');
  schools.forEach(s => {
    console.log(`  Code: "${s.code}", Name: "${s.name}", ID: ${s._id}`);
  });

  // 2. Check each school_* database for classes
  const schoolDbs = ['school_r', 'school_gdsnk', 'school_gdsynk', 'school_12345', 'school_125', 'school_567', 'school_abc', 'school_xyz'];
  
  for (const dbName of schoolDbs) {
    const db = client.connection.useDb(dbName);
    const classCount = await db.collection('classes').countDocuments({});
    const studentCount = await db.collection('users').countDocuments({ role: 'student' });
    const testCount = await db.collection('testdetails').countDocuments({});
    
    if (classCount > 0 || studentCount > 0) {
      console.log(`\n=== ${dbName} ===`);
      console.log(`  Classes: ${classCount}, Students: ${studentCount}, Tests: ${testCount}`);
      
      // Show class details
      const classes = await db.collection('classes').find({}).toArray();
      classes.forEach(c => {
        console.log(`  Class: "${c.className}", Sections: ${c.sections?.join(',')}, Year: "${c.academicYear}", Active: ${c.isActive}, schoolCode: "${c.schoolCode}", schoolId: "${c.schoolId}"`);
      });
      
      // Show a sample student
      const student = await db.collection('users').findOne({ role: 'student' });
      if (student) {
        console.log(`  Sample Student: ${student.name}`);
        console.log(`    class: ${student.class}, section: ${student.section}`);
        console.log(`    academicYear: ${student.academicYear}`);
        console.log(`    studentDetails.class: ${student.studentDetails?.class}`);
        console.log(`    studentDetails.section: ${student.studentDetails?.section}`);
        console.log(`    studentDetails.academicYear: ${student.studentDetails?.academicYear}`);
        console.log(`    studentDetails.academic:`, JSON.stringify(student.studentDetails?.academic));
        console.log(`    academicInfo:`, JSON.stringify(student.academicInfo));
      }
    }
  }

  // 3. Check admin users to see what schoolCode they use
  console.log('\n=== ADMIN USERS ===');
  for (const dbName of schoolDbs) {
    const db = client.connection.useDb(dbName);
    const admins = await db.collection('users').find({ role: 'admin' }).toArray();
    admins.forEach(a => {
      console.log(`  [${dbName}] Admin: ${a.name}, schoolCode: "${a.schoolCode}", email: ${a.email}`);
    });
  }
  
  // Also check main DB for admin users
  const mainAdmins = await mainDb.collection('users').find({ role: 'admin' }).toArray();
  mainAdmins.forEach(a => {
    console.log(`  [institute_erp] Admin: ${a.name}, schoolCode: "${a.schoolCode}", email: ${a.email}`);
  });

  await mongoose.disconnect();
  console.log('\nDone.');
}

inspectData().catch(console.error);
