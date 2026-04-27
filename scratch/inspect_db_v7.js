const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://ERP:ERP@consultancy.baiim7n.mongodb.net/?appName=consultancy";

const inspect = async () => {
  try {
    const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
    const db = conn.useDb('consultancy');
    
    console.log('--- TEST SAMPLE FROM CONSULTANCY DB ---');
    const test = await db.collection('testdetails').findOne({ schoolCode: '567' });
    console.log(JSON.stringify(test, null, 2));

    await conn.close();
  } catch (err) {
    console.error('Error:', err);
  }
};

inspect();
