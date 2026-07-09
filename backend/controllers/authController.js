const User = require('../models/User');
const SuperAdmin = require('../models/SuperAdmin');
const TokenBlacklist = require('../models/TokenBlacklist');
const UserGenerator = require('../utils/userGenerator');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require("crypto");
const PasswordResetToken = require("../models/PasswordResetToken");
const { sendPasswordResetEmail } = require("../utils/mailer");
const SchoolDatabaseManager = require("../utils/schoolDatabaseManager");
const sendEmail = require('../utils/sendEmail');


exports.logout = async (req, res) => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173';
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

    if (token) {
      // Decode to get expiration time
      const decoded = jwt.decode(token);
      const expiresAt = decoded && decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Add to blacklist
      await TokenBlacklist.create({
        token,
        expiresAt
      });
    }

    // Clear cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('[LOGOUT ERROR]', error);
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
};

exports.getDemoCredentials = async (req, res) => {
  try {
    // SECURITY: Return demo credentials from database (not environment variables)
    // This provides access to admin credentials created by super admin
    const User = require('../models/User');
    
    // Look for admin user created by super admin (not super admin itself)
    const adminUser = await User.findOne({ 
      role: 'admin',
      isActive: true 
    }).select('email name role');
    
    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: 'No admin credentials available'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        note: 'Admin credentials created by super admin'
      }
    });
  } catch (error) {
    console.error('Demo credentials error:', error.message);
    res.status(500).json({ success: false, message: 'Request failed' });
  }
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    user = new User({ name, email, password: hashedPassword, role });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, role: selectedRole } = req.body;
    console.log(`🔍 Attempting login for email: ${email}`);

    let user;

    // Sanitize email to prevent NoSQL/Regex injection
    const sanitizedEmail = String(email || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // First try to find in SuperAdmin collection
    user = await SuperAdmin.findOne({ email: { $regex: new RegExp(`^${sanitizedEmail}$`, 'i') } });

    if (user) {
      console.log(`🔍 Found in SuperAdmin collection: [EMAIL_HIDDEN]`);
      console.log(`👤 User role: ${user.role}`);

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        console.log(`[LOGIN FAIL] Wrong password for superadmin: [EMAIL_HIDDEN]`);
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      if (!user.isActive) {
        console.log(`[LOGIN FAIL] SuperAdmin is deactivated: [EMAIL_HIDDEN]`);
        return res.status(403).json({ message: 'Account has been deactivated. Contact system administrator.' });
      }

      // Validate that selected role matches user's actual role for SuperAdmin
      if (selectedRole && selectedRole !== user.role) {
        console.log(`[LOGIN FAIL] Role mismatch - Selected: ${selectedRole}, Actual: ${user.role} for superadmin: [EMAIL_HIDDEN]`);
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log(`[LOGIN SUCCESS] Super Admin: ${email}`);
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          _id: user._id,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          lastLogin: user.lastLogin
        }
      });
    }

    // If not found in SuperAdmin, try regular Users collection
    user = await User.findOne({ email: { $regex: new RegExp(`^${sanitizedEmail}$`, 'i') } }).read('primaryPreferred');
    console.log(`🔍 Querying users database for user: [EMAIL_HIDDEN]`);

    if (!user) {
      console.log(`[LOGIN FAIL] Email not found: [EMAIL_HIDDEN]`);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    console.log(`👤 User role: ${user.role}`);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`[LOGIN FAIL] Wrong password for: [EMAIL_HIDDEN]`);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Handle non-superadmin users
    if (!user.isActive) {
      console.log(`[LOGIN FAIL] User is deactivated: [EMAIL_HIDDEN]`);
      return res.status(400).json({ message: 'Account has been deactivated. Contact your administrator.' });
    }

    // Validate that selected role matches user's actual role
    if (selectedRole && selectedRole !== user.role) {
      console.log(`[LOGIN FAIL] Role mismatch - Selected: ${selectedRole}, Actual: ${user.role} for user: [EMAIL_HIDDEN]`);
      return res.status(400).json({ message: `Invalid credentials. You selected ${selectedRole} but your account is registered as ${user.role}.` });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({
      id: user._id,
      role: user.role,
      schoolId: user.schoolId?._id
    }, process.env.JWT_SECRET, { expiresIn: '1d' });

    console.log(`[LOGIN SUCCESS] User: ${user.email} (${user.role}) from school: ${user.schoolId?.name || 'None'}`);

    // Set token in cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId?._id,
        schoolName: user.schoolId?.name || 'N/A',
        lastLogin: user.lastLogin
      }
    });
  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};

// Forgot password (school users, e.g. students, teachers, admins, parents).
// Looks the account up by email/user ID within the given school, generates
// a password reset link (either using token collection for students, or school database fields for admins),
// and emails it to the user.
exports.forgotPassword = async (req, res) => {
  try {
    const { identifier, schoolCode } = req.body;

    if (!identifier || !schoolCode) {
      return res.status(400).json({
        success: false,
        message: "Identifier and school code are required."
      });
    }

    console.log(`🔑 Forgot-password request for ${identifier} (${schoolCode})`);

    // Fetch user from school database to check their role
    const user = await UserGenerator.getUserByIdOrEmail(
      schoolCode.trim().toUpperCase(),
      identifier.trim()
    );

    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If the account exists, a password reset link has been sent."
      });
    }

    if (user.role === 'student') {
      // --- Student Reset Logic (from main branch) ---
      if (!user.email) {
        return res.status(200).json({
          success: true,
          message: "If the account exists, a password reset link has been sent."
        });
      }

      // Remove previous unused tokens
      await PasswordResetToken.deleteMany({
        studentId: user.userId,
        used: false
      });

      const rawToken = crypto.randomBytes(32).toString("hex");

      await PasswordResetToken.create({
        studentId: user.userId,
        schoolCode: schoolCode.toUpperCase(),
        token: rawToken,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        used: false
      });

      const resetLink = `${process.env.FRONTEND_URL}/student/reset-password?token=${rawToken}`;

      await sendPasswordResetEmail({
        to: user.email,
        name: user.name?.displayName || user.name?.firstName || user.userId,
        resetLink
      });

      return res.status(200).json({
        success: true,
        message: "If the account exists, a password reset link has been sent."
      });

    } else if (user.role === 'admin') {
      // --- Admin Reset Logic (from our branch) ---
      const resetToken = crypto.randomBytes(20).toString('hex');
      const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      const resetPasswordExpire = Date.now() + 10 * 60 * 1000;
      
      const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
      const collectionName = user.collection || 'admins';
      await connection.collection(collectionName).updateOne(
         { _id: user._id },
         { $set: { resetPasswordToken, resetPasswordExpire } }
      );

      const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173';
      const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
      
      const message = `
        <h1>You have requested a password reset</h1>
        <p>Please go to this link to reset your password:</p>
        <a href="${resetUrl}" clicktracking="off">${resetUrl}</a>
        <br/><br/>
        <p>If you did not request this, please ignore this email.</p>
      `;

      await sendEmail({
        email: user.email,
        subject: 'Goodsync ERP Password Reset',
        html: message
      });

      return res.status(200).json({ success: true, message: 'Email sent' });
    } else {
      return res.status(403).json({ success: false, message: 'Password reset is not supported for this role.' });
    }

  } catch (err) {
    console.error("[FORGOT PASSWORD ERROR]", err);
    return res.status(500).json({
      success: false,
      message: "Unable to process request."
    });
  }
};

// Reset password handler
exports.resetPassword = async (req, res) => {
  try {
    const token = req.params.token || req.body.token;
    const { password, schoolCode } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: "Token and password are required."
      });
    }

    // Try to find the token in the student PasswordResetToken collection first
    const studentResetTokenObj = await PasswordResetToken.findOne({
      token: token,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (studentResetTokenObj) {
      // --- Student Reset Logic (from main branch) ---
      const connection = await SchoolDatabaseManager.getSchoolConnection(studentResetTokenObj.schoolCode);
      
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      const updateResult = await connection.collection('users').updateOne(
        { userId: studentResetTokenObj.studentId },
        { 
          $set: { 
            password: hashedPassword,
            passwordChangeRequired: false,
            updatedAt: new Date()
          },
          $unset: {
            temporaryPassword: ""
          }
        }
      );

      if (updateResult.matchedCount === 0) {
        return res.status(404).json({ success: false, message: "Student account not found." });
      }

      // Mark token as used
      studentResetTokenObj.used = true;
      await studentResetTokenObj.save();

      return res.status(200).json({
        success: true,
        message: "Password reset successful."
      });
    }

    // --- Otherwise, try Admin Reset Logic (from our branch) ---
    if (!schoolCode) {
      return res.status(400).json({ success: false, message: "School code is required for admin reset." });
    }

    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
    const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const collections = ['admins', 'users'];
    let adminUser;

    for (const coll of collections) {
       const found = await connection.collection(coll).findOne({
          resetPasswordToken,
          resetPasswordExpire: { $gt: Date.now() }
       });
       if (found) {
          adminUser = found;
          adminUser.collection = coll;
          break;
       }
    }

    if (!adminUser) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    if (adminUser.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Password reset is only available for admins.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const collectionName = adminUser.collection || 'admins';
    await connection.collection(collectionName).updateOne(
       { _id: adminUser._id },
       { 
          $set: { password: hashedPassword },
          $unset: { resetPasswordToken: "", resetPasswordExpire: "" }
       }
    );

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error("[RESET PASSWORD ERROR]", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// School-specific login (supports both email and user ID)
exports.schoolLogin = async (req, res) => {
  try {
    const { identifier, password, schoolCode, role: selectedRole } = req.body;

    if (!identifier || !password || !schoolCode) {
      return res.status(400).json({
        success: false,
        message: 'Email/User ID, password, and school code are required'
      });
    }

    console.log(`🔍 School login attempt for: ${identifier} at school: ${schoolCode}`);

    // Find user in school database
    const user = await UserGenerator.getUserByIdOrEmail(schoolCode, identifier);

    console.log(`[SCHOOL LOGIN DEBUG] Found user object:`, user ? {
      _id: user._id,
      userId: user.userId,
      email: user.email,
      role: user.role,
      name: user.name,
      hasUserId: !!user.userId
    } : 'null');

    if (!user) {
      console.log(`[SCHOOL LOGIN FAIL] User not found: ${identifier} in school: ${schoolCode}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email/user ID or password.'
      });
    }

    // Get user with password for verification
    const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');
    const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const userCollection = connection.collection(user.collection);
    const userWithPassword = await userCollection.findOne({ 
      $or: [
        { userId: user.userId },
        { _id: user._id }
      ]
    });

    if (!userWithPassword) {
      console.log(`[SCHOOL LOGIN FAIL] User data not found: ${identifier}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log(`[SCHOOL LOGIN DEBUG] Verifying credentials for user: ${user.userId || user._id}...`);
    console.log(`[SCHOOL LOGIN DEBUG] User collection used: ${user.collection}`);

    console.log("Entered Password:", password);
    console.log(
      "Student DOB:",
      userWithPassword.studentDetails?.personal?.dateOfBirth
    );

    console.log(
      "DOB Hash Match:",
      await bcrypt.compare(
        "23112020",   // Replace with this student's DOB in DDMMYYYY format
        userWithPassword.password
      )
    );
    // Verify password
    const isMatch = await bcrypt.compare(password, userWithPassword.password);
    if (!isMatch) {
      console.log(`[SCHOOL LOGIN FAIL] Wrong password for: [IDENTIFIER_HIDDEN]`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email/user ID or password.'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      console.log(`[SCHOOL LOGIN FAIL] User is deactivated: [IDENTIFIER_HIDDEN]`);
      return res.status(400).json({
        success: false,
        message: 'Account has been deactivated. Contact your administrator.'
      });
    }

    // Validate that selected role matches user's actual role
    if (selectedRole && selectedRole !== user.role) {
      console.log(`[SCHOOL LOGIN FAIL] Role mismatch - Selected: ${selectedRole}, Actual: ${user.role} for user: [IDENTIFIER_HIDDEN]`);
      return res.status(400).json({
        success: false,
        message: `Invalid credentials. You selected ${selectedRole} but your account is registered as ${user.role}.`
      });
    }

    // Update last login
    await userCollection.updateOne(
      { 
        $or: [
          { userId: user.userId },
          { _id: user._id }
        ]
      },
      {
        $set: {
          lastLogin: new Date(),
          loginAttempts: 0 // Reset login attempts on successful login
        }
      }
    );

    // Get access matrix for this school (robust check)
    const accessCollection = connection.collection('access_matrix');
    let accessMatrix = await accessCollection.findOne({
      $or: [{ _id: 'school_permissions' }, { schoolCode: schoolCode.toUpperCase() }]
    });

    if (!accessMatrix) {
      const accessMatricesPlural = connection.collection('access_matrices');
      accessMatrix = await accessMatricesPlural.findOne({ schoolCode: schoolCode.toUpperCase() }) || 
                    await accessMatricesPlural.findOne({ _id: 'school_permissions' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.userId,
        role: user.role,
        schoolCode: schoolCode,
        userType: 'school_user'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`[SCHOOL LOGIN SUCCESS] User: ${user.userId} (${user.role}) from school: ${schoolCode}`);

    // Set token in cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    console.log(`[SCHOOL LOGIN DEBUG] User object keys:`, Object.keys(user));
    console.log(`[SCHOOL LOGIN DEBUG] User.userId:`, user.userId);
    console.log(`[SCHOOL LOGIN DEBUG] User._id:`, user._id);

    const responseUser = {
      _id: user._id,
      userId: user.userId,
      email: user.email,
      role: user.role,
      name: user.name,
      schoolCode: schoolCode,
      isActive: user.isActive,
      lastLogin: new Date(),
      permissions: accessMatrix?.matrix?.[user.role] || {}
    };

    console.log(`[SCHOOL LOGIN DEBUG] Response user object:`, responseUser);
    console.log(`[SCHOOL LOGIN DEBUG] Response user.userId specifically:`, responseUser.userId);
    console.log(`[SCHOOL LOGIN DEBUG] Response user.userId type:`, typeof responseUser.userId);

    const finalResponse = {
      success: true,
      message: 'Login successful',
      token,
      user: responseUser
    };

    console.log(`[SCHOOL LOGIN DEBUG] Final JSON response:`, JSON.stringify(finalResponse, null, 2));

    res.json(finalResponse);

  } catch (error) {
    console.error('❌❌❌ [SCHOOL LOGIN FATAL ERROR] ❌❌❌');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    if (error.code) console.error('Error Code:', error.code);
    if (error.name) console.error('Error Name:', error.name);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
      error: error.message
    });
  }
};
