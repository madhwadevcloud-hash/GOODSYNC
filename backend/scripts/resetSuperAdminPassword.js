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

async function resetSuperAdminPassword() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const superAdminsCollection = db.collection('superadmins');
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
    
    // Update the superadmin password
    const result = await superAdminsCollection.updateOne(
      { email: SUPER_ADMIN_EMAIL },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount > 0) {
      console.log('✅ Superadmin password updated successfully!');
      console.log('🔑 Login credentials updated securely');
    } else {
      console.log('❌ Superadmin user not found');
    }
    
  } catch (error) {
    console.error('❌ Error updating password:', error.message);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

resetSuperAdminPassword();
