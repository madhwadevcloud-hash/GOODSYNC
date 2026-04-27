const mongoose = require('mongoose');
require('dotenv').config();

async function inspectData() {
  const uri = process.env.MONGODB_URI;
  const client = await mongoose.connect(uri);

  // Check school_r users
  const schoolR = client.connection.useDb('school_r');
  const colls = await schoolR.db.listCollections().toArray();
  console.log('Collections in school_r:', colls.map(c => c.name));

  for (const coll of colls) {
    const count = await schoolR.collection(coll.name).countDocuments({});
    if (count > 0) {
      console.log(`  ${coll.name}: ${count} docs`);
    }
  }
  
  // Check users specifically
  const users = await schoolR.collection('users').find({}).toArray();
  console.log(`\nUsers in school_r: ${users.length}`);
  users.forEach(u => {
    console.log(`  ${u.name} | role: ${u.role} | schoolCode: ${u.schoolCode} | class: ${u.studentDetails?.class || u.class || '-'} | section: ${u.studentDetails?.section || u.section || '-'} | year: ${u.studentDetails?.academicYear || u.academicYear || '-'}`);
  });

  // Check the main 'test' DB users for admin
  const testDb = client.connection.useDb('test');
  const mainUsers = await testDb.collection('users').find({ role: { $in: ['admin', 'superadmin'] }}).toArray();
  console.log(`\nAdmin/SuperAdmin users in main DB: ${mainUsers.length}`);
  mainUsers.forEach(u => {
    console.log(`  ${u.name} | role: ${u.role} | schoolCode: ${u.schoolCode} | email: ${u.email}`);
  });

  // Also check GDSNK school users
  const schoolGdsnk = client.connection.useDb('school_gdsnk');
  const gdsnkUsers = await schoolGdsnk.collection('users').find({}).toArray();
  console.log(`\nUsers in school_gdsnk: ${gdsnkUsers.length}`);
  gdsnkUsers.forEach(u => {
    console.log(`  ${u.name} | role: ${u.role} | schoolCode: ${u.schoolCode}`);
  });

  await mongoose.disconnect();
}

inspectData().catch(console.error);
