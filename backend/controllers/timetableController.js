const Timetable = require('../models/Timetable');
const Subject = require('../models/Subject');
const Class = require('../models/Class');
const User = require('../models/User');
const { gradeSystem, gradeUtils } = require('../utils/gradeSystem');

// Create smart timetable with conflict detection
exports.createSmartTimetable = async (req, res) => {
  try {
    const {
      class: className,
      section,
      academicYear,
      effectiveFrom,
      weeklySchedule,
      autoResolveConflicts = false
    } = req.body;

    const schoolCode = req.user.schoolCode;
    const schoolId = req.user.schoolId;

    // Validate required fields
    if (!className || !section || !weeklySchedule) {
      return res.status(400).json({
        message: 'Class, section, and weekly schedule are required'
      });
    }

    // Find the class
    const classDoc = await Class.findOne({
      schoolCode,
      grade: className,
      section,
      academicYear: academicYear || '2024-25',
      'settings.isActive': true
    });

    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Get applicable subjects for the grade
    const subjects = await Subject.find({
      schoolCode,
      'applicableGrades.grade': className,
      isActive: true,
      academicYear: academicYear || '2024-25'
    }).populate('teacherAssignments.teacherId');

    // Conflict detection results
    let conflicts = [];
    let suggestions = [];

    // Process each day in the weekly schedule
    for (let daySchedule of weeklySchedule) {
      const dayConflicts = await detectDayConflicts(
        daySchedule, subjects, schoolCode, academicYear || '2024-25'
      );
      
      conflicts = conflicts.concat(dayConflicts);

      // Generate suggestions for conflict resolution
      if (dayConflicts.length > 0 && autoResolveConflicts) {
        const daySuggestions = await generateConflictResolutions(
          daySchedule, dayConflicts, subjects
        );
        suggestions = suggestions.concat(daySuggestions);
      }
    }

    // If conflicts exist and auto-resolve is enabled, apply suggestions
    if (conflicts.length > 0 && autoResolveConflicts) {
      weeklySchedule = applyConflictResolutions(weeklySchedule, suggestions);
      conflicts = []; // Clear conflicts as they're resolved
    }

    // Create timetable
    const timetableData = {
      schoolId,
      schoolCode,
      academicYear: academicYear || '2024-25',
      class: className,
      section,
      classSection: `${className}${section}`,
      effectiveFrom: effectiveFrom || new Date(),
      weeklySchedule: await enhanceWeeklySchedule(weeklySchedule, subjects, schoolCode),
      status: conflicts.length > 0 ? 'draft' : 'active',
      createdBy: req.user._id
    };

    const timetable = new Timetable(timetableData);
    await timetable.save();

    res.status(201).json({
      success: true,
      message: conflicts.length > 0 ? 
        'Timetable created with conflicts (saved as draft)' : 
        'Timetable created successfully',
      timetable: {
        id: timetable._id,
        timetableId: timetable.timetableId,
        classSection: timetable.classSection,
        status: timetable.status,
        totalPeriods: calculateTotalPeriods(timetable.weeklySchedule)
      },
      conflicts,
      suggestions: autoResolveConflicts ? [] : suggestions
    });

  } catch (error) {
    console.error('Error creating smart timetable:', error);
    res.status(500).json({ message: 'Error creating timetable', error: error.message });
  }
};

// Detect conflicts in a day's schedule
const detectDayConflicts = async (daySchedule, subjects, schoolCode, academicYear) => {
  const conflicts = [];
  const teacherSchedule = new Map();
  const roomSchedule = new Map();

  for (let period of daySchedule.periods) {
    // Skip breaks
    if (period.isBreak || period.periodType === 'break') continue;

    // Check teacher conflicts
    if (period.teacherId) {
      const timeSlot = `${period.startTime}-${period.endTime}`;
      
      if (teacherSchedule.has(period.teacherId)) {
        const existingSlots = teacherSchedule.get(period.teacherId);
        if (existingSlots.includes(timeSlot)) {
          conflicts.push({
            type: 'teacher_conflict',
            day: daySchedule.dayOfWeek,
            period: period.periodNumber,
            timeSlot,
            teacherId: period.teacherId,
            teacherName: period.teacherName,
            message: `Teacher ${period.teacherName} is already assigned at ${timeSlot}`
          });
        } else {
          existingSlots.push(timeSlot);
        }
      } else {
        teacherSchedule.set(period.teacherId, [timeSlot]);
      }

      // Check teacher workload for the day
      const teacherDayPeriods = daySchedule.periods.filter(p => 
        p.teacherId && p.teacherId.toString() === period.teacherId.toString() && !p.isBreak
      ).length;

      if (teacherDayPeriods > 6) { // Max 6 periods per day
        conflicts.push({
          type: 'teacher_overload',
          day: daySchedule.dayOfWeek,
          teacherId: period.teacherId,
          teacherName: period.teacherName,
          periodsCount: teacherDayPeriods,
          message: `Teacher ${period.teacherName} has ${teacherDayPeriods} periods (exceeds max 6)`
        });
      }
    }

    // Check classroom conflicts
    if (period.classroom && period.classroom.roomNumber) {
      const roomKey = period.classroom.roomNumber;
      const timeSlot = `${period.startTime}-${period.endTime}`;
      
      if (roomSchedule.has(roomKey)) {
        const existingSlots = roomSchedule.get(roomKey);
        if (existingSlots.includes(timeSlot)) {
          conflicts.push({
            type: 'room_conflict',
            day: daySchedule.dayOfWeek,
            period: period.periodNumber,
            timeSlot,
            room: roomKey,
            message: `Room ${roomKey} is already booked at ${timeSlot}`
          });
        } else {
          existingSlots.push(timeSlot);
        }
      } else {
        roomSchedule.set(roomKey, [timeSlot]);
      }
    }

    // Check subject-teacher assignment
    const subject = subjects.find(s => s.subjectCode === period.subjectCode);
    if (subject) {
      const teacherAssignment = subject.teacherAssignments.find(ta => 
        ta.teacherId.toString() === period.teacherId.toString() && ta.assignmentHistory.isActive
      );

      if (!teacherAssignment) {
        conflicts.push({
          type: 'subject_assignment',
          day: daySchedule.dayOfWeek,
          period: period.periodNumber,
          subjectCode: period.subjectCode,
          teacherId: period.teacherId,
          message: `Teacher is not assigned to subject ${period.subjectCode}`
        });
      }
    }
  }

  return conflicts;
};

// Generate conflict resolution suggestions
const generateConflictResolutions = async (daySchedule, conflicts, subjects) => {
  const suggestions = [];

  for (let conflict of conflicts) {
    switch (conflict.type) {
      case 'teacher_conflict':
        // Find alternative teachers for the subject
        const subject = subjects.find(s => s.subjectCode === conflict.subjectCode);
        if (subject) {
          const alternativeTeachers = subject.teacherAssignments.filter(ta => 
            ta.assignmentHistory.isActive && 
            ta.teacherId.toString() !== conflict.teacherId.toString()
          );

          if (alternativeTeachers.length > 0) {
            suggestions.push({
              conflictType: 'teacher_conflict',
              day: conflict.day,
              period: conflict.period,
              action: 'replace_teacher',
              originalTeacher: conflict.teacherId,
              suggestedTeacher: alternativeTeachers[0].teacherId,
              suggestedTeacherName: alternativeTeachers[0].teacherName
            });
          }
        }
        break;

      case 'room_conflict':
        // Suggest alternative rooms
        suggestions.push({
          conflictType: 'room_conflict',
          day: conflict.day,
          period: conflict.period,
          action: 'change_room',
          originalRoom: conflict.room,
          suggestedRooms: ['Room-101', 'Room-102', 'Room-103'] // In real implementation, check availability
        });
        break;

      case 'teacher_overload':
        // Suggest redistributing periods
        suggestions.push({
          conflictType: 'teacher_overload',
          day: conflict.day,
          teacherId: conflict.teacherId,
          action: 'redistribute_periods',
          message: 'Consider moving some periods to other days'
        });
        break;
    }
  }

  return suggestions;
};

// Apply conflict resolutions to weekly schedule
const applyConflictResolutions = (weeklySchedule, suggestions) => {
  // This is a simplified implementation
  // In practice, this would intelligently apply the suggestions
  
  for (let suggestion of suggestions) {
    const daySchedule = weeklySchedule.find(d => d.dayOfWeek === suggestion.day);
    if (daySchedule) {
      const period = daySchedule.periods.find(p => p.periodNumber === suggestion.period);
      if (period) {
        switch (suggestion.action) {
          case 'replace_teacher':
            period.teacherId = suggestion.suggestedTeacher;
            period.teacherName = suggestion.suggestedTeacherName;
            break;
          case 'change_room':
            if (suggestion.suggestedRooms && suggestion.suggestedRooms.length > 0) {
              period.classroom.roomNumber = suggestion.suggestedRooms[0];
            }
            break;
        }
      }
    }
  }

  return weeklySchedule;
};

// Enhance weekly schedule with additional data
const enhanceWeeklySchedule = async (weeklySchedule, subjects, schoolCode) => {
  for (let daySchedule of weeklySchedule) {
    for (let period of daySchedule.periods) {
      if (!period.isBreak) {
        // Add subject details
        const subject = subjects.find(s => s.subjectCode === period.subjectCode);
        if (subject) {
          period.subjectName = subject.subjectName;
          period.subjectType = subject.subjectType;
          
          // Add teacher details from subject assignment
          const teacherAssignment = subject.teacherAssignments.find(ta => 
            ta.teacherId.toString() === period.teacherId.toString() && ta.assignmentHistory.isActive
          );
          
          if (teacherAssignment) {
            period.teacherCode = teacherAssignment.employeeId;
          }
        }

        // Generate period ID
        period.periodId = `${schoolCode}_${period.subjectCode}_${daySchedule.dayOfWeek}_P${period.periodNumber}`;
      }
    }

    // Calculate day summary
    daySchedule.totalPeriods = daySchedule.periods.filter(p => !p.isBreak).length;
    daySchedule.totalWorkingHours = calculateDayWorkingHours(daySchedule.periods);
  }

  return weeklySchedule;
};

// Calculate total periods in timetable
const calculateTotalPeriods = (weeklySchedule) => {
  return weeklySchedule.reduce((total, day) => 
    total + day.periods.filter(p => !p.isBreak).length, 0
  );
};

// Calculate working hours for a day
const calculateDayWorkingHours = (periods) => {
  if (periods.length === 0) return 0;
  
  const workingPeriods = periods.filter(p => !p.isBreak);
  if (workingPeriods.length === 0) return 0;
  
  // Simple calculation: number of periods * average period duration
  return workingPeriods.length * 0.75; // Assuming 45-minute periods
};

// Get timetable with conflict analysis
exports.getTimetableWithAnalysis = async (req, res) => {
  try {
    const { classSection } = req.params;
    const { academicYear } = req.query;

    const schoolCode = req.user.schoolCode;

    const timetable = await Timetable.findOne({
      schoolCode,
      classSection,
      academicYear: academicYear || '2024-25',
      status: { $in: ['active', 'draft'] }
    }).populate([
      {
        path: 'weeklySchedule.periods.teacherId',
        select: 'name teacherDetails.employeeId'
      }
    ]);

    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }

    // Analyze timetable efficiency
    const analysis = await analyzeTimetableEfficiency(timetable, schoolCode);

    res.json({
      success: true,
      timetable,
      analysis
    });

  } catch (error) {
    console.error('Error fetching timetable with analysis:', error);
    res.status(500).json({ message: 'Error fetching timetable', error: error.message });
  }
};

// Analyze timetable efficiency
const analyzeTimetableEfficiency = async (timetable, schoolCode) => {
  const analysis = {
    totalPeriods: 0,
    subjectDistribution: {},
    teacherWorkload: {},
    efficiency: {
      score: 0,
      issues: []
    }
  };

  // Analyze each day
  for (let daySchedule of timetable.weeklySchedule) {
    const workingPeriods = daySchedule.periods.filter(p => !p.isBreak);
    analysis.totalPeriods += workingPeriods.length;

    // Subject distribution
    for (let period of workingPeriods) {
      if (period.subjectCode) {
        analysis.subjectDistribution[period.subjectCode] = 
          (analysis.subjectDistribution[period.subjectCode] || 0) + 1;
      }

      // Teacher workload
      if (period.teacherId) {
        analysis.teacherWorkload[period.teacherId] = 
          (analysis.teacherWorkload[period.teacherId] || 0) + 1;
      }
    }

    // Check for efficiency issues
    if (workingPeriods.length < 6) {
      analysis.efficiency.issues.push({
        type: 'underutilized_day',
        day: daySchedule.dayOfWeek,
        periods: workingPeriods.length,
        message: `Only ${workingPeriods.length} periods scheduled`
      });
    }

    // Check for consecutive subject issues
    const consecutiveSubjects = checkConsecutiveSubjects(workingPeriods);
    if (consecutiveSubjects.length > 0) {
      analysis.efficiency.issues.push({
        type: 'consecutive_subjects',
        day: daySchedule.dayOfWeek,
        subjects: consecutiveSubjects
      });
    }
  }

  // Calculate efficiency score
  analysis.efficiency.score = calculateEfficiencyScore(analysis);

  return analysis;
};

// Check for consecutive subject issues
const checkConsecutiveSubjects = (periods) => {
  const issues = [];
  for (let i = 0; i < periods.length - 2; i++) {
    if (periods[i].subjectCode === periods[i + 1].subjectCode && 
        periods[i].subjectCode === periods[i + 2].subjectCode) {
      issues.push({
        subject: periods[i].subjectCode,
        startPeriod: periods[i].periodNumber,
        count: 3
      });
    }
  }
  return issues;
};

// Calculate efficiency score
const calculateEfficiencyScore = (analysis) => {
  let score = 100;
  
  // Deduct points for issues
  score -= analysis.efficiency.issues.length * 10;
  
  // Check subject balance
  const subjectCounts = Object.values(analysis.subjectDistribution);
  const maxSubject = Math.max(...subjectCounts);
  const minSubject = Math.min(...subjectCounts);
  
  if (maxSubject - minSubject > 5) {
    score -= 15; // Unbalanced subject distribution
  }

  return Math.max(0, score);
};

// Create substitute arrangement
exports.createSubstituteArrangement = async (req, res) => {
  try {
    const { timetableId, periodId, substituteTeacherId, reason } = req.body;

    const schoolCode = req.user.schoolCode;

    // Find timetable
    const timetable = await Timetable.findOne({
      _id: timetableId,
      schoolCode
    });

    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }

    // Find the specific period
    let targetPeriod = null;
    for (let daySchedule of timetable.weeklySchedule) {
      const period = daySchedule.periods.find(p => p.periodId === periodId);
      if (period) {
        targetPeriod = period;
        break;
      }
    }

    if (!targetPeriod) {
      return res.status(404).json({ message: 'Period not found' });
    }

    // Validate substitute teacher
    const substituteTeacher = await User.findOne({
      _id: substituteTeacherId,
      role: 'teacher',
      schoolCode,
      isActive: true
    });

    if (!substituteTeacher) {
      return res.status(404).json({ message: 'Substitute teacher not found' });
    }

    // Create substitution
    targetPeriod.substitution = {
      isSubstituted: true,
      originalTeacherId: targetPeriod.teacherId,
      substituteTeacherId: substituteTeacherId,
      substituteTeacherName: `${substituteTeacher.name.firstName} ${substituteTeacher.name.lastName}`,
      reason: reason,
      arrangedBy: req.user._id,
      arrangedAt: new Date()
    };

    await timetable.save();

    res.json({
      success: true,
      message: 'Substitute arrangement created successfully',
      substitution: targetPeriod.substitution
    });

  } catch (error) {
    console.error('Error creating substitute arrangement:', error);
    res.status(500).json({ message: 'Error creating substitute arrangement', error: error.message });
  }
};

module.exports = {
  createSmartTimetable: exports.createSmartTimetable,
  getTimetableWithAnalysis: exports.getTimetableWithAnalysis,
  createSubstituteArrangement: exports.createSubstituteArrangement
};
