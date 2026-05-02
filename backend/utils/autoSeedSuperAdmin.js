const bcrypt = require('bcryptjs');
const User = require('../models/User');

/**
 * Auto-seed super admin user from environment variables
 * Runs automatically when the server starts
 */
async function autoSeedSuperAdmin() {
  try {
    console.log('🌱 [SUPER ADMIN] Starting auto-seed process...');
    
    // Get super admin credentials from environment
    const email = process.env.SUPER_ADMIN_EMAIL;
    const plainPassword = process.env.SUPER_ADMIN_PASSWORD;
    const firstName = process.env.SUPER_ADMIN_FIRST_NAME || 'Super';
    const lastName = process.env.SUPER_ADMIN_LAST_NAME || 'Admin';

    console.log('📋 [SUPER ADMIN] Environment variables:');
    console.log('   - Email:', email);
    console.log('   - Password: [HIDDEN]');
    console.log('   - FirstName:', firstName);
    console.log('   - LastName:', lastName);

    // Validate required environment variables
    if (!email || !plainPassword) {
      console.log('⚠️  [SUPER ADMIN] Skipping auto-seed: Missing SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD in .env');
      return;
    }

    console.log('🔍 [SUPER ADMIN] Checking if super admin already exists...');
    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({
      email: email,
      role: 'superadmin'
    });

    if (existingSuperAdmin) {
      console.log('✅ [SUPER ADMIN] Super admin already exists:', email);
      console.log('   User ID:', existingSuperAdmin.userId);
      return;
    }

    console.log('🔐 [SUPER ADMIN] Hashing password...');
    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
    console.log('✅ [SUPER ADMIN] Password hashed successfully');

    console.log('📝 [SUPER ADMIN] Creating super admin user object...');
    // Create super admin user
    const superAdminData = {
      userId: 'SUPER_ADMIN_001',
      name: {
        firstName: firstName,
        lastName: lastName,
        displayName: `${firstName} ${lastName}`
      },
      email: email,
      password: hashedPassword,
      passwordChangeRequired: false,
      role: 'superadmin',
      isActive: true,
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const superAdmin = new User(superAdminData);
    console.log('💾 [SUPER ADMIN] Saving to database...');
    await superAdmin.save();
    console.log('✅ [SUPER ADMIN] Saved successfully');

    console.log('\n✅ [SUPER ADMIN] Auto-seeding completed successfully!');
    console.log('==========================================');
    console.log('Email:', email);
    console.log('Name:', `${firstName} ${lastName}`);
    console.log('User ID:', superAdmin.userId);
    console.log('Role: superadmin');
    console.log('Status: Active & Verified');
    console.log('⚠️  Password stored securely as bcrypt hash');
    console.log('==========================================\n');

  } catch (error) {
    console.error('❌ [SUPER ADMIN] Error auto-seeding super admin');
    console.error('   Error Message:', error.message);
    console.error('   Error Stack:', error.stack);
    // Don't throw - allow server to continue even if seeding fails
  }
}

module.exports = { autoSeedSuperAdmin };
