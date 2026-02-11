const { model: StudentFeeRecord } = require('../models/StudentFeeRecord');
const FeeStructure = require('../models/FeeStructure');
const Message = require('../models/Message');
const reportService = require('../services/reportService');
const Result = require('../models/Result');
const { ObjectId } = require('mongodb');

// Get comprehensive school summary
exports.getSchoolSummary = async (req, res) => {
  try {
    console.log('📊 Generating comprehensive school summary');
    
    const { from, to, targetClass, targetSection } = req.query;
    
    console.log('📡 Received query params:', { from, to, targetClass, targetSection });
    
    const summary = await reportService.getSchoolSummary(
      req.user.schoolId,
      req.user.schoolCode,
      { from, to, targetClass, targetSection }
    );
    
    res.json({
      success: true,
      data: summary
    });
    
  } catch (error) {
    console.error('❌ Error generating school summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate school summary',
      error: error.message
    });
  }
};

// Get class-wise summary
exports.getClassSummary = async (req, res) => {
  try {
    console.log('📊 Generating class-wise summary');
    
    const { from, to, page = 1, limit = 20, class: targetClass, section: targetSection } = req.query;
    
    // Use getSchoolSummary with the appropriate filters
    const classSummary = await reportService.getSchoolSummary(
      req.user.schoolId,
      req.user.schoolCode,
      { 
        from, 
        to, 
        targetClass: targetClass || 'ALL',
        targetSection: targetSection || 'ALL'
      }
    );
    
    // Ensure classWiseResults exists and is an array
    const classWiseResults = Array.isArray(classSummary.classWiseResults) 
      ? classSummary.classWiseResults 
      : [];
      
    console.log('📊 Class-wise results:', JSON.stringify(classWiseResults, null, 2));
    
    // Transform the data to match frontend expectations
    const formattedData = classWiseResults.map(item => ({
      _id: `${item.class || 'N/A'}_${item.section || 'ALL'}`,
      class: item.class || 'N/A',
      section: item.section || 'ALL',
      totalStudents: item.totalStudents || 0,
      avgMarks: item.avgMarks || 0,
      totalResults: item.totalResults || 0
    }));
    
    // Add pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = pageNum * limitNum;
    
    const paginatedData = formattedData.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: {
        classes: paginatedData,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: formattedData.length,
          pages: Math.ceil(formattedData.length / limitNum)
        },
        summary: {
          total: formattedData.reduce((sum, item) => sum + (item.totalStudents || 0), 0),
          ...classSummary.summary
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error generating class summary:', {
      message: error.message,
      stack: error.stack,
      query: req.query
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate class summary',
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

// Get detailed class information
exports.getClassDetail = async (req, res) => {
  try {
    console.log('📊 Generating class detail');
    
    const { className } = req.params;
    const { section, from, to, page = 1, limit = 50, search } = req.query;
    
    const classDetail = await reportService.getClassDetail(
      req.user.schoolId,
      req.user.schoolCode,
      className,
      section,
      { from, to, page: parseInt(page), limit: parseInt(limit), search }
    );
    
    res.json({
      success: true,
      data: classDetail
    });
    
  } catch (error) {
    console.error('❌ Error generating class detail:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate class detail',
      error: error.message
    });
  }
};

// Get full student profile
exports.getStudentProfile = async (req, res) => {
  try {
    console.log('📊 Generating student profile');
    
    const { studentId } = req.params;
    
    const studentProfile = await reportService.getStudentProfile(
      req.user.schoolId,
      req.user.schoolCode,
      studentId
    );
    
    res.json({
      success: true,
      data: studentProfile
    });
    
  } catch (error) {
    console.error('❌ Error generating student profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate student profile',
      error: error.message
    });
  }
};

// Export data
exports.exportData = async (req, res) => {
  try {
    console.log('📊 Exporting data');
    
    const { type, class: targetClass, section: targetSection, academicYear, from, to } = req.query;
    
    const csvContent = await reportService.exportToCSV(
      req.user.schoolId,
      req.user.schoolCode,
      type,
      { class: targetClass, section: targetSection, academicYear, from, to }
    );
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-export-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
    
  } catch (error) {
    console.error('❌ Error exporting data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data',
      error: error.message
    });
  }
};

// Get dues list for export
exports.getDuesList = async (req, res) => {
  try {
    console.log('📋 Generating dues list for export');
    
    const { 
      class: targetClass, 
      section: targetSection, 
      status,
      academicYear,
      page = 1,
      limit = 10,
      search = ''
    } = req.query;
    
    // Get school code from user or request
    const schoolCode = req.user.schoolCode || req.schoolCode;
    if (!schoolCode) {
      return res.status(400).json({
        success: false,
        message: 'School code is required'
      });
    }

    // Get school-specific database connection
    const SchoolDatabaseManager = require('../utils/schoolDatabaseManager');
    const conn = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    const db = conn.db || conn;
    
    // Get or create model for this connection
    const StudentFeeRecord = conn.models.StudentFeeRecord || 
      conn.model('StudentFeeRecord', require('../models/StudentFeeRecord').schema);
    
    // Build query
    const query = {
      schoolId: req.user.schoolId || req.user._id,
      totalPending: { $gt: 0 } // Only records with outstanding amount
    };
    
    // Filter by academic year if provided
    if (academicYear) {
      query.academicYear = academicYear;
    }
    
    if (targetClass && targetClass !== 'ALL') {
      query.studentClass = targetClass;
    }
    
    if (targetSection && targetSection !== 'ALL') {
      query.studentSection = targetSection;
    }
    
    if (status && status !== 'ALL') {
      // Status is already in lowercase from frontend, matching the database enum
      query.status = status.toLowerCase();
    }

    // Add search functionality
    if (search) {
      query.$or = [
        { studentName: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    console.log('🔍 Query:', JSON.stringify(query, null, 2));
    
    // Get total count for pagination
    const total = await StudentFeeRecord.countDocuments(query);
    const pages = Math.ceil(total / limitNum);
    
    // Execute query with pagination
    const records = await StudentFeeRecord.find(query)
      .sort({ totalPending: -1, overdueDays: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    console.log(`📊 Found ${records.length} records out of ${total} total`);
    
    res.json({
      success: true,
      data: {
        records: records.map(record => ({
          id: record._id ? record._id.toString() : null,
          studentId: record.studentId ? record.studentId.toString() : null,
          studentName: record.studentName || 'N/A',
          studentClass: record.studentClass || 'N/A',
          studentSection: record.studentSection || 'N/A',
          rollNumber: record.rollNumber || '',
          feeStructureName: record.feeStructureName || 'N/A',
          totalAmount: record.totalAmount || 0,
          totalPaid: record.totalPaid || 0,
          totalPending: record.totalPending || 0,
          status: record.status || 'PENDING',
          paymentPercentage: record.paymentPercentage || 0,
          nextDueDate: record.nextDueDate || null,
          overdueDays: record.overdueDays || 0,
          installments: record.installments || []
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error generating dues list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate dues list',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get class-wise fee analysis
exports.getClassWiseAnalysis = async (req, res) => {
  try {
    console.log('📊 Generating class-wise fee analysis');
    
    const { academicYear } = req.query;
    
    // Build filter
    const filter = { schoolId: req.user.schoolId };
    if (academicYear) {
      filter.academicYear = academicYear;
    }
    
    // Get class-wise aggregation
    const classAnalysis = await StudentFeeRecord.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            class: '$studentClass',
            section: '$studentSection'
          },
          totalStudents: { $sum: 1 },
          totalBilled: { $sum: '$totalAmount' },
          totalCollected: { $sum: '$totalPaid' },
          totalOutstanding: { $sum: '$totalPending' },
          paidStudents: {
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] }
          },
          partialStudents: {
            $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] }
          },
          overdueStudents: {
            $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] }
          },
          avgCollectionRate: {
            $avg: {
              $cond: [
                { $gt: ['$totalAmount', 0] },
                { $divide: ['$totalPaid', '$totalAmount'] },
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          class: '$_id.class',
          section: '$_id.section',
          totalStudents: 1,
          totalBilled: 1,
          totalCollected: 1,
          totalOutstanding: 1,
          paidStudents: 1,
          partialStudents: 1,
          overdueStudents: 1,
          collectionPercentage: {
            $multiply: ['$avgCollectionRate', 100]
          },
          _id: 0
        }
      },
      { $sort: { class: 1, section: 1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        classAnalysis,
        summary: {
          totalClasses: classAnalysis.length,
          totalStudents: classAnalysis.reduce((sum, item) => sum + item.totalStudents, 0),
          totalBilled: classAnalysis.reduce((sum, item) => sum + item.totalBilled, 0),
          totalCollected: classAnalysis.reduce((sum, item) => sum + item.totalCollected, 0),
          totalOutstanding: classAnalysis.reduce((sum, item) => sum + item.totalOutstanding, 0)
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error generating class-wise analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate class-wise analysis',
      error: error.message
    });
  }
};

// Get school overview from results collection
exports.getSchoolOverview = async (req, res) => {
  try {
    console.log('📊 Fetching school overview from results collection');
    
    const { schoolId } = req.user;
    const { academicYear, class: targetClass, section: targetSection } = req.query;
    
    // Debug: Log the request details
    console.log('🔍 Request details:', {
      schoolId,
      academicYear,
      targetClass,
      targetSection
    });
    
    // Debug: Check if we have any results in the collection
    const totalResults = await Result.countDocuments({});
    console.log(`📊 Total documents in results collection: ${totalResults}`);
    
    if (totalResults === 0) {
      console.warn('⚠️ No documents found in the results collection');
    }
    
    // Build match query
    const matchQuery = {
      schoolId: new ObjectId(schoolId),
      status: 'published'
    };
    
    if (academicYear) matchQuery.academicYear = academicYear;
    if (targetClass && targetClass !== 'ALL') matchQuery.class = targetClass;
    if (targetSection && targetSection !== 'ALL') matchQuery.section = targetSection;
    
    console.log('🔍 Match query:', JSON.stringify(matchQuery, null, 2));
    
    // Debug: Check what documents match our query
    const matchingDocs = await Result.find(matchQuery).limit(1).lean();
    console.log('🔍 Sample matching document:', JSON.stringify(matchingDocs[0] || 'No matching documents', null, 2));
    
    // Get unique students and their attendance
    const results = await Result.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$student',
          totalAttendance: { $sum: '$attendancePercentage' },
          resultCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          totalStudents: { $sum: 1 },
          totalAttendance: { $sum: '$totalAttendance' },
          totalResults: { $sum: '$resultCount' }
        }
      },
      {
        $project: {
          _id: 0,
          totalStudents: 1,
          avgAttendance: {
            $cond: [
              { $gt: ['$totalResults', 0] },
              { $divide: ['$totalAttendance', '$totalResults'] },
              0
            ]
          }
        }
      }
    ]);
    
    const overview = results[0] || { totalStudents: 0, avgAttendance: 0 };
    
    console.log('📊 School overview data:', JSON.stringify(overview, null, 2));
    
    res.json({
      success: true,
      data: {
        totalStudents: overview.totalStudents,
        avgAttendance: Math.round(overview.avgAttendance * 10) / 10
      }
    });
    
  } catch (error) {
    console.error('❌ Error in getSchoolOverview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch school overview',
      error: error.message
    });
  }
};

// Get payment trends
exports.getPaymentTrends = async (req, res) => {
  try {
    console.log('📈 Generating payment trends');
    
    const { period = 'monthly', from, to } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (from) {
      dateFilter.paymentDate = { $gte: new Date(from) };
    }
    if (to) {
      dateFilter.paymentDate = { ...dateFilter.paymentDate, $lte: new Date(to) };
    }
    
    let groupBy;
    let sortBy;
    
    switch (period) {
      case 'daily':
        groupBy = {
          year: { $year: '$payments.paymentDate' },
          month: { $month: '$payments.paymentDate' },
          day: { $dayOfMonth: '$payments.paymentDate' }
        };
        sortBy = { '_id.year': 1, '_id.month': 1, '_id.day': 1 };
        break;
      case 'weekly':
        groupBy = {
          year: { $year: '$payments.paymentDate' },
          week: { $week: '$payments.paymentDate' }
        };
        sortBy = { '_id.year': 1, '_id.week': 1 };
        break;
      default: // monthly
        groupBy = {
          year: { $year: '$payments.paymentDate' },
          month: { $month: '$payments.paymentDate' }
        };
        sortBy = { '_id.year': 1, '_id.month': 1 };
    }
    
    const trends = await StudentFeeRecord.aggregate([
      { $match: { schoolId: req.user.schoolId } },
      { $unwind: '$payments' },
      { $match: { 'payments.paymentDate': { $exists: true }, ...dateFilter } },
      {
        $group: {
          _id: groupBy,
          totalAmount: { $sum: '$payments.amount' },
          paymentCount: { $sum: 1 },
          avgAmount: { $avg: '$payments.amount' }
        }
      },
      { $sort: sortBy }
    ]);
    
    // Format trends data
    const formattedTrends = trends.map(trend => ({
      period: formatPeriod(trend._id, period),
      totalAmount: trend.totalAmount,
      paymentCount: trend.paymentCount,
      avgAmount: Math.round(trend.avgAmount * 100) / 100
    }));
    
    res.json({
      success: true,
      data: {
        trends: formattedTrends,
        period,
        totalPeriods: trends.length,
        totalAmount: trends.reduce((sum, trend) => sum + trend.totalAmount, 0),
        totalPayments: trends.reduce((sum, trend) => sum + trend.paymentCount, 0)
      }
    });
    
  } catch (error) {
    console.error('❌ Error generating payment trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate payment trends',
      error: error.message
    });
  }
};

// Get students by class and section
exports.getStudentsByClassSection = async (req, res) => {
  try {
    console.log('📊 Fetching students by class and section');
    
    const { className, section, academicYear } = req.query;
    
    if (!className) {
      return res.status(400).json({
        success: false,
        message: 'Class name is required'
      });
    }
    
    console.log('📋 Query params:', { className, section, academicYear });
    
    const result = await reportService.getStudentsByClassSection(
      req.user.schoolId,
      req.user.schoolCode,
      className,
      section,
      academicYear
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error fetching students by class/section:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students',
      error: error.message
    });
  }
};

// Helper function to format period
function formatPeriod(period, type) {
  switch (type) {
    case 'daily':
      return `${period.year}-${period.month.toString().padStart(2, '0')}-${period.day.toString().padStart(2, '0')}`;
    case 'weekly':
      return `${period.year}-W${period.week.toString().padStart(2, '0')}`;
    default: // monthly
      return `${period.year}-${period.month.toString().padStart(2, '0')}`;
  }
}
