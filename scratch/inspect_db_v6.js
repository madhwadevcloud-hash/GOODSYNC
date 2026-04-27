const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://ERP:ERP@consultancy.baiim7n.mongodb.net/?appName=consultancy";

const inspect = async () => {
  try {
    const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
    const db = conn.useDb('consultancy'); // Main DB name from URI
    
    console.log('--- MAIN DB CLASSES ---');
    const classes = await db.collection('classes').find({ schoolCode: 'R' }).toArray();
    console.log('Count:', classes.length);
    if (classes.length > 0) console.log(JSON.stringify(classes[0], null, 2));
    
    console.log('--- MAIN DB TESTS ---');
    const tests = await db.collection('testdetails').find({ schoolCode: 'R' }).toArray();
    console.log('Count:', tests.length);
    if (tests.length > 0) console.log(JSON.stringify(tests[0], null, 2));

    await conn.close();
  } catch (err) {
    console.error('Error:', err);
  }
};

inspect();
