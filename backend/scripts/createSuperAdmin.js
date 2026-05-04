const { MongoClient } = require('mongodb');
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

async function createSuperAdmin() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🌱 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    const superAdminsCollection = db.collection('superadmins');

    // Remove existing superadmin
    await superAdminsCollection.deleteOne({ email: SUPER_ADMIN_EMAIL });

    // Create new superadmin
    const password = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);

    const superAdmin = {
      email: SUPER_ADMIN_EMAIL,
      password: password,
      role: 'superadmin',
      name: {
        firstName: 'Super',
        lastName: 'Admin',
        displayName: 'Super Admin'
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      permissions: ['manage_schools', 'manage_users', 'system_admin']
    };

    const result = await superAdminsCollection.insertOne(superAdmin);
    console.log('✅ Created superadmin user with ID:', result.insertedId);

    console.log('\n🎉 SuperAdmin setup completed successfully!');
    console.log('🔑 Login credentials configured securely');

  } catch (error) {
    console.error('❌ Error creating superadmin:', error.message);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createSuperAdmin();
