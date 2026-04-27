const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  const uri = process.env.MONGODB_URI;
  const client = await mongoose.connect(uri);
  
  const school_r = client.connection.useDb('school_r');
  const classes = await school_r.collection('classes').find({}).toArray();
  
  console.log('--- CLASSES in school_r ---');
  classes.slice(0, 3).forEach(c => {
    console.log(`Class: ${c.className}, schoolCode: "${c.schoolCode}", schoolId: "${c.schoolId}", type of schoolId: ${typeof c.schoolId}`);
    if (c.schoolId && c.schoolId._bsontype) console.log('  schoolId is ObjectId');
  });

  const schools = await client.connection.db.collection('schools').find({code: 'R'}).toArray();
  console.log('\n--- School R ---');
  schools.forEach(s => {
    console.log(`ID: ${s._id}, Code: ${s.code}`);
  });

  await mongoose.disconnect();
}

check().catch(console.error);
