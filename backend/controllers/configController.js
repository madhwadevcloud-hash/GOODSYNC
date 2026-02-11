const School = require('../models/School');
const User = require('../models/User');
const Subject = require('../models/Subject');

// Get school configuration data (subjects, classes, sections)
exports.getSchoolConfig = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    
    // Get school details
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    // Get unique subjects from the school's subjects collection
    const subjects = await Subject.find({ schoolId }).distinct('name');
    
    // Get unique classes and sections from users
    const classesAndSections = await User.aggregate([
      { $match: { schoolId, role: 'student' } },
      {
        $group: {
          _id: {
            class: '$studentDetails.currentClass',
            section: '$studentDetails.currentSection'
          }
        }
      },
      {
        $group: {
          _id: '$_id.class',
          sections: { $push: '$_id.section' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get unique sections across all classes
    const allSections = await User.distinct('studentDetails.currentSection', {
      schoolId,
      role: 'student'
    });

    res.json({
      school: {
        name: school.name,
        code: school.code,
        academicYear: school.academicYear || '2024-25'
      },
      subjects: subjects.sort(),
      classes: classesAndSections.map(item => ({
        name: item._id,
        sections: item.sections.sort()
      })).sort((a, b) => a.name.localeCompare(b.name)),
      sections: allSections.sort(),
      academicYears: ['2024-25', '2025-26', '2026-27'],
      terms: ['Term 1', 'Term 2', 'Term 3']
    });

  } catch (error) {
    console.error('Error fetching school config:', error);
    res.status(500).json({ message: 'Error fetching school configuration', error: error.message });
  }
};

// Get assignment statistics for dashboard
exports.getAssignmentDashboardStats = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const Assignment = require('../models/Assignment');
    
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get assignment counts by status
    const stats = await Assignment.aggregate([
      { $match: { schoolId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get overdue assignments
    const overdueCount = await Assignment.countDocuments({
      schoolId,
      dueDate: { $lt: now },
      status: 'active'
    });

    // Get assignments due this week
    const dueThisWeekCount = await Assignment.countDocuments({
      schoolId,
      dueDate: { $gte: now, $lte: oneWeekFromNow },
      status: 'active'
    });

    // Get total assignments
    const totalCount = await Assignment.countDocuments({ schoolId });

    // Convert stats array to object
    const statsObj = stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    res.json({
      total: totalCount,
      active: statsObj.active || 0,
      completed: statsObj.completed || 0,
      archived: statsObj.archived || 0,
      overdue: overdueCount,
      dueThisWeek: dueThisWeekCount
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Error fetching dashboard stats', error: error.message });
  }
};
