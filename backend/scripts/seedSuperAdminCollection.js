const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const SuperAdmin = require('../models/SuperAdmin');
require('dotenv').config();

// MongoDB connection string from environment
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/institute_erp';

async function seedSuperAdmin() {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🗑️ Removing existing superadmin users from SuperAdmin collection...');
    await SuperAdmin.deleteMany({});

    console.log('🔐 Creating new superadmin user...');
    const plainPassword = process.env.SUPER_ADMIN_PASSWORD;
    if (!plainPassword) {
      throw new Error('SUPER_ADMIN_PASSWORD not set in environment variables');
    }
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    const superAdmin = new SuperAdmin({
      email: process.env.SUPER_ADMIN_EMAIL,
      password: hashedPassword,
      role: 'superadmin',
      isActive: true,
      permissions: [
        'manage_schools',
        'manage_users', 
        'view_all_data',
        'system_administration'
      ]
    });

    await superAdmin.save();
    console.log('✅ Superadmin user seeded successfully in SuperAdmin collection');
    console.log('📧 Email:', process.env.SUPER_ADMIN_EMAIL);
    console.log('⚠️  Password stored securely as bcrypt hash');
    
    await mongoose.disconnect();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error seeding superadmin:', error);
    process.exit(1);
  }
}

seedSuperAdmin();
