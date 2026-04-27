const mongoose = require('mongoose');
require('dotenv').config();

async function inspectData() {
  const uri = process.env.MONGODB_URI;
  const client = await mongoose.connect(uri);
  const schoolR = client.connection.useDb('school_r');

  // Check admins collection
  const admins = await schoolR.collection('admins').find({}).toArray();
  console.log('=== ADMINS in school_r ===');
  admins.forEach(a => {
    console.log(`  Name: ${a.name}, Email: ${a.email}, SchoolCode: ${a.schoolCode}, Role: ${a.role}`);
  });

  // Check students collection - first 5
  const students = await schoolR.collection('students').find({}).limit(5).toArray();
  console.log(`\n=== STUDENTS in school_r (first 5 of ${await schoolR.collection('students').countDocuments({})}) ===`);
  students.forEach(s => {
    console.log(`  Name: ${s.name}`);
    console.log(`    class: ${s.class}, section: ${s.section}, academicYear: ${s.academicYear}`);
    console.log(`    studentDetails.class: ${s.studentDetails?.class}, studentDetails.section: ${s.studentDetails?.section}`);
    console.log(`    studentDetails.academicYear: ${s.studentDetails?.academicYear}`);
    console.log(`    studentDetails.academic:`, JSON.stringify(s.studentDetails?.academic));
    console.log(`    academicInfo:`, JSON.stringify(s.academicInfo));
    console.log(`    schoolCode: ${s.schoolCode}`);
  });

  // Check teachers collection
  const teachers = await schoolR.collection('teachers').find({}).toArray();
  console.log(`\n=== TEACHERS in school_r (${teachers.length}) ===`);
  teachers.forEach(t => {
    console.log(`  Name: ${t.name}, Email: ${t.email}, SchoolCode: ${t.schoolCode}`);
  });

  // Also check main DB 'test' - look for admin/superadmin users
  const testDb = client.connection.useDb('test');
  const allMainUsers = await testDb.collection('users').find({}).limit(10).toArray();
  console.log(`\n=== MAIN DB (test) users (first 10 of ${await testDb.collection('users').countDocuments({})}) ===`);
  allMainUsers.forEach(u => {
    console.log(`  Name: ${u.name}, Role: ${u.role}, SchoolCode: ${u.schoolCode}, Email: ${u.email}`);
  });

  // Check superadmins collection
  const superadmins = await testDb.collection('superadmins').find({}).toArray();
  console.log(`\n=== SUPERADMINS in main DB (${superadmins.length}) ===`);
  superadmins.forEach(s => {
    console.log(`  Name: ${s.name}, Email: ${s.email}, SchoolCode: ${s.schoolCode}`);
  });

  await mongoose.disconnect();
}

inspectData().catch(console.error);
