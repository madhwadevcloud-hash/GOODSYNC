const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// SECURITY: Use environment variables instead of hardcoded credentials
const MONGODB_URI = process.env.MONGODB_URI;
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

if (!MONGODB_URI || !SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD) {
  console.error('❌ SECURITY ERROR: Required environment variables not set');
  console.error('❌ Please set MONGODB_URI, SUPER_ADMIN_EMAIL, and SUPER_ADMIN_PASSWORD');
  process.exit(1);
}

const initializeCentralERP = async () => {
  try {
    const connection = await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 50,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false
    });

    console.log('Connected to MongoDB (central_erp database)');

    // Define the superadmin schema
    const superAdminSchema = new mongoose.Schema({
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      role: { type: String, default: 'superadmin' },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });

    // Create the SuperAdmin model
    const SuperAdmin = connection.model('SuperAdmin', superAdminSchema);

    // Check if the superadmin already exists
    const existingSuperAdmin = await SuperAdmin.findOne({ email: SUPER_ADMIN_EMAIL });

    if (existingSuperAdmin) {
      console.log('SuperAdmin already exists in central_erp database!');
      console.log('Email: [HIDDEN]');
      return;
    }

    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, saltRounds);

    // Create the superadmin document
    const superAdminData = {
      email: SUPER_ADMIN_EMAIL,
      password: hashedPassword
    };

    const newSuperAdmin = new SuperAdmin(superAdminData);
    await newSuperAdmin.save();

    console.log('\n✅ SuperAdmin created successfully in central_erp database!');
    console.log('==========================================');
    console.log('Email: [HIDDEN]');
    console.log('Password: [HIDDEN]');
    console.log('Role: superadmin');
    console.log('==========================================');

  } catch (error) {
    console.error('❌ Error initializing central_erp database:', error.message);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  }
};

// Run the initialization
console.log('🌱 Initializing central_erp database...');
initializeCentralERP();
