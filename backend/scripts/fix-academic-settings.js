const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
      throw new Error('MONGODB_URI or MONGO_URI environment variable is not set');
    }
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const fixAcademicSettings = async () => {
  try {
    await connectDB();
    
    const School = mongoose.connection.collection('schools');
    
    // Find all schools
    const schools = await School.find({}).toArray();
    console.log(`Found ${schools.length} schools to check`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const school of schools) {
      let needsUpdate = false;
      const updates = {};
      
      // Check if academicSettings exists and is invalid
      if (school.academicSettings) {
        const academicSettings = school.academicSettings;
        
        // Check if it's a string (invalid)
        if (typeof academicSettings === 'string') {
          console.log(`\n🔧 Fixing school: ${school.name} (${school.code})`);
          console.log(`   Current academicSettings: ${academicSettings}`);
          
          // Replace with proper structure
          updates.academicSettings = {
            schoolTypes: [],
            customGradeNames: {},
            gradeLevels: {}
          };
          needsUpdate = true;
        }
        // Check if customGradeNames is invalid
        else if (academicSettings.customGradeNames && typeof academicSettings.customGradeNames === 'string') {
          console.log(`\n🔧 Fixing customGradeNames for school: ${school.name} (${school.code})`);
          console.log(`   Current customGradeNames: ${academicSettings.customGradeNames}`);
          
          updates['academicSettings.customGradeNames'] = {};
          needsUpdate = true;
        }
        // Check if gradeLevels is invalid
        else if (academicSettings.gradeLevels && typeof academicSettings.gradeLevels === 'string') {
          console.log(`\n🔧 Fixing gradeLevels for school: ${school.name} (${school.code})`);
          console.log(`   Current gradeLevels: ${academicSettings.gradeLevels}`);
          
          updates['academicSettings.gradeLevels'] = {};
          needsUpdate = true;
        }
      }
      
      // Check if settings exists and is invalid
      if (school.settings && typeof school.settings === 'string') {
        console.log(`\n🔧 Fixing settings for school: ${school.name} (${school.code})`);
        console.log(`   Current settings: ${school.settings}`);
        
        // Replace with proper structure
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
      }
      
      if (needsUpdate) {
        await School.updateOne(
          { _id: school._id },
          { $set: updates }
        );
        console.log(`   ✅ Fixed school: ${school.name}`);
        fixedCount++;
      } else {
        skippedCount++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Fixed: ${fixedCount} schools`);
    console.log(`   Skipped: ${skippedCount} schools (already valid)`);
    console.log(`   Total: ${schools.length} schools`);
    
  } catch (error) {
    console.error('❌ Error fixing academic settings:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
};

// Run the fix
fixAcademicSettings();
