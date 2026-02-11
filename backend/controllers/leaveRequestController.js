const School = require('../models/School');
const DatabaseManager = require('../utils/databaseManager');
const leaveRequestSchema = require('../models/LeaveRequest').schema;

// Create a new leave request (Teacher)
exports.createLeaveRequest = async (req, res) => {
  try {
    console.log('📝 Creating leave request...');
    console.log('Request body:', req.body);
    console.log('User:', req.user ? { id: req.user._id, userId: req.user.userId, schoolCode: req.user.schoolCode } : 'null');
    
    const { teacherName, teacherId, subjectLine, startDate, endDate, description, schoolCode } = req.body;
    
    // Validate required fields
    if (!teacherName || !teacherId || !subjectLine || !startDate || !endDate || !description) {
      console.error('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end < start) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after or equal to start date'
      });
    }

    // Get teacher details from request (already populated by auth middleware)
    const teacher = req.user;
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Get school details
    const schoolCodeToUse = (schoolCode || teacher.schoolCode || '').toUpperCase();
    const school = await School.findOne({ code: schoolCodeToUse });
    if (!school) {
      console.error('School not found for code:', schoolCodeToUse);
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // Get school-specific database connection
    console.log('Getting school-specific database connection for:', schoolCodeToUse);
    const schoolConnection = await DatabaseManager.getSchoolConnection(schoolCodeToUse);
    
    // Get or create LeaveRequest model for this school
    const LeaveRequest = schoolConnection.models.LeaveRequest || 
                        schoolConnection.model('LeaveRequest', leaveRequestSchema);
    
    // Create leave request
    console.log('Creating leave request document in school database...');
    const leaveRequest = new LeaveRequest({
      teacherId: teacher._id,
      teacherUserId: teacher.userId,
      teacherName: teacherName,
      teacherEmail: teacher.email,
      schoolId: school._id,
      schoolCode: school.code.toUpperCase(),
      subjectLine,
      description,
      startDate: start,
      endDate: end,
      status: 'pending'
    });

    console.log('Saving leave request to database...');
    await leaveRequest.save();
    console.log('✅ Leave request saved successfully:', leaveRequest._id);

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data: {
        leaveRequest: {
          id: leaveRequest._id,
          subjectLine: leaveRequest.subjectLine,
          startDate: leaveRequest.startDate,
          endDate: leaveRequest.endDate,
          numberOfDays: leaveRequest.numberOfDays,
          status: leaveRequest.status,
          createdAt: leaveRequest.createdAt
        }
      }
    });

  } catch (error) {
    console.error('❌ Error creating leave request:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to create leave request',
      error: error.message,
      details: error.toString()
    });
  }
};

// Get all leave requests for a teacher
exports.getTeacherLeaveRequests = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const schoolCode = req.user.schoolCode;
    
    if (!schoolCode) {
      return res.status(400).json({
        success: false,
        message: 'School code not found'
      });
    }
    
    // Get school-specific database connection
    const schoolConnection = await DatabaseManager.getSchoolConnection(schoolCode.toUpperCase());
    const LeaveRequest = schoolConnection.models.LeaveRequest || 
                        schoolConnection.model('LeaveRequest', leaveRequestSchema);
    
    const leaveRequests = await LeaveRequest.find({ teacherId })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.status(200).json({
      success: true,
      data: {
        leaveRequests,
        count: leaveRequests.length
      }
    });

  } catch (error) {
    console.error('Error fetching teacher leave requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave requests',
      error: error.message
    });
  }
};

// Get all leave requests for a school (Admin)
exports.getSchoolLeaveRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const schoolCode = req.user.schoolCode;

    console.log('📋 [ADMIN] Fetching ALL leave requests for school:', schoolCode);

    if (!schoolCode) {
      return res.status(400).json({
        success: false,
        message: 'School code not found'
      });
    }

    // Get school-specific database connection
    const schoolConnection = await DatabaseManager.getSchoolConnection(schoolCode.toUpperCase());
    const LeaveRequest = schoolConnection.models.LeaveRequest || 
                        schoolConnection.model('LeaveRequest', leaveRequestSchema);

    let query = {};
    
    // Optional status filter
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
    }

    console.log('🔍 Query:', query);

    // Fetch all leave requests (no teacherId filter for admin)
    const leaveRequests = await LeaveRequest.find(query)
      .sort({ createdAt: -1 })
      .select('-__v')
      .lean();

    console.log('✅ Found', leaveRequests.length, 'leave requests');

    // Try to populate references if possible
    try {
      const populatedRequests = await LeaveRequest.find(query)
        .sort({ createdAt: -1 })
        .populate('teacherId', 'name email userId')
        .populate('reviewedBy', 'name email')
        .select('-__v')
        .lean();
      
      console.log('✅ Successfully populated references');
      
      res.status(200).json({
        success: true,
        data: {
          leaveRequests: populatedRequests,
          count: populatedRequests.length
        }
      });
    } catch (populateError) {
      console.log('⚠️ Could not populate references, returning raw data');
      
      res.status(200).json({
        success: true,
        data: {
          leaveRequests,
          count: leaveRequests.length
        }
      });
    }

  } catch (error) {
    console.error('❌ Error fetching school leave requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave requests',
      error: error.message
    });
  }
};

// Get pending leave requests for a school (Admin)
exports.getPendingLeaveRequests = async (req, res) => {
  try {
    const schoolCode = req.user.schoolCode;

    if (!schoolCode) {
      return res.status(400).json({
        success: false,
        message: 'School code not found'
      });
    }

    // Get school-specific database connection
    const schoolConnection = await DatabaseManager.getSchoolConnection(schoolCode.toUpperCase());
    const LeaveRequest = schoolConnection.models.LeaveRequest || 
                        schoolConnection.model('LeaveRequest', leaveRequestSchema);

    const leaveRequests = await LeaveRequest.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .populate('teacherId', 'name email userId');

    res.status(200).json({
      success: true,
      data: {
        leaveRequests,
        count: leaveRequests.length
      }
    });

  } catch (error) {
    console.error('Error fetching pending leave requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending leave requests',
      error: error.message
    });
  }
};

// Update leave request status (Admin)
exports.updateLeaveRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminComments } = req.body;
    const schoolCode = req.user.schoolCode;

    if (!schoolCode) {
      return res.status(400).json({
        success: false,
        message: 'School code not found'
      });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be either "approved" or "rejected"'
      });
    }

    // Get school-specific database connection
    const schoolConnection = await DatabaseManager.getSchoolConnection(schoolCode.toUpperCase());
    const LeaveRequest = schoolConnection.models.LeaveRequest || 
                        schoolConnection.model('LeaveRequest', leaveRequestSchema);

    const leaveRequest = await LeaveRequest.findById(id);
    
    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Check if already processed
    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Leave request has already been ${leaveRequest.status}`
      });
    }

    // Get admin details
    const admin = req.user;
    const adminName = admin.name?.displayName || admin.name?.firstName || admin.email;

    // Update status
    if (status === 'approved') {
      await leaveRequest.approve(req.user._id, adminName, adminComments);
    } else {
      await leaveRequest.reject(req.user._id, adminName, adminComments);
    }

    res.status(200).json({
      success: true,
      message: `Leave request ${status} successfully`,
      data: {
        leaveRequest
      }
    });

  } catch (error) {
    console.error('Error updating leave request status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update leave request status',
      error: error.message
    });
  }
};

// Get single leave request details
exports.getLeaveRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolCode = req.user.schoolCode;
    
    if (!schoolCode) {
      return res.status(400).json({
        success: false,
        message: 'School code not found'
      });
    }
    
    // Get school-specific database connection
    const schoolConnection = await DatabaseManager.getSchoolConnection(schoolCode.toUpperCase());
    const LeaveRequest = schoolConnection.models.LeaveRequest || 
                        schoolConnection.model('LeaveRequest', leaveRequestSchema);
    
    const leaveRequest = await LeaveRequest.findById(id)
      .populate('teacherId', 'name email userId')
      .populate('reviewedBy', 'name email')
      .select('-__v');

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Verify user has access to this leave request
    const isTeacher = req.user._id.toString() === leaveRequest.teacherId._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isTeacher && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view this leave request'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        leaveRequest
      }
    });

  } catch (error) {
    console.error('Error fetching leave request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave request',
      error: error.message
    });
  }
};

// Delete leave request (Teacher - only if pending)
exports.deleteLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolCode = req.user.schoolCode;
    
    if (!schoolCode) {
      return res.status(400).json({
        success: false,
        message: 'School code not found'
      });
    }
    
    // Get school-specific database connection
    const schoolConnection = await DatabaseManager.getSchoolConnection(schoolCode.toUpperCase());
    const LeaveRequest = schoolConnection.models.LeaveRequest || 
                        schoolConnection.model('LeaveRequest', leaveRequestSchema);
    
    const leaveRequest = await LeaveRequest.findById(id);

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Verify teacher owns this request
    if (leaveRequest.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to delete this leave request'
      });
    }

    // Only allow deletion if pending
    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Can only delete pending leave requests'
      });
    }

    await leaveRequest.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Leave request deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting leave request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete leave request',
      error: error.message
    });
  }
};

// Get leave request statistics (Admin)
exports.getLeaveRequestStats = async (req, res) => {
  try {
    const schoolCode = req.user.schoolCode;

    if (!schoolCode) {
      return res.status(400).json({
        success: false,
        message: 'School code not found'
      });
    }

    // Get school-specific database connection
    const schoolConnection = await DatabaseManager.getSchoolConnection(schoolCode.toUpperCase());
    const LeaveRequest = schoolConnection.models.LeaveRequest || 
                        schoolConnection.model('LeaveRequest', leaveRequestSchema);

    const stats = await LeaveRequest.aggregate([
      {
        $match: {}
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const formattedStats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    };

    stats.forEach(stat => {
      formattedStats[stat._id] = stat.count;
      formattedStats.total += stat.count;
    });

    res.status(200).json({
      success: true,
      data: {
        stats: formattedStats
      }
    });

  } catch (error) {
    console.error('Error fetching leave request stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave request statistics',
      error: error.message
    });
  }
};
