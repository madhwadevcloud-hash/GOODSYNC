const mongoose = require('mongoose');
require('dotenv').config();

async function checkAcademicYear() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const School = mongoose.model('School', new mongoose.Schema({}, { strict: false }));
    const schools = await School.find({}, { name: 1, code: 1, settings: 1 }).lean();

    console.log('Schools academic year settings:');
    schools.forEach(school => {
      console.log(`- ${school.name} (${school.code}): ${JSON.stringify(school.settings?.academicYear || 'NOT SET')}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkAcademicYear();
