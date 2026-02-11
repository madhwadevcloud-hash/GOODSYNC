const { ObjectId } = require('mongodb');

class ReportCalculations {
  static async getTotalStudents(db, { targetClass, targetSection }) {
    try {
      const studentQuery = { 
        isActive: true,
        role: 'student' 
      };
      
      if (targetClass && targetClass !== 'ALL') {
        studentQuery['studentDetails.academic.currentClass'] = targetClass;
        if (targetSection && targetSection !== 'ALL') {
          studentQuery['studentDetails.academic.currentSection'] = targetSection;
        }
      }
      
      return await db.collection('students').countDocuments(studentQuery);
    } catch (error) {
      console.error('❌ Error in getTotalStudents:', error);
      return 0;
    }
  }

  static async getAverageAttendance(db, { targetClass, targetSection, from, to }) {
    try {
      const matchStage = {
        date: { $gte: new Date(from), $lte: new Date(to) },
        status: { $exists: true }
      };
      
      if (targetClass && targetClass !== 'ALL') {
        matchStage.class = targetClass;
        if (targetSection && targetSection !== 'ALL') {
          matchStage.section = targetSection;
        }
      }

      const attendanceStats = await db.collection('attendances').aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              studentId: "$studentId",
              date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }
            },
            status: { $first: "$status" }
          }
        },
        {
          $group: {
            _id: "$_id.studentId",
            presentDays: {
              $sum: {
                $cond: [
                  { $in: ["$status", ["present", "late", "half_day"]] },
                  1,
                  0
                ]
              }
            },
            totalDays: { $sum: 1 }
          }
        },
        {
          $project: {
            attendancePercentage: {
              $cond: [
                { $eq: ["$totalDays", 0] },
                0,
                { $multiply: [{ $divide: ["$presentDays", "$totalDays"] }, 100] }
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgAttendance: { $avg: "$attendancePercentage" }
          }
        }
      ]).toArray();

      return attendanceStats[0]?.avgAttendance || 0;
    } catch (error) {
      console.error('❌ Error in getAverageAttendance:', error);
      return 0;
    }
  }

  static async getAverageMarks(db, { targetClass, targetSection }) {
    try {
      const currentYear = new Date().getFullYear();
      const academicYear = `${currentYear}-${currentYear + 1}`;
      
      const matchStage = { 
        academicYear,
        'subjects.percentage': { $exists: true, $ne: null }
      };
      
      if (targetClass && targetClass !== 'ALL') {
        matchStage['class'] = targetClass;
        if (targetSection && targetSection !== 'ALL') {
          matchStage['section'] = targetSection;
        }
      }

      // First, get all matching results
      const results = await db.collection('results')
        .find(matchStage)
        .toArray();

      // If no results found, return 0
      if (!results || results.length === 0) {
        return 0;
      }

      // Calculate average percentage across all subjects for each student
      const studentAverages = results.map(result => {
        if (!result.subjects || result.subjects.length === 0) return null;
        
        const totalPercentage = result.subjects.reduce((sum, subject) => {
          return sum + (subject.percentage || 0);
        }, 0);
        
        return totalPercentage / result.subjects.length;
      }).filter(avg => avg !== null);

      // Calculate overall average
      if (studentAverages.length === 0) return 0;
      
      const overallAverage = studentAverages.reduce((sum, avg) => sum + avg, 0) / studentAverages.length;
      
      // Round to 2 decimal places
      return parseFloat(overallAverage.toFixed(2));
    } catch (error) {
      console.error('❌ Error in getAverageMarks:', error);
      return 0;
    }
  }
}

module.exports = ReportCalculations;