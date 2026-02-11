const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const SuperAdmin = require('../models/SuperAdmin');

// MongoDB connection string
const MONGODB_URI = 'mongodb+srv://nitopunk04o:IOilWo4osDam0vmN@erp.ua5qems.mongodb.net/institute_erp?retryWrites=true&w=majority&appName=erp';

async function seedSuperAdmin() {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🗑️ Removing existing superadmin users from SuperAdmin collection...');
    await SuperAdmin.deleteMany({});

    console.log('🔐 Creating new superadmin user...');
    const hashedPassword = await bcrypt.hash('super123', 10);
    
    const superAdmin = new SuperAdmin({
      email: 'super@erp.com',
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
    console.log('📧 Email: super@erp.com');
    console.log('🔑 Password: super123');
    
    await mongoose.disconnect();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error seeding superadmin:', error);
    process.exit(1);
  }
}

seedSuperAdmin();
