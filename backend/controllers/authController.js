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

// NOTE: The old public "demo credentials" endpoint has been removed.
// It leaked real user emails to anyone who called it, unauthenticated.
// Never expose any endpoint that reveals account identifiers/credentials
// without authentication.

// Dedicated Super Admin login. Only ever checks the SuperAdmin collection —
// it will never authenticate an admin/teacher/student, even if the same
// email exists in the regular Users collection. Meant to be mounted behind
// its own strict rate limiter and a non-public URL.
exports.superAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Sanitize email to prevent NoSQL/Regex injection
    const sanitizedEmail = String(email || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const user = await SuperAdmin.findOne({ email: { $regex: new RegExp(`^${sanitizedEmail}$`, 'i') } });

    // Use one generic error message and always compare against a bcrypt hash
    // (even a dummy one) so response timing doesn't reveal whether the email exists.
    const dummyHash = '$2a$10$C6UzMDM.H6dfI/f/IKcEeO7t7iA9O/9r6t6lqW2y1ZQ2i9d1e1a1O';
    const isMatch = await bcrypt.compare(password, user ? user.password : dummyHash);

    if (!user || !isMatch) {
      console.log('[SUPERADMIN LOGIN FAIL] Invalid credentials');
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      console.log('[SUPERADMIN LOGIN FAIL] Account deactivated: [EMAIL_HIDDEN]');
      return res.status(403).json({ message: 'Account has been deactivated. Contact system administrator.' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '12h' } // shorter session for the most sensitive account
    );

    console.log('[SUPERADMIN LOGIN SUCCESS]');
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
  } catch (error) {
    console.error('[SUPERADMIN LOGIN ERROR]', error);
    res.status(500).json({ message: 'Login failed. Please try again.' });
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

    // SECURITY: Super Admin accounts can NEVER authenticate through this
    // general-purpose endpoint, even with a correct password. Super Admin
    // login only happens through the dedicated /auth/superadmin-login
    // endpoint, reachable exclusively via a separate, non-public URL.
    const superAdminExists = await SuperAdmin.findOne({ email: { $regex: new RegExp(`^${sanitizedEmail}$`, 'i') } }).select('_id');
    if (superAdminExists) {
      console.log(`[LOGIN BLOCKED] SuperAdmin email attempted general login: [EMAIL_HIDDEN]`);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Try regular Users collection
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

    const allowedRoles = ['admin', 'teacher', 'student', 'parent'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Password reset is not supported for this role.' });
    }

    if (!user.email) {
      return res.status(200).json({
        success: true,
        message: "If the account exists, a password reset link has been sent."
      });
    }

    // --- Unified Reset Link Generation ---
    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const collectionName = user.collection ||
      (user.role === 'teacher' ? 'teachers' :
        user.role === 'student' ? 'students' :
          user.role === 'parent' ? 'parents' : 'admins');

    await connection.collection(collectionName).updateOne(
      { _id: user._id },
      { $set: { resetPasswordToken, resetPasswordExpire } }
    );

    const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}?schoolCode=${schoolCode}`;

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

    return res.status(200).json({ success: true, message: 'If the account exists, a password reset link has been sent.' });

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

    // --- Otherwise, try database-backed Reset Logic (from our branch) ---
    if (!schoolCode) {
      return res.status(400).json({ success: false, message: "School code is required for password reset." });
    }

    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
    const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const collections = ['admins', 'teachers', 'students', 'parents', 'users'];
    let matchedUser;

    for (const coll of collections) {
      const found = await connection.collection(coll).findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
      });
      if (found) {
        matchedUser = found;
        matchedUser.collection = coll;
        break;
      }
    }

    if (!matchedUser) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    const allowedRoles = ['admin', 'teacher', 'student', 'parent'];
    if (!allowedRoles.includes(matchedUser.role)) {
      return res.status(403).json({ success: false, message: 'Password reset is not supported for this role.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const collectionName = matchedUser.collection ||
      (matchedUser.role === 'teacher' ? 'teachers' :
        matchedUser.role === 'student' ? 'students' :
          matchedUser.role === 'parent' ? 'parents' : 'admins');

    await connection.collection(collectionName).updateOne(
      { _id: matchedUser._id },
      {
        $set: {
          password: hashedPassword,
          passwordChangeRequired: false,
          updatedAt: new Date()
        },
        $unset: {
          resetPasswordToken: "",
          resetPasswordExpire: "",
          temporaryPassword: ""
        }
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