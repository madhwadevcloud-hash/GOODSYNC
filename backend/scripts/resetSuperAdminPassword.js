const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb+srv://nitopunk04o:IOilWo4osDam0vmN@erp.ua5qems.mongodb.net/?retryWrites=true&w=majority&appName=erp';

async function resetSuperAdminPassword() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = client.db('institute_erp');
    const superAdminsCollection = db.collection('superadmins');
    
    // Hash the new password
    const newPassword = 'SuperAdmin@123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the superadmin password
    const result = await superAdminsCollection.updateOne(
      { email: 'super@erp.com' },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount > 0) {
      console.log('✅ Superadmin password updated successfully!');
      console.log('\n🔑 Login Credentials:');
      console.log('Email: super@erp.com');
      console.log('Password: SuperAdmin@123');
      console.log('\n📋 Steps to login:');
      console.log('1. Clear browser localStorage (F12 → Application → Local Storage → Clear)');
      console.log('2. Refresh the page');
      console.log('3. Login with the credentials above');
    } else {
      console.log('❌ Superadmin user not found');
    }
    
  } catch (error) {
    console.error('❌ Error updating password:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

resetSuperAdminPassword();
