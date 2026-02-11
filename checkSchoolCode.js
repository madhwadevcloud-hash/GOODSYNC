const mongoose = require('mongoose');
const School = require('./backend/models/School');

async function checkSchoolCode() {
  try {
    await mongoose.connect('mongodb://localhost:27017/erp');
    console.log('Connected to MongoDB');
    
    // Find all schools
    const schools = await School.find({}).select('code name _id').lean();
    console.log('Found schools:', JSON.stringify(schools, null, 2));
    
    if (schools.length === 0) {
      console.log('No schools found in the database.');
    } else {
      console.log(`Found ${schools.length} schools. First school code: ${schools[0].code}`);
    }
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error checking school code:', error);
    process.exit(1);
  }
}

checkSchoolCode();
