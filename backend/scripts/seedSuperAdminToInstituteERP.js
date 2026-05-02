const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// MongoDB connection string from environment
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/institute_erp';

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
    const plainPassword = process.env.SUPER_ADMIN_PASSWORD;
    if (!plainPassword) {
      throw new Error('SUPER_ADMIN_PASSWORD not set in environment variables');
    }
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const superAdmin = {
      userId: 'SUPER_ADMIN_001', // Add unique userId for superadmin
      email: process.env.SUPER_ADMIN_EMAIL,
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
