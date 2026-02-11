const mongoose = require('mongoose');

// MongoDB connection string
const MONGODB_URI = 'mongodb+srv://nitopunk04o:IOilWo4osDam0vmN@erp.ua5qems.mongodb.net/institute_erp?retryWrites=true&w=majority&appName=erp';

async function initializeDatabase() {
  try {
    console.log('🌱 Connecting to MongoDB...');
    const connection = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    const db = connection.connection.db;

    // Create collections
    const collections = [
      'admissions',
      'assignments',
      'attendances',
      'classes',
      'results',
      'schools',
      'subjects',
      'timetables',
      'users',
    ];

    for (const collection of collections) {
      const exists = await db.listCollections({ name: collection }).hasNext();
      if (!exists) {
        await db.createCollection(collection);
        console.log(`✅ Created collection: ${collection}`);
      } else {
        console.log(`ℹ️ Collection already exists: ${collection}`);
      }
    }

    console.log('✅ Database initialization complete');
    await connection.disconnect();
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();
