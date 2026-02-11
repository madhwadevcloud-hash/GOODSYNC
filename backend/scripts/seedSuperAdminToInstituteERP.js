const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// MongoDB connection string
const MONGODB_URI = 'mongodb+srv://nitopunk04o:IOilWo4osDam0vmN@erp.ua5qems.mongodb.net/institute_erp?retryWrites=true&w=majority&appName=erp';

async function seedSuperAdmin() {
  try {
    console.log('🌱 Connecting to MongoDB...');
    const connection = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    const db = connection.connection.db;
    const usersCollection = db.collection('users');

    console.log('🗑️ Removing existing superadmin users...');
    await usersCollection.deleteMany({ role: 'superadmin' });

    console.log('🔐 Inserting superadmin user...');
    const hashedPassword = await bcrypt.hash('super123', 10);
    const superAdmin = {
      userId: 'SUPER_ADMIN_001', // Add unique userId for superadmin
      email: 'super@erp.com',
      password: hashedPassword,
      role: 'superadmin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await usersCollection.insertOne(superAdmin);
    console.log('✅ Superadmin user seeded successfully');
    await connection.disconnect();
  } catch (error) {
    console.error('❌ Error seeding superadmin:', error);
    process.exit(1);
  }
}

seedSuperAdmin();
