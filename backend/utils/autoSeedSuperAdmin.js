const bcrypt = require('bcryptjs');
const SuperAdmin = require('../models/SuperAdmin');

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

    console.log('📋 [SUPER ADMIN] Environment variables:');
    console.log('   - Email: [HIDDEN]');
    console.log('   - Password: [HIDDEN]');

    // Validate required environment variables
    if (!email || !plainPassword) {
      console.log('⚠️  [SUPER ADMIN] Skipping auto-seed: Missing SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD in .env');
      return;
    }

    console.log('🔍 [SUPER ADMIN] Checking for existing super admin...');

    // 1. Try to find by email first
    let existingSuperAdmin = await SuperAdmin.findOne({ email: email });

    // 2. If not found by email, see if there is exactly one super admin
    if (!existingSuperAdmin) {
      const allAdmins = await SuperAdmin.find({});
      if (allAdmins.length === 1) {
        existingSuperAdmin = allAdmins[0];
        console.log(`🔄 [SUPER ADMIN] Updating existing super admin email to: [HIDDEN]`);
        existingSuperAdmin.email = email;
      }
    }

    if (existingSuperAdmin) {
      console.log('✅ [SUPER ADMIN] Super admin identified: [EMAIL_HIDDEN]');

      const isPasswordMatch = await bcrypt.compare(plainPassword, existingSuperAdmin.password);
      if (!isPasswordMatch) {
        console.log('🔄 [SUPER ADMIN] Updating password from .env...');
        const saltRounds = 12;
        existingSuperAdmin.password = await bcrypt.hash(plainPassword, saltRounds);
      }

      if (existingSuperAdmin.isModified()) {
        await existingSuperAdmin.save();
        console.log('💾 [SUPER ADMIN] Sync completed (database updated)');
      } else {
        console.log('✅ [SUPER ADMIN] Already in sync');
      }
      return;
    }

    console.log('🔐 [SUPER ADMIN] Hashing password...');
    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
    console.log('✅ [SUPER ADMIN] Password hashed successfully');

    console.log('📝 [SUPER ADMIN] Creating super admin user object...');
    // Create super admin user in SuperAdmin collection
    const superAdminData = {
      email: email,
      password: hashedPassword,
      role: 'superadmin',
      isActive: true,
      permissions: [
        'manage_schools',
        'manage_users',
        'view_all_data',
        'system_administration'
      ]
    };

    const superAdmin = new SuperAdmin(superAdminData);
    console.log('💾 [SUPER ADMIN] Saving to database...');
    await superAdmin.save();
    console.log('✅ [SUPER ADMIN] Saved successfully');

    console.log('\n✅ [SUPER ADMIN] Auto-seeding completed successfully!');
    console.log('==========================================');
    console.log('Email: [HIDDEN]');
    console.log('Role: superadmin');
    console.log('Status: Active');
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
