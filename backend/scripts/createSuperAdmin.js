const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb://localhost:27017/institute_erp';

async function createSuperAdmin() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🌱 Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');

    const db = client.db('institute_erp');
    const superAdminsCollection = db.collection('superadmins');

    // Remove existing superadmin
    await superAdminsCollection.deleteOne({ email: 'super@erp.com' });

    // Create new superadmin
    const password = await bcrypt.hash('SuperAdmin@123', 10);

    const superAdmin = {
      email: 'super@erp.com',
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
    console.log('\nLogin credentials:');
    console.log('Email: super@erp.com');
    console.log('Password: SuperAdmin@123');
    console.log('\nPlease change the password after first login for security reasons.', MONGODB_URI);

  } catch (error) {
    console.error('❌ Error creating superadmin:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createSuperAdmin();
