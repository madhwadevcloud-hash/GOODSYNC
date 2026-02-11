import React, { useState, useEffect } from 'react';
// import { toast } from 'react-toastify';
// import { useAuth } from '../../auth/AuthContext';

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

interface Teacher {
  _id: string;
  name: {
    firstName: string;
    lastName: string;
  };
  teacherDetails: {
    employeeId: string;
    specialization: string[];
    subjects: string[];
  };
}

interface Subject {
  _id: string;
  subjectCode: string;
  subjectName: string;
  subjectType: string;
  applicableGrades: Array<{
    grade: string;
    isCompulsory: boolean;
    periodsPerWeek: number;
  }>;
  teacherAssignments: Array<{
    teacherId: string;
    teacherName: string;
    assignedGrades: string[];
    periodsPerWeek: number;
    assignmentHistory: {
      isActive: boolean;
      assignedDate: string;
    };
  }>;
}

interface SubjectTeacherAssignmentProps {
  grade: string;
  onAssignmentUpdate?: () => void;
}

const SubjectTeacherAssignment: React.FC<SubjectTeacherAssignmentProps> = ({ 
  grade, 
  onAssignmentUpdate 
}) => {
  const { user, authToken } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [periodsPerWeek, setPeriodsPerWeek] = useState<number>(4);
  const [loading, setLoading] = useState(false);
  const [workloadSummary, setWorkloadSummary] = useState<any>(null);

  useEffect(() => {
    fetchSubjects();
    fetchTeachers();
    fetchWorkloadSummary();
  }, [grade]);

  const fetchSubjects = async () => {
    try {
      const response = await fetch(`/api/subjects/grade/${grade}`, {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubjects(data.subjects || []);
      } else {
        throw new Error('Failed to fetch subjects');
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast.error('Failed to load subjects');
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await fetch('/api/users/teachers', {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTeachers(data.teachers || []);
      } else {
        throw new Error('Failed to fetch teachers');
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast.error('Failed to load teachers');
    }
  };

  const fetchWorkloadSummary = async () => {
    try {
      const response = await fetch('/api/subjects/workload-summary', {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setWorkloadSummary(data.workloadSummary);
      }
    } catch (error) {
      console.error('Error fetching workload summary:', error);
    }
  };

  const handleAssignTeacher = async () => {
    if (!selectedSubject || !selectedTeacher) {
      toast.error('Please select both subject and teacher');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/subjects/${selectedSubject}/assign-teacher`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          teacherId: selectedTeacher,
          grades: [grade],
          periodsPerWeek
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Teacher assigned successfully');
        setSelectedSubject('');
        setSelectedTeacher('');
        setPeriodsPerWeek(4);
        fetchSubjects();
        fetchWorkloadSummary();
        onAssignmentUpdate?.();
      } else {
        throw new Error(data.message || 'Failed to assign teacher');
      }
    } catch (error) {
      console.error('Error assigning teacher:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to assign teacher');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAssignment = async (subjectId: string, teacherId: string) => {
    if (!confirm('Are you sure you want to remove this teacher assignment?')) {
      return;
    }

    try {
      const response = await fetch(`/api/subjects/${subjectId}/remove-teacher`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          teacherId,
          grades: [grade]
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Teacher assignment removed successfully');
        fetchSubjects();
        fetchWorkloadSummary();
        onAssignmentUpdate?.();
      } else {
        throw new Error(data.message || 'Failed to remove assignment');
      }
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove assignment');
    }
  };

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find(t => t._id === teacherId);
    return teacher ? `${teacher.name.firstName} ${teacher.name.lastName}` : 'Unknown Teacher';
  };

  const getTeacherWorkload = (teacherId: string) => {
    if (!workloadSummary) return 0;
    const summary = workloadSummary.find((w: any) => w.teacherId === teacherId);
    return summary ? summary.totalPeriods : 0;
  };

  const isTeacherOverloaded = (teacherId: string) => {
    return getTeacherWorkload(teacherId) >= 30; // Maximum 30 periods per week
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800">
          Subject-Teacher Assignment - Grade {grade}
        </h3>
        <button
          onClick={fetchWorkloadSummary}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Refresh Workload
        </button>
      </div>

      {/* Assignment Form */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-gray-700 mb-4">Assign Teacher to Subject</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Subject</option>
              {subjects.map(subject => (
                <option key={subject._id} value={subject._id}>
                  {subject.subjectName} ({subject.subjectCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teacher
            </label>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Teacher</option>
              {teachers.map(teacher => (
                <option 
                  key={teacher._id} 
                  value={teacher._id}
                  className={isTeacherOverloaded(teacher._id) ? 'text-red-600' : ''}
                >
                  {teacher.name.firstName} {teacher.name.lastName} 
                  ({teacher.teacherDetails.employeeId}) 
                  - {getTeacherWorkload(teacher._id)} periods
                  {isTeacherOverloaded(teacher._id) && ' - OVERLOADED'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Periods/Week
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={periodsPerWeek}
              onChange={(e) => setPeriodsPerWeek(parseInt(e.target.value) || 4)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleAssignTeacher}
              disabled={loading || !selectedSubject || !selectedTeacher}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Assigning...' : 'Assign Teacher'}
            </button>
          </div>
        </div>
      </div>

      {/* Current Assignments */}
      <div>
        <h4 className="font-medium text-gray-700 mb-4">Current Assignments</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Teachers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {subjects.map(subject => (
                <tr key={subject._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {subject.subjectName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {subject.subjectCode}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      subject.subjectType === 'core' 
                        ? 'bg-blue-100 text-blue-800'
                        : subject.subjectType === 'elective'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {subject.subjectType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {subject.teacherAssignments
                      .filter(assignment => 
                        assignment.assignmentHistory.isActive && 
                        assignment.assignedGrades.includes(grade)
                      )
                      .map(assignment => (
                        <div key={assignment.teacherId} className="mb-2">
                          <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <div>
                              <span className="text-sm font-medium text-gray-900">
                                {assignment.teacherName}
                              </span>
                              <span className="text-xs text-gray-500 ml-2">
                                ({assignment.periodsPerWeek} periods/week)
                              </span>
                              {isTeacherOverloaded(assignment.teacherId) && (
                                <span className="text-xs text-red-600 ml-2">
                                  OVERLOADED
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => handleRemoveAssignment(subject._id, assignment.teacherId)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))
                    }
                    {subject.teacherAssignments.filter(assignment => 
                      assignment.assignmentHistory.isActive && 
                      assignment.assignedGrades.includes(grade)
                    ).length === 0 && (
                      <span className="text-sm text-gray-500 italic">No teacher assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="text-xs">
                      Required: {subject.applicableGrades.find(g => g.grade === grade)?.periodsPerWeek || 0} periods/week
                    </div>
                    <div className="text-xs">
                      Compulsory: {subject.applicableGrades.find(g => g.grade === grade)?.isCompulsory ? 'Yes' : 'No'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Workload Summary */}
      {workloadSummary && (
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-4">Teacher Workload Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {workloadSummary.slice(0, 6).map((summary: any) => (
              <div key={summary.teacherId} className="bg-white p-3 rounded border">
                <div className="text-sm font-medium text-gray-900">
                  {getTeacherName(summary.teacherId)}
                </div>
                <div className="text-xs text-gray-500">
                  {summary.totalPeriods} total periods
                </div>
                <div className="text-xs text-gray-500">
                  {summary.subjectCount} subjects
                </div>
                {summary.totalPeriods >= 30 && (
                  <div className="text-xs text-red-600 font-medium">
                    Overloaded
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectTeacherAssignment;
