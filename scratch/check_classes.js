const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  const uri = process.env.MONGODB_URI;
  const client = await mongoose.connect(uri);
  const db = client.connection.db;
  
  const schools = await db.collection('schools').find({}).toArray();
  console.log('--- SCHOOLS ---');
  schools.forEach(s => {
    console.log(`Code: "${s.code}", Name: "${s.name}"`);
  });

  const school_r = client.connection.useDb('school_r');
  const classes = await school_r.collection('classes').find({}).toArray();
  console.log('\n--- CLASSES in school_r ---');
  console.log('Count:', classes.length);
  classes.slice(0, 5).forEach(c => {
    console.log(`Class: ${c.className}, Year: ${c.academicYear}`);
  });

  await mongoose.disconnect();
}

check().catch(console.error);
