const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const initializeCentralERP = async () => {
  try {
    // Connect to MongoDB and use the central_erp database
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://nitopunk04o:IOilWo4osDam0vmN@erp.ua5qems.mongodb.net/central_erp?retryWrites=true&w=majority&appName=erp';
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
    const existingSuperAdmin = await SuperAdmin.findOne({ email: 'super@erp.com' });

    if (existingSuperAdmin) {
      console.log('SuperAdmin already exists in central_erp database!');
      console.log('Email:', existingSuperAdmin.email);
      return;
    }

    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash('super123', saltRounds);

    // Create the superadmin document
    const superAdminData = {
      email: 'super@erp.com',
      password: hashedPassword
    };

    const newSuperAdmin = new SuperAdmin(superAdminData);
    await newSuperAdmin.save();

    console.log('\n✅ SuperAdmin created successfully in central_erp database!');
    console.log('==========================================');
    console.log('Email: super@erp.com');
    console.log('Password: super123');
    console.log('Role: superadmin');
    console.log('==========================================');

  } catch (error) {
    console.error('❌ Error initializing central_erp database:', error);
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
