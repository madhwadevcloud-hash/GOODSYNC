const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://ERP:ERP@consultancy.baiim7n.mongodb.net/?appName=consultancy";
const SCHOOL_DB_NAME = "school_r";

const inspect = async () => {
  try {
    const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
    const schoolDb = conn.useDb(SCHOOL_DB_NAME);
    
    console.log('--- TEST SAMPLE ---');
    const test = await schoolDb.collection('testdetails').findOne({});
    console.log(JSON.stringify(test, null, 2));
    
    console.log('--- CLASS SAMPLE ---');
    const cls = await schoolDb.collection('classes').findOne({});
    console.log(JSON.stringify(cls, null, 2));

    await conn.close();
  } catch (err) {
    console.error('Error:', err);
  }
};

inspect();
