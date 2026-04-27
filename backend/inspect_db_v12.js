const mongoose = require('mongoose');
require('dotenv').config();

async function inspectData() {
  const uri = process.env.MONGODB_URI;
  console.log('Connecting...');
  
  const client = await mongoose.connect(uri);
  const defaultDb = client.connection.db;
  
  // 1. What's the default DB name?
  console.log('Default DB name:', defaultDb.databaseName);
  
  // 2. List all collections in default DB
  const collections = await defaultDb.listCollections().toArray();
  console.log('\nCollections in default DB:', collections.map(c => c.name));
  
  // 3. Check 'schools' collection directly
  const schoolsDirect = await defaultDb.collection('schools').find({}).toArray();
  console.log(`\nSchools in default DB (direct): ${schoolsDirect.length}`);
  schoolsDirect.forEach(s => {
    console.log(`  Code: "${s.code}", Name: "${s.name}", ID: ${s._id}`);
    console.log(`  Settings.academicYear:`, JSON.stringify(s.settings?.academicYear));
  });

  // 4. Also check institute_erp DB explicitly
  const erpDb = client.connection.useDb('institute_erp');
  const erpSchools = await erpDb.collection('schools').find({}).toArray();
  console.log(`\nSchools in institute_erp: ${erpSchools.length}`);
  erpSchools.forEach(s => {
    console.log(`  Code: "${s.code}", Name: "${s.name}", ID: ${s._id}`);
    console.log(`  Settings.academicYear:`, JSON.stringify(s.settings?.academicYear));
  });

  // 5. Check consultancy DB  
  const consultDb = client.connection.useDb('consultancy');
  try {
    const consultSchools = await consultDb.collection('schools').find({}).toArray();
    console.log(`\nSchools in consultancy: ${consultSchools.length}`);
    consultSchools.forEach(s => {
      console.log(`  Code: "${s.code}", Name: "${s.name}", ID: ${s._id}`);
      console.log(`  Settings.academicYear:`, JSON.stringify(s.settings?.academicYear));
    });
  } catch(e) { console.log('consultancy DB error:', e.message); }

  // 6. Check what school code admin users have in school_r
  const schoolR = client.connection.useDb('school_r');
  const allUsers = await schoolR.collection('users').find({}).limit(5).toArray();
  console.log('\nFirst 5 users in school_r:');
  allUsers.forEach(u => {
    console.log(`  Name: ${u.name}, Role: ${u.role}, SchoolCode: "${u.schoolCode}", Email: ${u.email}`);
  });

  await mongoose.disconnect();
  console.log('\nDone.');
}

inspectData().catch(console.error);
