// backend/controllers/messagesController.js

const Message = require('../models/Message');
const User = require('../models/User');
const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');

// Send message to students by class/section
exports.sendMessage = async (req, res) => {
  try {
    console.log('📨 Sending message:', req.body);
    
    // DEFENSIVE CHECK: Ensure user object exists after auth middleware
    if (!req.user || !req.user._id) {
        console.error('[MESSAGE CONTROLLER ERROR] Authentication context missing, should have been blocked by middleware.');
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    // Validate required fields according to new schema
    let { title, subject, message, class: targetClass, section: targetSection, sections: targetSections, academicYear } = req.body;

    // Support both legacy single `section` and new multi-select `sections` array
    // Normalise into an array
    let sectionsArray = [];
    if (Array.isArray(targetSections) && targetSections.length > 0) {
      sectionsArray = targetSections;
    } else if (targetSection) {
      sectionsArray = [targetSection];
    }

    if (!title || !subject || !message || !targetClass || sectionsArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Title, subject, message, class, and at least one section are required'
      });
    }

    // Verify school ownership - use schoolId from authenticated user
    const userSchoolId = req.user.schoolId;
    if (!userSchoolId) {
      return res.status(400).json({
        success: false,
        message: 'User school ID not found'
      });
    }

    console.log(`🔍 sendMessage: Using authenticated school ID: ${userSchoolId}`);
    
    // Get school connection for student queries and message storage
    const schoolCode = req.user.schoolCode;
    if (!schoolCode) {
      return res.status(400).json({
        success: false,
        message: 'School code not found in user profile'
      });
    }
    
    const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const db = connection.db;
    
    // If academic year is not provided, fetch it from school settings
    if (!academicYear) {
      console.log('📅 Academic year not provided, fetching from school settings...');
      try {
        const schoolInfoCollection = db.collection('school_info');
        const schoolInfo = await schoolInfoCollection.findOne({});
        
        if (schoolInfo && schoolInfo.academicYear) {
          academicYear = schoolInfo.academicYear;
          console.log(`✅ Fetched academic year from school settings: ${academicYear}`);
        } else {
          console.warn('⚠️ No academic year found in school settings, message will be saved without academic year');
        }
      } catch (error) {
        console.error('❌ Error fetching academic year from school settings:', error);
        console.warn('⚠️ Message will be saved without academic year');
      }
    } else {
      console.log(`📅 Academic year provided in request: ${academicYear}`);
    }
    
    // Separate teacher flag from student sections
    const includeTeachers = sectionsArray.includes('teacher');
    const studentSections = sectionsArray.filter(s => s !== 'teacher');

    // Build student query to handle all possible data structures:
    // 1. class/section at root level
    // 2. studentDetails.academic.currentClass/currentSection
    // 3. studentDetails.currentClass/currentSection
    const studentsCollection = db.collection('students');
    let students = [];

    if (studentSections.length > 0) {
      const classRegex = new RegExp(`^${targetClass}$`, 'i');
      const classConditions = [
        { class: classRegex },
        { 'studentDetails.academic.currentClass': classRegex },
        { 'studentDetails.currentClass': classRegex }
      ];

      // Build section conditions for all selected sections
      const sectionOrConditions = studentSections.flatMap(sec => {
        const secRegex = new RegExp(`^${sec}$`, 'i');
        return [
          { section: secRegex },
          { 'studentDetails.academic.currentSection': secRegex },
          { 'studentDetails.currentSection': secRegex }
        ];
      });

      const studentQuery = {
        role: 'student',
        _placeholder: { $ne: true },
        $and: [
          { $or: classConditions },
          { $or: sectionOrConditions }
        ]
      };

      console.log('🔍 Student query:', JSON.stringify(studentQuery, null, 2));
      students = await studentsCollection.find(studentQuery).toArray();
      console.log(`👥 Found ${students.length} students matching criteria`);
    }

    // Find teachers if requested
    let teachers = [];
    if (includeTeachers) {
      const teacherQuery = {
        role: 'teacher',
        _placeholder: { $ne: true }
      };
      const teachersCollection = db.collection('teachers');
      try {
        teachers = await teachersCollection.find(teacherQuery).toArray();
      } catch (e) {
        // Fallback: teachers may be in users/students collection
        teachers = await studentsCollection.find({ role: 'teacher', _placeholder: { $ne: true } }).toArray();
      }
      console.log(`👩‍🏫 Found ${teachers.length} teachers`);
    }

    const totalRecipients = students.length + teachers.length;
    if (totalRecipients === 0) {
      return res.status(400).json({
        success: false,
        message: 'No recipients found matching the selected criteria'
      });
    }

    // Create message document
    const sectionLabel = sectionsArray.join(', ');
    const messageData = {
      class: targetClass,
      section: sectionLabel,
      sections: sectionsArray,          // store the full array
      includeTeachers: includeTeachers,
      adminId: req.user._id,
      title: title,
      subject: subject,
      message: message,
      createdAt: new Date(),
      schoolId: userSchoolId
    };

    if (academicYear) {
      messageData.academicYear = academicYear;
    }

    console.log('✅ Message Data to be Saved:', messageData);
    console.log('📅 Academic Year being saved:', academicYear || 'NONE');

    const messagesCollection = db.collection('messages');
    const result = await messagesCollection.insertOne(messageData);

    console.log(`✅ Message sent to ${totalRecipients} recipients (${students.length} students, ${teachers.length} teachers)`);

    // Dispatch background job for notifications (FCM, email, etc.)
    console.log('📱 Dispatching background notification job...');

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: {
        messageId: result.insertedId,
        sentCount: totalRecipients,
        studentCount: students.length,
        teacherCount: teachers.length,
        recipients: [
          ...students.map(s => ({
            id: s._id,
            name: s.name?.displayName || `${s.name?.firstName} ${s.name?.lastName}` || s.name,
            role: 'student',
            class: s.class || s.studentDetails?.academic?.currentClass || s.studentDetails?.currentClass,
            section: s.section || s.studentDetails?.academic?.currentSection || s.studentDetails?.currentSection
          })),
          ...teachers.map(t => ({
            id: t._id,
            name: t.name?.displayName || `${t.name?.firstName} ${t.name?.lastName}` || t.name,
            role: 'teacher'
          }))
        ]
      }
    });

  } catch (error) {
    console.error('❌ Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};

// Utility function to update all messages without academicYear
// This can be called once to migrate existing messages
exports.updateMessagesWithAcademicYear = async (req, res) => {
  try {
    console.log('🔄 [UPDATE MESSAGES] Starting migration to add academic year to existing messages...');
    
    // Get school connection
    const schoolCode = req.user.schoolCode;
    if (!schoolCode) {
      return res.status(400).json({
        success: false,
        message: 'School code not found in user profile'
      });
    }
    
    const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const db = connection.db;
    
    // Get current academic year from school settings
    const schoolInfoCollection = db.collection('school_info');
    const schoolInfo = await schoolInfoCollection.findOne({});
    
    if (!schoolInfo || !schoolInfo.academicYear) {
      return res.status(400).json({
        success: false,
        message: 'No academic year found in school settings. Please set it first.'
      });
    }
    
    const currentAcademicYear = schoolInfo.academicYear;
    console.log(`📅 [UPDATE MESSAGES] Current academic year from settings: ${currentAcademicYear}`);
    
    // Find all messages without academicYear
    const messagesCollection = db.collection('messages');
    const messagesToUpdate = await messagesCollection.find({
      $or: [
        { academicYear: { $exists: false } },
        { academicYear: null }
      ]
    }).toArray();
    
    console.log(`📊 [UPDATE MESSAGES] Found ${messagesToUpdate.length} messages without academic year`);
    
    if (messagesToUpdate.length === 0) {
      return res.json({
        success: true,
        message: 'All messages already have academic year assigned',
        data: {
          updated: 0,
          total: 0
        }
      });
    }
    
    // Update all messages without academicYear
    const result = await messagesCollection.updateMany(
      {
        $or: [
          { academicYear: { $exists: false } },
          { academicYear: null }
        ]
      },
      {
        $set: { academicYear: currentAcademicYear }
      }
    );
    
    console.log(`✅ [UPDATE MESSAGES] Updated ${result.modifiedCount} messages with academic year: ${currentAcademicYear}`);
    
    res.json({
      success: true,
      message: `Successfully updated ${result.modifiedCount} messages with academic year ${currentAcademicYear}`,
      data: {
        updated: result.modifiedCount,
        total: messagesToUpdate.length,
        academicYear: currentAcademicYear
      }
    });
    
  } catch (error) {
    console.error('❌ [UPDATE MESSAGES] Error updating messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update messages with academic year',
      error: error.message
    });
  }
};

// Preview message recipients count
exports.previewMessage = async (req, res) => {
  try {
    console.log('🔍 Previewing message recipients:', req.body);
    
    const { class: targetClass, section: targetSection, sections: targetSections } = req.body;

    // Normalise sections into an array
    let sectionsArray = [];
    if (Array.isArray(targetSections) && targetSections.length > 0) {
      sectionsArray = targetSections;
    } else if (targetSection) {
      sectionsArray = [targetSection];
    }
    
    // Get user's school ID from the authentication context (source of truth)
    const userSchoolId = req.user.schoolId;

    if (!userSchoolId) {
        return res.status(400).json({
            success: false,
            message: 'User school ID not found in authentication context'
        });
    }
    
    console.log(`🔍 previewMessage: Using authenticated school ID: ${userSchoolId}`);
    
    // Get school connection for student queries
    const schoolCode = req.user.schoolCode;
    if (!schoolCode) {
      return res.status(400).json({
        success: false,
        message: 'School code not found in user profile'
      });
    }
    
    const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const db = connection.db;
    
    const includeTeachers = sectionsArray.includes('teacher');
    const studentSections = sectionsArray.filter(s => s !== 'teacher');

    const studentsCollection = db.collection('students');
    let studentCount = 0;
    let sampleStudents = [];

    if (studentSections.length > 0) {
      const classRegex = new RegExp(`^${targetClass}$`, 'i');
      const classConditions = [
        { class: classRegex },
        { 'studentDetails.academic.currentClass': classRegex },
        { 'studentDetails.currentClass': classRegex }
      ];

      const sectionOrConditions = studentSections.flatMap(sec => {
        const secRegex = new RegExp(`^${sec}$`, 'i');
        return [
          { section: secRegex },
          { 'studentDetails.academic.currentSection': secRegex },
          { 'studentDetails.currentSection': secRegex }
        ];
      });

      const studentQuery = {
        role: 'student',
        _placeholder: { $ne: true },
        $and: [
          { $or: classConditions },
          { $or: sectionOrConditions }
        ]
      };

      console.log('🔍 Preview query:', JSON.stringify(studentQuery, null, 2));
      studentCount = await studentsCollection.countDocuments(studentQuery);
      sampleStudents = await studentsCollection.find(studentQuery)
        .limit(10)
        .project({
          _id: 1,
          'name.firstName': 1,
          'name.lastName': 1,
          'name.displayName': 1,
          class: 1,
          section: 1
        })
        .toArray();
    }

    let teacherCount = 0;
    if (includeTeachers) {
      const teachersCollection = db.collection('teachers');
      try {
        teacherCount = await teachersCollection.countDocuments({ role: 'teacher', _placeholder: { $ne: true } });
      } catch (e) {
        teacherCount = await studentsCollection.countDocuments({ role: 'teacher', _placeholder: { $ne: true } });
      }
    }

    const totalRecipients = studentCount + teacherCount;
    console.log(`👥 Preview: ${studentCount} students + ${teacherCount} teachers = ${totalRecipients} total`);

    res.json({
      success: true,
      data: {
        estimatedRecipients: totalRecipients,
        studentCount,
        teacherCount,
        targetClass: targetClass || 'ALL',
        targetSections: sectionsArray,
        sampleRecipients: sampleStudents.map(s => ({
          id: s._id,
          name: s.name?.displayName || `${s.name?.firstName} ${s.name?.lastName}` || s.name,
          class: s.class || s.studentDetails?.academic?.currentClass || s.studentDetails?.currentClass,
          section: s.section || s.studentDetails?.academic?.currentSection || s.studentDetails?.currentSection
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error previewing message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview message',
      error: error.message
    });
  }
};

// Get messages with filtering
exports.getMessages = async (req, res) => {
  try {
    console.log('📥 [GET MESSAGES] Starting fetch...');
    console.log('📥 [GET MESSAGES] Query params:', req.query);
    console.log('📥 [GET MESSAGES] User:', { 
      userId: req.user.userId, 
      role: req.user.role, 
      schoolCode: req.user.schoolCode 
    });
    
    const { class: filterClass, section: filterSection, academicYear: filterAcademicYear, page = 1, limit = 20 } = req.query;

    // Get school connection for message queries
    const schoolCode = req.user.schoolCode;
    if (!schoolCode) {
      console.error('❌ [GET MESSAGES] No school code found in user profile');
      return res.status(400).json({
        success: false,
        message: 'School code not found in user profile'
      });
    }
    
    console.log(`🔗 [GET MESSAGES] Connecting to school database: ${schoolCode}`);
    const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const db = connection.db;
    console.log(`✅ [GET MESSAGES] Connected to database: ${db.databaseName}`);

    // Build query for new schema
    const query = {};
    
    // If user is a student, filter by their class/section automatically
    if (req.user.role === 'student') {
      // Get student's class and section from multiple possible locations
      const studentClass = req.user.studentDetails?.currentClass || 
                          req.user.studentDetails?.academic?.currentClass || 
                          req.user.class;
      const studentSection = req.user.studentDetails?.currentSection || 
                            req.user.studentDetails?.academic?.currentSection || 
                            req.user.section;
      
      if (studentClass) {
        query.class = studentClass;
        console.log(`🎓 [GET MESSAGES] Filtering for student class: ${studentClass}`);
      }
      if (studentSection) {
        query.section = studentSection;
        console.log(`📚 [GET MESSAGES] Filtering for student section: ${studentSection}`);
      }
      
      if (!studentClass || !studentSection) {
        console.warn(`⚠️ [GET MESSAGES] Student ${req.user.userId} missing class/section data`);
      }
    } else {
      // For admin/teachers, use filter parameters
      if (filterClass && filterClass !== 'ALL') {
        query.class = filterClass;
        console.log(`🎓 [GET MESSAGES] Admin filter - class: ${filterClass}`);
      }
      if (filterSection && filterSection !== 'ALL') {
        query.section = filterSection;
        console.log(`📚 [GET MESSAGES] Admin filter - section: ${filterSection}`);
      }
    }
    
    // Filter by academic year for all users
    if (filterAcademicYear) {
      query.academicYear = filterAcademicYear;
      console.log(`📅 [GET MESSAGES] Filtering by academic year: ${filterAcademicYear}`);
    }

    console.log('🔍 [GET MESSAGES] Final query:', JSON.stringify(query, null, 2));
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const messagesCollection = db.collection('messages');
    
    console.log(`📊 [GET MESSAGES] Pagination - page: ${page}, limit: ${limit}, skip: ${skip}`);
    
    // Check if collection exists and has documents
    const collectionExists = await db.listCollections({ name: 'messages' }).hasNext();
    console.log(`📦 [GET MESSAGES] Messages collection exists: ${collectionExists}`);
    
    if (!collectionExists) {
      console.warn('⚠️ [GET MESSAGES] Messages collection does not exist yet');
      return res.json({
        success: true,
        data: {
          messages: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          }
        }
      });
    }
    
    // Get messages from school database with pagination
    console.log('🔎 [GET MESSAGES] Executing find query...');
    const messages = await messagesCollection.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();
    
    console.log(`📨 [GET MESSAGES] Found ${messages.length} messages`);
    
    const totalMessages = await messagesCollection.countDocuments(query);
    console.log(`📊 [GET MESSAGES] Total messages matching query: ${totalMessages}`);

    // Since we're using native MongoDB driver, we need to manually create virtual fields
    console.log('🔄 [GET MESSAGES] Formatting messages...');
    const formattedMessages = messages.map((msg, index) => {
      console.log(`📝 [GET MESSAGES] Message ${index + 1}:`, {
        id: msg._id,
        title: msg.title,
        class: msg.class,
        section: msg.section,
        academicYear: msg.academicYear,
        createdAt: msg.createdAt
      });
      
      return {
        id: msg._id,
        _id: msg._id, // Include both for compatibility
        class: msg.class,
        section: msg.section,
        adminId: msg.adminId,
        title: msg.title,
        subject: msg.subject,
        message: msg.message,
        academicYear: msg.academicYear, // Include academic year in response
        createdAt: msg.createdAt,
        // Manual virtual fields calculation
        messageAge: calculateMessageAge(msg.createdAt),
        urgencyIndicator: 'normal' // Default since we don't have priority in simplified schema
      };
    });

    console.log(`✅ [GET MESSAGES] Returning ${formattedMessages.length} messages to frontend`);
    console.log(`📄 [GET MESSAGES] Pagination: page ${page}, total ${totalMessages}, pages ${Math.ceil(totalMessages / parseInt(limit))}`);

    res.json({
      success: true,
      data: {
        messages: formattedMessages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalMessages,
          pages: Math.ceil(totalMessages / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('❌ [GET MESSAGES] Error fetching messages:', error);
    console.error('❌ [GET MESSAGES] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
};

// Get message details
exports.getMessageDetails = async (req, res) => {
  try {
    const { messageId } = req.params;
    
    // Get school connection for message queries
    const schoolCode = req.user.schoolCode;
    if (!schoolCode) {
      return res.status(400).json({
        success: false,
        message: 'School code not found in user profile'
      });
    }
    
    const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const db = connection.db;
    const messagesCollection = db.collection('messages');
    
    // Convert string ID to ObjectId if needed
    const { ObjectId } = require('mongodb');
    const message = await messagesCollection.findOne({ _id: new ObjectId(messageId) });
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: message._id,
        class: message.class,
        section: message.section,
        adminId: message.adminId,
        title: message.title,
        subject: message.subject,
        message: message.message,
        createdAt: message.createdAt,
        // Manual virtual fields calculation
        messageAge: calculateMessageAge(message.createdAt),
        urgencyIndicator: 'normal'
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching message details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch message details',
      error: error.message
    });
  }
};

// Get message statistics
exports.getMessageStats = async (req, res) => {
  try {
    // Get school connection for message queries
    const schoolCode = req.user.schoolCode;
    if (!schoolCode) {
      return res.status(400).json({
        success: false,
        message: 'School code not found in user profile'
      });
    }
    
    const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const db = connection.db;
    const messagesCollection = db.collection('messages');
    
    const totalMessages = await messagesCollection.countDocuments();
    
    const messagesByClass = await messagesCollection.aggregate([
      {
        $group: {
          _id: '$class',
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    const messagesBySection = await messagesCollection.aggregate([
      {
        $group: {
          _id: '$section',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentMessages = await messagesCollection.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    res.json({
      success: true,
      data: {
        totalMessages,
        messagesByClass,
        messagesBySection,
        recentMessages
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching message stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch message statistics',
      error: error.message
    });
  }
};

// Get messages for teachers (read-only)
exports.getTeacherMessages = async (req, res) => {
  try {
    console.log('📨 Teacher fetching messages:', req.user);
    
    // Get school connection for message queries
    const schoolCode = req.user.schoolCode;
    if (!schoolCode) {
      return res.status(400).json({
        success: false,
        message: 'School code not found in user profile'
      });
    }
    
    const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const db = connection.db;
    const messagesCollection = db.collection('messages');
    
    // Get query parameters for pagination and academic year
    const { limit = 20, page = 1, academicYear } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get school's current academic year from settings
    const School = require('../models/School');
    const school = await School.findOne({ code: schoolCode });
    const currentAcademicYear = school?.settings?.academicYear?.currentYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    console.log(`📅 School's current academic year: ${currentAcademicYear}`);
    
    // Build query - use provided academicYear or default to current academic year
    const query = {};
    const yearToFilter = academicYear || currentAcademicYear;
    query.academicYear = yearToFilter;
    console.log(`📅 Filtering messages by Academic Year: ${yearToFilter}`);
    
    // Fetch messages from the teacher's school (sorted by newest first)
    const messages = await messagesCollection.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();
    
    console.log(`✅ Found ${messages.length} messages for teacher`);
    
    // Format messages for frontend (compatible with teacher dashboard expectations)
    const formattedMessages = messages
      .filter(msg => msg.title && msg.subject && msg.message) // Filter out incomplete messages
      .map(msg => ({
        id: msg._id.toString(),
        class: msg.class || 'Unknown',
        section: msg.section || 'Unknown',
        adminId: msg.adminId,
        title: msg.title,
        subject: msg.subject,
        message: msg.message,
        content: msg.message, // Alias for compatibility
        createdAt: msg.createdAt,
        timestamp: msg.createdAt, // Alias for compatibility
        schoolId: msg.schoolId,
        messageAge: calculateMessageAge(msg.createdAt),
        type: 'group', // All admin messages are group messages
        isRead: true, // Teachers can only view, so mark as read
        sender: 'Admin',
        senderName: 'School Admin', // Add senderName for dashboard compatibility
        recipient: [`Class ${msg.class || 'Unknown'}-${msg.section || 'Unknown'}`],
        recipientType: `Class ${msg.class || 'Unknown'}-${msg.section || 'Unknown'}` // Add recipientType for dashboard compatibility
      }));
    
    res.json({
      success: true,
      messages: formattedMessages, // Move messages to root level for dashboard compatibility
      data: {
        messages: formattedMessages,
        total: formattedMessages.length
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching teacher messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
};

// Helper function to calculate message age (replaces Mongoose virtual)
function calculateMessageAge(createdAt) {
  const now = new Date();
  const created = new Date(createdAt);
  const diffTime = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

// Get messages for students (read-only)
exports.getStudentMessages = async (req, res) => {
  try {
    console.log('📨 Student fetching messages:', req.user);
    
    // Get school connection for message queries
    const schoolCode = req.user.schoolCode;
    if (!schoolCode) {
      return res.status(400).json({
        success: false,
        message: 'School code not found in user profile'
      });
    }
    
    const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const db = connection.db;
    const messagesCollection = db.collection('messages');
    
    // Get student's class and section
    const studentClass = req.user.studentDetails?.academic?.currentClass ||
                          req.user.studentDetails?.currentClass ||
                          req.user.class;
    const studentSection = req.user.studentDetails?.academic?.currentSection ||
                            req.user.studentDetails?.currentSection ||
                            req.user.section;
    
    console.log('📚 Student class/section:', { studentClass, studentSection });
    
    if (!studentClass || !studentSection) {
      return res.status(400).json({
        success: false,
        message: 'Student class or section not found'
      });
    }
    
    // Get pagination parameters and academic year
    const { limit = 20, page = 1, academicYear } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get school's current academic year from settings
    const School = require('../models/School');
    const school = await School.findOne({ code: schoolCode });
    const currentAcademicYear = school?.settings?.academicYear?.currentYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    
    // Build query to fetch messages for student's class and section
    const query = {
      class: studentClass,
      section: studentSection
    };
    
    // Add academic year filter
    const yearToFilter = academicYear || currentAcademicYear;
    query.academicYear = yearToFilter;
    console.log(`📅 Filtering messages by Academic Year: ${yearToFilter}`);
    
    console.log('🔍 Query:', query);
    
    // Fetch messages with pagination
    const messages = await messagesCollection.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();
    
    // Get total count for pagination
    const total = await messagesCollection.countDocuments(query);
    
    console.log(`✅ Found ${messages.length} messages for student`);
    
    // Format messages
    const formattedMessages = messages.map(msg => ({
      id: msg._id.toString(),
      class: msg.class,
      section: msg.section,
      title: msg.title,
      subject: msg.subject,
      message: msg.message,
      content: msg.message, // Alias used by the student portal UI
      sender: 'Admin',
      createdAt: msg.createdAt,
      messageAge: calculateMessageAge(msg.createdAt),
      isRead: true // No per-student read tracking yet; messages are shown as read once fetched
    }));
    
    res.json({
      success: true,
      data: formattedMessages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Error fetching student messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
};

// Delete message
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    
    console.log('🗑️ Deleting message:', messageId);
    
    // DEFENSIVE CHECK: Ensure user object exists after auth middleware
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Get school connection for message deletion
    const schoolCode = req.user.schoolCode;
    if (!schoolCode) {
      return res.status(400).json({
        success: false,
        message: 'School code not found in user profile'
      });
    }
    
    const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const db = connection.db;
    const messagesCollection = db.collection('messages');
    
    // Convert string ID to ObjectId
    const { ObjectId } = require('mongodb');
    
    // Find the message first to verify ownership
    const message = await messagesCollection.findOne({ 
      _id: new ObjectId(messageId) 
    });
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Optional: Check if user has permission to delete this message
    // For example, only allow admin who created the message to delete it
    if (message.adminId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete messages that you created'
      });
    }
    
    // Delete the message
    const result = await messagesCollection.deleteOne({ 
      _id: new ObjectId(messageId) 
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Message not found or already deleted'
      });
    }
    
    console.log('✅ Message deleted successfully');
    
    res.json({
      success: true,
      message: 'Message deleted successfully',
      data: {
        deletedId: messageId
      }
    });
    
  } catch (error) {
    console.error('❌ Error deleting message:', error);
    
    // Handle invalid ObjectId format
    if (error.name === 'BSONTypeError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid message ID format'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: error.message
    });
  }
};

// Helper function to calculate message age (replaces Mongoose virtual)
function calculateMessageAge(createdAt) {
  const now = new Date();
  const created = new Date(createdAt);
  const diffTime = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}