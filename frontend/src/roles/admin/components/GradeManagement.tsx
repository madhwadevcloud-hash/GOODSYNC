import React, { useState, useEffect } from 'react';
// import { toast } from 'react-toastify';
// import { useAuth } from '../../auth/AuthContext';
import SubjectTeacherAssignment from './SubjectTeacherAssignment';

// Mock auth context for now
const useAuth = () => ({
  user: { _id: '1', role: 'admin' },
  authToken: 'mock-token'
});

// Mock toast for now
const toast = {
  success: (msg: string) => console.log('Success:', msg),
  error: (msg: string) => console.error('Error:', msg)
};

interface GradeConfig {
  grade: string;
  level: string;
  streams?: string[];
  isActive: boolean;
  capacity: {
    maxSections: number;
    maxStudentsPerSection: number;
  };
}

interface Class {
  _id: string;
  grade: string;
  section: string;
  level: string;
  stream?: string;
  academicYear: string;
  students: {
    enrolled: number;
    active: number;
  };
  subjects: string[];
  settings: {
    isActive: boolean;
    maxStudents: number;
  };
}

const GradeManagement: React.FC = () => {
  const { user, authToken } = useAuth();
  const [grades, setGrades] = useState<string[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [showSubjectAssignment, setShowSubjectAssignment] = useState(false);
  const [newClass, setNewClass] = useState({
    grade: '',
    section: '',
    stream: '',
    maxStudents: 40
  });
  const [loading, setLoading] = useState(false);

  // Available grades based on school level
  const availableGrades = [
    { grade: 'Nursery', level: 'elementary', streams: [] },
    { grade: 'LKG', level: 'elementary', streams: [] },
    { grade: 'UKG', level: 'elementary', streams: [] },
    { grade: '1', level: 'elementary', streams: [] },
    { grade: '2', level: 'elementary', streams: [] },
    { grade: '3', level: 'elementary', streams: [] },
    { grade: '4', level: 'elementary', streams: [] },
    { grade: '5', level: 'elementary', streams: [] },
    { grade: '6', level: 'middle', streams: [] },
    { grade: '7', level: 'middle', streams: [] },
    { grade: '8', level: 'middle', streams: [] },
    { grade: '9', level: 'high', streams: [] },
    { grade: '10', level: 'high', streams: [] },
    { grade: '11', level: 'higher_secondary', streams: ['Science', 'Commerce', 'Arts'] },
    { grade: '12', level: 'higher_secondary', streams: ['Science', 'Commerce', 'Arts'] }
  ];

  const sections = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/schools/classes', {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes || []);
        
        // Extract unique grades
        const uniqueGrades = [...new Set(data.classes.map((c: Class) => c.grade))];
        setGrades(uniqueGrades as string[]);
      } else {
        throw new Error('Failed to fetch classes');
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to load classes');
    }
  };

  const handleCreateClass = async () => {
    if (!newClass.grade || !newClass.section) {
      toast.error('Please select grade and section');
      return;
    }

    // Check if class already exists
    const existingClass = classes.find(c => 
      c.grade === newClass.grade && 
      c.section === newClass.section && 
      c.stream === newClass.stream
    );

    if (existingClass) {
      toast.error('Class already exists');
      return;
    }

    setLoading(true);
    try {
      const gradeConfig = availableGrades.find(g => g.grade === newClass.grade);
      
      const classData = {
        grade: newClass.grade,
        section: newClass.section,
        level: gradeConfig?.level || 'elementary',
        stream: newClass.stream || null,
        academicYear: '2024-25',
        settings: {
          maxStudents: newClass.maxStudents,
          isActive: true
        }
      };

      const response = await fetch('/api/schools/classes/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(classData)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Class created successfully');
        setNewClass({ grade: '', section: '', stream: '', maxStudents: 40 });
        fetchClasses();
      } else {
        throw new Error(data.message || 'Failed to create class');
      }
    } catch (error) {
      console.error('Error creating class:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/schools/classes/${classId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Class deleted successfully');
        fetchClasses();
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete class');
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete class');
    }
  };

  const getClassesByLevel = (level: string) => {
    return classes.filter(c => c.level === level);
  };

  const getLevelTitle = (level: string) => {
    const titles: { [key: string]: string } = {
      'elementary': 'Elementary School',
      'middle': 'Middle School',
      'high': 'High School',
      'higher_secondary': 'Higher Secondary'
    };
    return titles[level] || level;
  };

  const getAvailableStreams = (grade: string) => {
    const gradeConfig = availableGrades.find(g => g.grade === grade);
    return gradeConfig?.streams || [];
  };

  const groupedClasses = {
    elementary: getClassesByLevel('elementary'),
    middle: getClassesByLevel('middle'),
    high: getClassesByLevel('high'),
    higher_secondary: getClassesByLevel('higher_secondary')
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Grade Management</h2>
          <div className="flex space-x-4">
            <button
              onClick={() => setShowSubjectAssignment(!showSubjectAssignment)}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              Subject Assignment
            </button>
            <button
              onClick={fetchClasses}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Create New Class Form */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Create New Class</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grade *
              </label>
              <select
                value={newClass.grade}
                onChange={(e) => {
                  setNewClass({
                    ...newClass,
                    grade: e.target.value,
                    stream: '' // Reset stream when grade changes
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Grade</option>
                {availableGrades.map(grade => (
                  <option key={grade.grade} value={grade.grade}>
                    Grade {grade.grade} ({getLevelTitle(grade.level)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section *
              </label>
              <select
                value={newClass.section}
                onChange={(e) => setNewClass({ ...newClass, section: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Section</option>
                {sections.map(section => (
                  <option key={section} value={section}>
                    Section {section}
                  </option>
                ))}
              </select>
            </div>

            {getAvailableStreams(newClass.grade).length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stream *
                </label>
                <select
                  value={newClass.stream}
                  onChange={(e) => setNewClass({ ...newClass, stream: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Stream</option>
                  {getAvailableStreams(newClass.grade).map(stream => (
                    <option key={stream} value={stream}>
                      {stream}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Students
              </label>
              <input
                type="number"
                min="10"
                max="60"
                value={newClass.maxStudents}
                onChange={(e) => setNewClass({ ...newClass, maxStudents: parseInt(e.target.value) || 40 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleCreateClass}
                disabled={loading || !newClass.grade || !newClass.section}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                {loading ? 'Creating...' : 'Create Class'}
              </button>
            </div>
          </div>
        </div>

        {/* Classes by Level */}
        {Object.entries(groupedClasses).map(([level, levelClasses]) => (
          levelClasses.length > 0 && (
            <div key={level} className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {getLevelTitle(level)} ({levelClasses.length} classes)
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Class
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stream
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Students
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Capacity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {levelClasses.map(classItem => (
                      <tr key={classItem._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            Grade {classItem.grade} - {classItem.section}
                          </div>
                          <div className="text-sm text-gray-500">
                            {classItem.academicYear}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {classItem.stream ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                              {classItem.stream}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {classItem.students.active || 0} enrolled
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {classItem.settings.maxStudents} max
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            classItem.settings.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {classItem.settings.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setSelectedGrade(classItem.grade);
                                setShowSubjectAssignment(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Subjects
                            </button>
                            <button
                              onClick={() => handleDeleteClass(classItem._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ))}
      </div>

      {/* Subject Assignment Modal/Panel */}
      {showSubjectAssignment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Subject-Teacher Assignment
              </h3>
              <button
                onClick={() => setShowSubjectAssignment(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            {/* Grade Selection for Subject Assignment */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Grade for Subject Assignment
              </label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Grade</option>
                {grades.map(grade => (
                  <option key={grade} value={grade}>
                    Grade {grade}
                  </option>
                ))}
              </select>
            </div>

            {selectedGrade && (
              <SubjectTeacherAssignment 
                grade={selectedGrade}
                onAssignmentUpdate={() => {
                  // Optional callback for when assignments are updated
                  toast.success('Assignment updated successfully');
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeManagement;
