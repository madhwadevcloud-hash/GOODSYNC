const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://ERP:ERP@consultancy.baiim7n.mongodb.net/?appName=consultancy";

const inspect = async () => {
  try {
    const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
    
    // Check the main 'test' DB for School model (how the school R is stored)
    const mainDb = conn.useDb('test');
    const school = await mainDb.collection('schools').findOne({ code: { $regex: /^r$/i } });
    
    console.log('School R settings:');
    console.log(JSON.stringify(school?.settings?.academicYear, null, 2));
    console.log('School R code:', school?.code);
    
    await conn.close();
  } catch (err) {
    console.error('Error:', err);
  }
};

inspect();
