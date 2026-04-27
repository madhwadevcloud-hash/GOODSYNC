const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://ERP:ERP@consultancy.baiim7n.mongodb.net/?appName=consultancy";

const inspect = async () => {
  try {
    const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
    const db = conn.useDb('consultancy');
    
    const collections = await db.listCollections().toArray();
    console.log('Collections in consultancy:', collections.map(c => c.name));
    
    // Check 'superadmintests' or similar
    const testCollections = collections.filter(c => c.name.toLowerCase().includes('test')).map(c => c.name);
    console.log('Test-related collections:', testCollections);

    for (const coll of testCollections) {
      const count = await db.collection(coll).countDocuments({});
      console.log(`${coll} count: ${count}`);
    }

    await conn.close();
  } catch (err) {
    console.error('Error:', err);
  }
};

inspect();
