// Grade/Standard Management System
// Comprehensive grade structure for Indian education system

const gradeSystem = {
  // School Level Categories
  schoolLevels: {
    elementary: {
      name: 'Elementary School',
      description: 'Foundational learning years',
      grades: ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5'],
      ageRange: '3-10 years',
      features: {
        playBasedLearning: true,
        basicSubjects: true,
        noBoards: true,
        parentTeacherMeeting: 'monthly',
        assessmentType: 'continuous'
      }
    },
    middle: {
      name: 'Middle School',
      description: 'Transitional learning phase',
      grades: ['6', '7', '8'],
      ageRange: '11-13 years',
      features: {
        subjectSpecialization: true,
        projectBasedLearning: true,
        extracurricular: true,
        parentTeacherMeeting: 'quarterly',
        assessmentType: 'mixed'
      }
    },
    high: {
      name: 'High School',
      description: 'Secondary education with board preparation',
      grades: ['9', '10'],
      ageRange: '14-15 years',
      features: {
        boardPreparation: true,
        careerGuidance: true,
        competitiveExamPrep: true,
        parentTeacherMeeting: 'monthly',
        assessmentType: 'formal',
        boards: ['CBSE', 'ICSE', 'State Board']
      }
    },
    higherSecondary: {
      name: 'Higher Secondary School',
      description: 'Pre-university education with stream selection',
      grades: ['11', '12'],
      ageRange: '16-17 years',
      features: {
        streamSelection: true,
        collegePreparation: true,
        competitiveExamFocus: true,
        parentTeacherMeeting: 'biweekly',
        assessmentType: 'rigorous',
        boards: ['CBSE', 'ICSE', 'State Board'],
        streams: ['Science', 'Commerce', 'Arts', 'Vocational']
      }
    }
  },

  // Detailed Grade Structure
  gradeStructure: {
    'Nursery': {
      level: 'elementary',
      displayName: 'Nursery',
      ageGroup: '3-4 years',
      subjects: ['Play Activities', 'Rhymes & Songs', 'Story Telling', 'Art & Craft', 'Physical Development'],
      maxStudentsPerSection: 20,
      assessmentType: 'observation',
      promotionCriteria: 'age_based'
    },
    'LKG': {
      level: 'elementary',
      displayName: 'Lower Kindergarten',
      ageGroup: '4-5 years',
      subjects: ['English', 'Mathematics', 'Environmental Studies', 'Art & Craft', 'Physical Education', 'Moral Science'],
      maxStudentsPerSection: 25,
      assessmentType: 'observation',
      promotionCriteria: 'age_based'
    },
    'UKG': {
      level: 'elementary',
      displayName: 'Upper Kindergarten',
      ageGroup: '5-6 years',
      subjects: ['English', 'Mathematics', 'Environmental Studies', 'Art & Craft', 'Physical Education', 'Moral Science', 'Computer Basics'],
      maxStudentsPerSection: 25,
      assessmentType: 'basic_assessment',
      promotionCriteria: 'readiness_based'
    },
    '1': {
      level: 'elementary',
      displayName: 'Class 1',
      ageGroup: '6-7 years',
      subjects: ['English', 'Mathematics', 'Environmental Studies', 'Hindi', 'Art & Craft', 'Physical Education', 'Moral Science', 'Computer'],
      maxStudentsPerSection: 30,
      assessmentType: 'continuous',
      promotionCriteria: 'performance_based',
      hasExams: false
    },
    '2': {
      level: 'elementary',
      displayName: 'Class 2',
      ageGroup: '7-8 years',
      subjects: ['English', 'Mathematics', 'Environmental Studies', 'Hindi', 'Art & Craft', 'Physical Education', 'Moral Science', 'Computer'],
      maxStudentsPerSection: 30,
      assessmentType: 'continuous',
      promotionCriteria: 'performance_based',
      hasExams: true,
      examTypes: ['Unit Tests', 'Term Exams']
    },
    '3': {
      level: 'elementary',
      displayName: 'Class 3',
      ageGroup: '8-9 years',
      subjects: ['English', 'Mathematics', 'Environmental Studies', 'Hindi', 'Science', 'Social Studies', 'Art & Craft', 'Physical Education', 'Moral Science', 'Computer'],
      maxStudentsPerSection: 32,
      assessmentType: 'formal',
      promotionCriteria: 'performance_based',
      hasExams: true,
      examTypes: ['Unit Tests', 'Mid Term', 'Final Exam']
    },
    '4': {
      level: 'elementary',
      displayName: 'Class 4',
      ageGroup: '9-10 years',
      subjects: ['English', 'Mathematics', 'Science', 'Social Studies', 'Hindi', 'Art & Craft', 'Physical Education', 'Moral Science', 'Computer'],
      maxStudentsPerSection: 32,
      assessmentType: 'formal',
      promotionCriteria: 'performance_based',
      hasExams: true,
      examTypes: ['Unit Tests', 'Mid Term', 'Final Exam']
    },
    '5': {
      level: 'elementary',
      displayName: 'Class 5',
      ageGroup: '10-11 years',
      subjects: ['English', 'Mathematics', 'Science', 'Social Studies', 'Hindi', 'Art & Craft', 'Physical Education', 'Moral Science', 'Computer'],
      maxStudentsPerSection: 35,
      assessmentType: 'formal',
      promotionCriteria: 'performance_based',
      hasExams: true,
      examTypes: ['Unit Tests', 'Mid Term', 'Final Exam'],
      isTransitionGrade: true,
      transitionTo: 'middle'
    },
    '6': {
      level: 'middle',
      displayName: 'Class 6',
      ageGroup: '11-12 years',
      subjects: ['English', 'Mathematics', 'Science', 'Social Studies', 'Hindi', 'Sanskrit/Third Language', 'Art & Craft', 'Physical Education', 'Computer'],
      maxStudentsPerSection: 35,
      assessmentType: 'comprehensive',
      promotionCriteria: 'performance_based',
      hasExams: true,
      examTypes: ['Unit Tests', 'Mid Term', 'Final Exam'],
      features: ['Subject Teachers', 'Lab Work', 'Projects']
    },
    '7': {
      level: 'middle',
      displayName: 'Class 7',
      ageGroup: '12-13 years',
      subjects: ['English', 'Mathematics', 'Science', 'Social Studies', 'Hindi', 'Sanskrit/Third Language', 'Art & Craft', 'Physical Education', 'Computer'],
      maxStudentsPerSection: 35,
      assessmentType: 'comprehensive',
      promotionCriteria: 'performance_based',
      hasExams: true,
      examTypes: ['Unit Tests', 'Mid Term', 'Final Exam'],
      features: ['Subject Teachers', 'Lab Work', 'Projects', 'Extracurricular']
    },
    '8': {
      level: 'middle',
      displayName: 'Class 8',
      ageGroup: '13-14 years',
      subjects: ['English', 'Mathematics', 'Science', 'Social Studies', 'Hindi', 'Sanskrit/Third Language', 'Art & Craft', 'Physical Education', 'Computer'],
      maxStudentsPerSection: 35,
      assessmentType: 'comprehensive',
      promotionCriteria: 'performance_based',
      hasExams: true,
      examTypes: ['Unit Tests', 'Mid Term', 'Final Exam'],
      features: ['Subject Teachers', 'Lab Work', 'Projects', 'Career Guidance'],
      isTransitionGrade: true,
      transitionTo: 'high'
    },
    '9': {
      level: 'high',
      displayName: 'Class 9',
      ageGroup: '14-15 years',
      subjects: ['English', 'Mathematics', 'Science', 'Social Studies', 'Hindi', 'Sanskrit/Third Language', 'Physical Education', 'Computer'],
      maxStudentsPerSection: 40,
      assessmentType: 'board_pattern',
      promotionCriteria: 'strict_performance',
      hasExams: true,
      examTypes: ['Unit Tests', 'Mid Term', 'Pre-Board', 'Final Exam'],
      features: ['Board Preparation', 'Career Counseling', 'Competitive Exam Prep'],
      boardAffiliation: true
    },
    '10': {
      level: 'high',
      displayName: 'Class 10',
      ageGroup: '15-16 years',
      subjects: ['English', 'Mathematics', 'Science', 'Social Studies', 'Hindi', 'Sanskrit/Third Language', 'Physical Education', 'Computer'],
      maxStudentsPerSection: 40,
      assessmentType: 'board_pattern',
      promotionCriteria: 'board_exam',
      hasExams: true,
      examTypes: ['Unit Tests', 'Mid Term', 'Pre-Board', 'Board Exam'],
      features: ['Board Preparation', 'Stream Selection Guidance', 'Competitive Exam Prep'],
      boardAffiliation: true,
      isBoardYear: true,
      isTransitionGrade: true,
      transitionTo: 'higherSecondary'
    },
    '11': {
      level: 'higherSecondary',
      displayName: 'Class 11',
      ageGroup: '16-17 years',
      streams: {
        'Science': {
          subjects: ['English', 'Physics', 'Chemistry', 'Mathematics', 'Biology/Computer Science', 'Physical Education'],
          optionalSubjects: ['Psychology', 'Economics', 'Physical Education'],
          careerPaths: ['Engineering', 'Medical', 'Research', 'Technology']
        },
        'Commerce': {
          subjects: ['English', 'Accountancy', 'Business Studies', 'Economics', 'Mathematics/Informatics Practices', 'Physical Education'],
          optionalSubjects: ['Psychology', 'Legal Studies', 'Entrepreneurship'],
          careerPaths: ['CA', 'CS', 'Business', 'Banking', 'Finance']
        },
        'Arts': {
          subjects: ['English', 'History', 'Political Science', 'Geography', 'Economics/Psychology', 'Physical Education'],
          optionalSubjects: ['Sociology', 'Philosophy', 'Fine Arts', 'Music'],
          careerPaths: ['Civil Services', 'Teaching', 'Journalism', 'Social Work']
        }
      },
      maxStudentsPerSection: 30,
      assessmentType: 'board_pattern',
      promotionCriteria: 'performance_based',
      hasExams: true,
      examTypes: ['Unit Tests', 'Mid Term', 'Pre-Board', 'Final Exam'],
      features: ['Stream Specialization', 'Career Counseling', 'Competitive Exam Prep', 'College Guidance'],
      boardAffiliation: true
    },
    '12': {
      level: 'higherSecondary',
      displayName: 'Class 12',
      ageGroup: '17-18 years',
      streams: {
        'Science': {
          subjects: ['English', 'Physics', 'Chemistry', 'Mathematics', 'Biology/Computer Science', 'Physical Education'],
          optionalSubjects: ['Psychology', 'Economics', 'Physical Education'],
          competitiveExams: ['JEE', 'NEET', 'BITSAT', 'State CET']
        },
        'Commerce': {
          subjects: ['English', 'Accountancy', 'Business Studies', 'Economics', 'Mathematics/Informatics Practices', 'Physical Education'],
          optionalSubjects: ['Psychology', 'Legal Studies', 'Entrepreneurship'],
          competitiveExams: ['CA Foundation', 'CLAT', 'BBA Entrance', 'IPM']
        },
        'Arts': {
          subjects: ['English', 'History', 'Political Science', 'Geography', 'Economics/Psychology', 'Physical Education'],
          optionalSubjects: ['Sociology', 'Philosophy', 'Fine Arts', 'Music'],
          competitiveExams: ['UPSC', 'State PSC', 'CLAT', 'Journalism Entrance']
        }
      },
      maxStudentsPerSection: 30,
      assessmentType: 'board_pattern',
      promotionCriteria: 'board_exam',
      hasExams: true,
      examTypes: ['Unit Tests', 'Mid Term', 'Pre-Board', 'Board Exam'],
      features: ['Board Preparation', 'College Applications', 'Competitive Exam Prep', 'Career Placement'],
      boardAffiliation: true,
      isBoardYear: true,
      isGraduationYear: true
    }
  },

  // Grading Systems by Level
  gradingSystems: {
    elementary: {
      type: 'descriptive',
      scale: ['Excellent', 'Very Good', 'Good', 'Satisfactory', 'Needs Improvement'],
      description: 'Observation-based assessment focusing on overall development'
    },
    middle: {
      type: 'grade_points',
      scale: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'E'],
      points: {
        'A+': { min: 91, max: 100, points: 10 },
        'A': { min: 81, max: 90, points: 9 },
        'B+': { min: 71, max: 80, points: 8 },
        'B': { min: 61, max: 70, points: 7 },
        'C+': { min: 51, max: 60, points: 6 },
        'C': { min: 41, max: 50, points: 5 },
        'D': { min: 33, max: 40, points: 4 },
        'E': { min: 0, max: 32, points: 0 }
      },
      passingGrade: 'D',
      description: 'Grade point system with letter grades'
    },
    high: {
      type: 'percentage_with_grades',
      scale: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2'],
      points: {
        'A1': { min: 91, max: 100, points: 10 },
        'A2': { min: 81, max: 90, points: 9 },
        'B1': { min: 71, max: 80, points: 8 },
        'B2': { min: 61, max: 70, points: 7 },
        'C1': { min: 51, max: 60, points: 6 },
        'C2': { min: 41, max: 50, points: 5 },
        'D1': { min: 33, max: 40, points: 4 },
        'D2': { min: 21, max: 32, points: 3 },
        'E1': { min: 21, max: 32, points: 2 },
        'E2': { min: 0, max: 20, points: 1 }
      },
      passingGrade: 'D1',
      description: 'CBSE pattern grading system'
    },
    higherSecondary: {
      type: 'percentage_with_grades',
      scale: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2'],
      points: {
        'A1': { min: 91, max: 100, points: 10 },
        'A2': { min: 81, max: 90, points: 9 },
        'B1': { min: 71, max: 80, points: 8 },
        'B2': { min: 61, max: 70, points: 7 },
        'C1': { min: 51, max: 60, points: 6 },
        'C2': { min: 41, max: 50, points: 5 },
        'D1': { min: 33, max: 40, points: 4 },
        'D2': { min: 21, max: 32, points: 3 },
        'E1': { min: 21, max: 32, points: 2 },
        'E2': { min: 0, max: 20, points: 1 }
      },
      passingGrade: 'D1',
      description: 'Board pattern grading with percentage'
    }
  },

  // Assessment Patterns
  assessmentPatterns: {
    elementary: {
      continuous: 60,
      periodic: 40,
      components: {
        'Portfolio': 20,
        'Projects': 20,
        'Oral Assessment': 20,
        'Written Assessment': 40
      }
    },
    middle: {
      continuous: 40,
      periodic: 60,
      components: {
        'Assignments': 10,
        'Projects': 10,
        'Class Tests': 20,
        'Mid Term': 30,
        'Final Exam': 30
      }
    },
    high: {
      continuous: 20,
      periodic: 80,
      components: {
        'Assignments': 5,
        'Class Tests': 15,
        'Mid Term': 30,
        'Final Exam': 50
      }
    },
    higherSecondary: {
      continuous: 20,
      periodic: 80,
      components: {
        'Practicals': 10,
        'Internal Assessment': 10,
        'Pre-Board': 30,
        'Board Exam': 50
      }
    }
  }
};

// Utility Functions
const gradeUtils = {
  // Get grade level from class
  getGradeLevel: (grade) => {
    for (const [level, config] of Object.entries(gradeSystem.schoolLevels)) {
      if (config.grades.includes(grade)) {
        return level;
      }
    }
    return null;
  },

  // Get subjects for a grade
  getSubjectsForGrade: (grade, stream = null) => {
    const gradeInfo = gradeSystem.gradeStructure[grade];
    if (!gradeInfo) return [];

    if (stream && gradeInfo.streams && gradeInfo.streams[stream]) {
      return gradeInfo.streams[stream].subjects;
    }

    return gradeInfo.subjects || [];
  },

  // Get grading system for grade
  getGradingSystem: (grade) => {
    const level = gradeUtils.getGradeLevel(grade);
    return gradeSystem.gradingSystems[level] || null;
  },

  // Calculate grade from marks
  calculateGrade: (marks, totalMarks, grade) => {
    const percentage = (marks / totalMarks) * 100;
    const gradingSystem = gradeUtils.getGradingSystem(grade);
    
    if (!gradingSystem) return null;

    for (const [gradeKey, gradeInfo] of Object.entries(gradingSystem.points || {})) {
      if (percentage >= gradeInfo.min && percentage <= gradeInfo.max) {
        return {
          grade: gradeKey,
          percentage: Math.round(percentage * 100) / 100,
          points: gradeInfo.points
        };
      }
    }

    return null;
  },

  // Get next grade
  getNextGrade: (currentGrade) => {
    const grades = ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    const currentIndex = grades.indexOf(currentGrade);
    
    if (currentIndex >= 0 && currentIndex < grades.length - 1) {
      return grades[currentIndex + 1];
    }
    
    return null; // Graduation or invalid grade
  },

  // Check if grade requires stream selection
  requiresStreamSelection: (grade) => {
    return ['11', '12'].includes(grade);
  },

  // Get available streams for grade
  getAvailableStreams: (grade) => {
    const gradeInfo = gradeSystem.gradeStructure[grade];
    return gradeInfo?.streams ? Object.keys(gradeInfo.streams) : [];
  },

  // Validate grade transition
  validateGradeTransition: (fromGrade, toGrade) => {
    const nextGrade = gradeUtils.getNextGrade(fromGrade);
    return nextGrade === toGrade;
  }
};

module.exports = {
  gradeSystem,
  gradeUtils
};
