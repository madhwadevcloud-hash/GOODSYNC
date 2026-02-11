const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb+srv://nitopunk04o:IOilWo4osDam0vmN@erp.ua5qems.mongodb.net/institute_erp?retryWrites=true&w=majority&appName=erp';

async function updateSuperAdminPassword() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = client.db('institute_erp');
    const superAdminsCollection = db.collection('superadmins');
    
    // Hash the new password
    const newPassword = 'super123';
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
      console.log('\n🔑 New Login Credentials:');
      console.log('Email: super@erp.com');
      console.log('Password: super123');
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

updateSuperAdminPassword();
