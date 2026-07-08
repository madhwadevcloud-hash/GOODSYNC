import React, { useState, useEffect, useCallback } from 'react';
import { UserCheck, Users, BookOpen, Save, Trash2, Search, RefreshCw, AlertCircle, CheckCircle, Copy } from 'lucide-react';
import { useAuth } from '../../../auth/AuthContext';
import { useAcademicYear } from '../../../contexts/AcademicYearContext';
import { teacherAssignmentAPI } from '../../../services/api';
import api from '../../../services/api';
import { useSchoolClasses } from '../../../hooks/useSchoolClasses';
import { toast } from 'react-hot-toast';

interface Assignment {
  _id: string;
  assignmentId: string;
  className: string;
  section: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  teacherEmployeeId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Teacher {
  _id: string;
  userId: string;
  name: { firstName: string; lastName: string; displayName?: string };
  teacherDetails?: { employeeId?: string };
  isActive: boolean;
}

const TeacherAssignments: React.FC = () => {
  const { user } = useAuth();
  const {
    currentAcademicYear,
    viewingAcademicYear,
    setViewingYear,
    availableYears,
    ready: academicYearReady
  } = useAcademicYear();

  const {
    classesData,
    loading: classesLoading,
    getSectionsByClass,
    hasClasses
  } = useSchoolClasses(academicYearReady ? viewingAcademicYear : undefined);

  // State
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [availableSections, setAvailableSections] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit state: subjectName -> teacherId (for the assignment form)
  const [assignmentMap, setAssignmentMap] = useState<Record<string, string>>({});

  // Class list from config
  const classList = [...new Set(classesData?.classes?.map((c: any) => c.className) || [])];

  // Update sections when class changes
  useEffect(() => {
    if (selectedClass && classesData) {
      const sections = getSectionsByClass(selectedClass);
      setAvailableSections(sections);
      if (sections.length > 0) {
        setSelectedSection(sections[0].value);
      } else {
        setSelectedSection('');
      }
    } else {
      setAvailableSections([]);
      setSelectedSection('');
    }
  }, [selectedClass, classesData, getSectionsByClass]);

  // Fetch teachers for the school
  const fetchTeachers = useCallback(async () => {
    const schoolCode = localStorage.getItem('erp.schoolCode') || user?.schoolCode || '';
    if (!schoolCode) return;

    setLoadingTeachers(true);
    try {
      const resp = await api.get('/users/role/teacher', {
        headers: { 'X-School-Code': schoolCode }
      });
      if (resp.data?.success && Array.isArray(resp.data?.data)) {
        const activeTeachers = resp.data.data.filter((t: any) => t.isActive !== false);
        setTeachers(activeTeachers);
      }
    } catch (err) {
      console.error('Error fetching teachers:', err);
      toast.error('Failed to load teachers');
    } finally {
      setLoadingTeachers(false);
    }
  }, [user?.schoolCode]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  // Fetch subjects and assignments when class/section change
  const fetchData = useCallback(async () => {
    if (!selectedClass || !selectedSection) return;

    setLoading(true);
    const schoolCode = localStorage.getItem('erp.schoolCode') || user?.schoolCode || '';

    try {
      // 1. Fetch subjects for this class-section
      let activeSubjects: string[] = [];
      try {
        const resp = await api.get(`/class-subjects/class/${encodeURIComponent(selectedClass)}`, {
          params: { academicYear: viewingAcademicYear, section: selectedSection },
          headers: { 'x-school-code': schoolCode }
        });
        if (resp.data?.success && resp.data?.data?.subjects) {
          const activeList = resp.data.data.subjects.filter((s: any) => s.isActive !== false);
          activeSubjects = activeList.map((s: any) => s.name || s.subjectName).filter(Boolean);
        }
      } catch (err) {
        console.error('Error fetching subjects:', err);
      }
      setSubjects(activeSubjects);

      // 2. Fetch existing assignments
      let existingAssignments: Assignment[] = [];
      try {
        const resp = await teacherAssignmentAPI.getClassSectionAssignments(
          selectedClass,
          selectedSection,
          { academicYear: viewingAcademicYear }
        );
        if (resp.data?.success && Array.isArray(resp.data?.data)) {
          existingAssignments = resp.data.data;
        }
      } catch (err: any) {
        // 404 or empty is fine - no assignments yet
        if (err?.response?.status !== 404) {
          console.error('Error fetching assignments:', err);
        }
      }
      setAssignments(existingAssignments);

      // 3. Build the assignment map
      const map: Record<string, string> = {};
      activeSubjects.forEach(subj => {
        const existing = existingAssignments.find(a => a.subjectName === subj);
        map[subj] = existing?.teacherId || '';
      });
      setAssignmentMap(map);

    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedSection, viewingAcademicYear, user?.schoolCode]);

  useEffect(() => {
    if (selectedClass && selectedSection) {
      fetchData();
    }
  }, [selectedClass, selectedSection, fetchData]);

  // Save assignments
  const handleSave = async () => {
    if (!selectedClass || !selectedSection) {
      toast.error('Please select a class and section');
      return;
    }

    // Build the assignments array
    const assignmentsToSave = Object.entries(assignmentMap)
      .filter(([_, teacherId]) => teacherId) // Only save if a teacher is selected
      .map(([subjectName, teacherId]) => {
        const teacher = teachers.find(t => (t.userId || t._id) === teacherId);
        const teacherName = teacher
          ? (teacher.name?.displayName || `${teacher.name?.firstName || ''} ${teacher.name?.lastName || ''}`.trim())
          : 'Unknown';
        const teacherEmployeeId = teacher?.teacherDetails?.employeeId || teacher?.userId || null;

        return {
          subjectName,
          teacherId,
          teacherName,
          teacherEmployeeId
        };
      });

    if (assignmentsToSave.length === 0) {
      toast.error('No assignments to save. Please select teachers for subjects.');
      return;
    }

    setSaving(true);
    try {
      const resp = await teacherAssignmentAPI.bulkAssign({
        academicYear: viewingAcademicYear,
        className: selectedClass,
        section: selectedSection,
        assignments: assignmentsToSave
      });

      if (resp.data?.success) {
        const d = resp.data.data;
        toast.success(`Saved: ${d.created} created, ${d.reassigned} reassigned, ${d.unchanged} unchanged`);
        fetchData(); // Refresh
      } else {
        toast.error(resp.data?.message || 'Failed to save assignments');
      }
    } catch (err: any) {
      console.error('Error saving assignments:', err);
      toast.error(err?.response?.data?.message || 'Failed to save assignments');
    } finally {
      setSaving(false);
    }
  };

  // Remove an assignment
  const handleRemove = async (assignmentId: string, subjectName: string) => {
    if (!confirm(`Remove the teacher assignment for "${subjectName}"?`)) return;

    try {
      const resp = await teacherAssignmentAPI.deleteAssignment(assignmentId, {
        reason: 'Removed by admin from Teacher Assignment module'
      });

      if (resp.data?.success) {
        toast.success(`Assignment for "${subjectName}" removed`);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to remove assignment');
    }
  };

  // Get teacher display name
  const getTeacherDisplay = (teacherId: string) => {
    const teacher = teachers.find(t => (t.userId || t._id) === teacherId);
    if (!teacher) return teacherId;
    return teacher.name?.displayName || `${teacher.name?.firstName || ''} ${teacher.name?.lastName || ''}`.trim();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <UserCheck className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assign Teacher</h1>
            <p className="text-sm text-gray-500">Assign teachers to subjects for each class and section</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Academic Year */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Academic Year</label>
            <select
              value={viewingAcademicYear}
              onChange={(e) => setViewingYear(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-[150px]"
            >
              {[...new Set(availableYears)].map((year) => (
                <option key={year} value={year}>
                  {year} {year === currentAcademicYear && '(Current)'}
                </option>
              ))}
            </select>
          </div>

          {/* Class */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-[150px]"
              disabled={classesLoading || !hasClasses()}
            >
              <option value="">{classesLoading ? 'Loading...' : 'Select Class'}</option>
              {classList.map((cls: any) => (
                <option key={cls} value={cls}>Class {cls}</option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-[150px]"
              disabled={!selectedClass || availableSections.length === 0}
            >
              <option value="">{!selectedClass ? 'Select Class First' : 'Select Section'}</option>
              {availableSections.map((section: any) => (
                <option key={section.value} value={section.value}>Section {section.section}</option>
              ))}
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={fetchData}
            disabled={loading || !selectedClass || !selectedSection}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Assignment Table */}
      {selectedClass && selectedSection && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Class {selectedClass} - Section {selectedSection}
              </h2>
              <span className="text-sm text-gray-500">({viewingAcademicYear})</span>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || loading || subjects.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-5 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm"
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Assignments
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-500" />
              Loading subjects and assignments...
            </div>
          ) : subjects.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <p className="font-medium">No subjects configured</p>
              <p className="text-sm mt-1">Configure subjects for this class and section in Academic Details first.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/3">
                      Subject
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/2">
                      Assigned Teacher
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/6">
                      Status
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {subjects.map((subjectName) => {
                    const existingAssignment = assignments.find(a => a.subjectName === subjectName);
                    const selectedTeacherId = assignmentMap[subjectName] || '';

                    return (
                      <tr key={subjectName} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-indigo-400" />
                            <span className="text-sm font-medium text-gray-900">{subjectName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={selectedTeacherId}
                            onChange={(e) => {
                              setAssignmentMap(prev => ({
                                ...prev,
                                [subjectName]: e.target.value
                              }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                          >
                            <option value="">-- Select Teacher --</option>
                            {teachers.map((teacher) => {
                              const id = teacher.userId || teacher._id;
                              const name = teacher.name?.displayName || `${teacher.name?.firstName || ''} ${teacher.name?.lastName || ''}`.trim();
                              const empId = teacher.teacherDetails?.employeeId || teacher.userId || '';
                              return (
                                <option key={id} value={id}>
                                  {name} {empId ? `(${empId})` : ''}
                                </option>
                              );
                            })}
                          </select>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {existingAssignment ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <CheckCircle className="h-3 w-3" />
                              Assigned
                            </span>
                          ) : selectedTeacherId ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                              Unsaved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                              Not Assigned
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {existingAssignment && (
                            <button
                              onClick={() => handleRemove(existingAssignment._id, subjectName)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                              title="Remove assignment"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Summary Card */}
      {assignments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-indigo-700">{subjects.length}</div>
              <div className="text-sm text-indigo-600">Total Subjects</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-700">{assignments.length}</div>
              <div className="text-sm text-green-600">Assigned</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-700">
                {subjects.length - assignments.length}
              </div>
              <div className="text-sm text-yellow-600">Unassigned</div>
            </div>
          </div>

          {/* Teacher workload */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Teacher Workload (this class-section)</h4>
            <div className="flex flex-wrap gap-2">
              {(() => {
                const teacherCounts: Record<string, { name: string; count: number }> = {};
                assignments.forEach(a => {
                  if (!teacherCounts[a.teacherId]) {
                    teacherCounts[a.teacherId] = { name: a.teacherName, count: 0 };
                  }
                  teacherCounts[a.teacherId].count++;
                });
                return Object.entries(teacherCounts).map(([tid, info]) => (
                  <span key={tid} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    <Users className="h-3 w-3" />
                    {info.name}: {info.count} subject{info.count > 1 ? 's' : ''}
                  </span>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAssignments;
