const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

const seedSuperAdminFromSchema = async () => {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/institute_erp';
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 50,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false
    });

    console.log('Connected to MongoDB');

    // Check if superadmin already exists
    const existingSuperAdmin = await User.findOne({ 
      email: 'super@erp.com',
      role: 'superadmin' 
    });

    if (existingSuperAdmin) {
      console.log('SuperAdmin already exists!');
      console.log('Email:', existingSuperAdmin.email);
      console.log('Role:', existingSuperAdmin.role);
      return;
    }

    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash('super123', saltRounds);

    // Create SuperAdmin user
    const superAdminData = {
      userId: 'SUPER_ADMIN_001',
      name: {
        firstName: 'Super',
        lastName: 'Admin',
        displayName: 'Super Admin'
      },
      email: 'super@erp.com',
      password: hashedPassword,
      passwordChangeRequired: false, // Set to false for convenience
      role: 'superadmin',
      isActive: true,
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const superAdmin = new User(superAdminData);
    await superAdmin.save();

    console.log('\n✅ SuperAdmin created successfully!');
    console.log('==========================================');
    console.log('Email: super@erp.com');
    console.log('Password: super123');
    console.log('Role: superadmin');
    console.log('User ID:', superAdmin.userId);
    console.log('==========================================');

  } catch (error) {
    console.error('❌ Error seeding superadmin:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  }
};

// Run the seeding
console.log('🌱 Starting superadmin seeding...');
seedSuperAdminFromSchema();
