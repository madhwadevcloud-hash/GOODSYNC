const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/erp_system', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Fix schools with stringified settings
const fixSchoolSettings = async () => {
  try {
    console.log('🔍 Searching for schools with stringified settings...');
    
    // Get the raw collection to access documents without schema validation
    const db = mongoose.connection.db;
    const schoolsCollection = db.collection('schools');
    
    // Find all schools
    const schools = await schoolsCollection.find({}).toArray();
    console.log(`📊 Found ${schools.length} schools in total`);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const school of schools) {
      try {
        let needsUpdate = false;
        const updates = {};
        
        // Check if settings is a string
        if (typeof school.settings === 'string') {
          console.log(`🔧 School "${school.name}" (${school.code}) has stringified settings`);
          try {
            updates.settings = JSON.parse(school.settings);
            needsUpdate = true;
            console.log(`   ✓ Parsed settings successfully`);
          } catch (parseError) {
            console.error(`   ✗ Failed to parse settings:`, parseError.message);
            // Set default settings if parsing fails
            updates.settings = {
              academicYear: {
                currentYear: new Date().getFullYear().toString(),
                startDate: new Date(`${new Date().getFullYear()}-04-01`),
                endDate: new Date(`${new Date().getFullYear() + 1}-03-31`)
              },
              classes: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
              sections: ['A', 'B', 'C', 'D'],
              subjects: ['Mathematics', 'Science', 'English', 'Social Studies', 'Hindi'],
              workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
              workingHours: {
                start: '08:00',
                end: '15:00'
              },
              holidays: []
            };
            needsUpdate = true;
            console.log(`   ✓ Set default settings`);
          }
        }
        
        // Check if academicSettings is a string
        if (typeof school.academicSettings === 'string') {
          console.log(`🔧 School "${school.name}" (${school.code}) has stringified academicSettings`);
          try {
            updates.academicSettings = JSON.parse(school.academicSettings);
            needsUpdate = true;
            console.log(`   ✓ Parsed academicSettings successfully`);
          } catch (parseError) {
            console.error(`   ✗ Failed to parse academicSettings:`, parseError.message);
            updates.academicSettings = {
              schoolTypes: [],
              customGradeNames: {},
              gradeLevels: {}
            };
            needsUpdate = true;
            console.log(`   ✓ Set default academicSettings`);
          }
        }
        
        // Update the document if needed
        if (needsUpdate) {
          await schoolsCollection.updateOne(
            { _id: school._id },
            { $set: updates }
          );
          fixedCount++;
          console.log(`✅ Fixed school "${school.name}" (${school.code})`);
        }
      } catch (error) {
        console.error(`❌ Error fixing school "${school.name}" (${school.code}):`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`   Total schools: ${schools.length}`);
    console.log(`   Fixed: ${fixedCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Unchanged: ${schools.length - fixedCount - errorCount}`);
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
};

// Run the migration
const runMigration = async () => {
  try {
    await connectDB();
    await fixSchoolSettings();
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
};

// Execute if run directly
if (require.main === module) {
  runMigration();
}

module.exports = { fixSchoolSettings };
