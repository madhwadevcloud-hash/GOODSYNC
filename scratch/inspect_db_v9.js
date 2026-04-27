const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://ERP:ERP@consultancy.baiim7n.mongodb.net/?appName=consultancy";

const inspect = async () => {
  try {
    const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
    const db = conn.useDb('test');
    
    console.log('--- ALL TESTS FROM TEST DB ---');
    const tests = await db.collection('testdetails').find({}).toArray();
    console.log(JSON.stringify(tests, null, 2));

    await conn.close();
  } catch (err) {
    console.error('Error:', err);
  }
};

inspect();
