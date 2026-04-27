const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://ERP:ERP@consultancy.baiim7n.mongodb.net/?appName=consultancy";

async function inspectSubjects() {
  try {
    const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
    const db = conn.useDb('school_r');
    
    // Check classsubjects collection
    const subjects = await db.collection('classsubjects').find({ academicYear: '2025-26' }).toArray();
    console.log(`Subjects for 2025-26: ${subjects.length}`);
    if (subjects.length > 0) {
        console.log('Sample subject document:', JSON.stringify(subjects[0], null, 2));
    }

    // Also check classes collection to see if they are linked
    const classes = await db.collection('classes').find({ academicYear: '2025-26' }).toArray();
    console.log(`Classes for 2025-26: ${classes.length}`);
    if (classes.length > 0) {
        console.log('Sample class document:', JSON.stringify(classes[0], null, 2));
    }
    
    await conn.close();
  } catch (err) {
    console.error('Error:', err);
  }
}

inspectSubjects();
