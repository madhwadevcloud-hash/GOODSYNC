const mongoose = require('mongoose');

// MongoDB connection string
const MONGODB_URI = 'mongodb+srv://nitopunk04o:IOilWo4osDam0vmN@erp.ua5qems.mongodb.net/institute_erp?retryWrites=true&w=majority&appName=erp';

async function fixNullUserIds() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Find users with null userId
    console.log('🔍 Checking for users with null userId...');
    const usersWithNullUserId = await usersCollection.find({ userId: null }).toArray();
    console.log(`Found ${usersWithNullUserId.length} users with null userId`);

    if (usersWithNullUserId.length > 0) {
      console.log('Sample users with null userId:');
      usersWithNullUserId.slice(0, 3).forEach(user => {
        console.log(`  - [EMAIL_HIDDEN] (${user.role}) - ID: ${user._id}`);
      });

      // Remove users with null userId (these are incomplete records)
      console.log('🗑️  Removing users with null userId...');
      const deleteResult = await usersCollection.deleteMany({ userId: null });
      console.log(`✅ Deleted ${deleteResult.deletedCount} users with null userId`);
    }

    console.log('🔍 Checking remaining users...');
    const remainingUsers = await usersCollection.find({}).toArray();
    console.log(`Remaining users in database: ${remainingUsers.length}`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixNullUserIds();
