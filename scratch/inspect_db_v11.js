const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://ERP:ERP@consultancy.baiim7n.mongodb.net/?appName=consultancy";

const inspect = async () => {
  try {
    const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
    const db = conn.useDb('school_r');
    
    console.log('--- 2024-25 TESTS FROM SCHOOL_R DB ---');
    const tests = await db.collection('testdetails').find({ academicYear: '2024-25' }).toArray();
    console.log(`Found ${tests.length} tests for 2024-25`);
    if (tests.length > 0) {
      console.log(JSON.stringify(tests[0], null, 2));
    }

    await conn.close();
  } catch (err) {
    console.error('Error:', err);
  }
};

inspect();
