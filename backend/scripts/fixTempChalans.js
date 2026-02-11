require('dotenv').config();
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const School = require('../models/School');
const Counter = require('../models/Counter');

async function fixTempChalans() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Get all chalans with TEMP in their number
    const db = mongoose.connection.db;
    const tempChalans = await db.collection('chalans').find({
      chalanNumber: { $regex: /TEMP$/ }
    }).toArray();

    console.log(`Found ${tempChalans.length} chalans with TEMP numbers`);

    // Process each temp chalan
    for (const chalan of tempChalans) {
      try {
        const school = await School.findById(chalan.schoolId);
        if (!school) {
          console.warn(`School not found for chalan ${chalan._id}, skipping...`);
          continue;
        }

        const schoolCode = school.code || school.schoolCode || 'SCH';
        const chalanDate = chalan.createdAt || new Date();
        const year = chalanDate.getFullYear();
        const month = String(chalanDate.getMonth() + 1).padStart(2, '0');
        const yearMonth = `${year}${month}`;
        const counterName = `chalan_${schoolCode}_${yearMonth}`;

        // Initialize counter if it doesn't exist
        let counter = await Counter.findOne({ _id: counterName });
        if (!counter) {
          counter = await Counter.create({ _id: counterName, seq: 0 });
          console.log(`✅ Created new counter: ${counterName}`);
        }

        // Get next sequence number
        const nextSeq = await Counter.getNextSequence(counterName);
        const sequenceStr = nextSeq.toString().padStart(4, '0');
        const newChalanNumber = `${schoolCode}-${yearMonth}-${sequenceStr}`;

        // Update the chalan
        await db.collection('chalans').updateOne(
          { _id: chalan._id },
          { $set: { chalanNumber: newChalanNumber } }
        );

        console.log(`✅ Updated chalan ${chalan._id}: ${chalan.chalanNumber} -> ${newChalanNumber}`);
      } catch (error) {
        console.error(`❌ Error processing chalan ${chalan._id}:`, error.message);
      }
    }

    console.log('✅ All TEMP chalans have been processed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
fixTempChalans();
