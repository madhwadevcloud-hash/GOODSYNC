import React, { useState, useEffect } from 'react';
import { Search, User, Mail, Phone, Eye, ArrowLeft, Hash, X } from 'lucide-react';
import api from '../../../../services/api';
import { useAcademicYear } from '../../../../contexts/AcademicYearContext';
import StudentProfileModal from './StudentProfileModal';

interface Student {
  _id: string;
  name: string;
  userId: string;
  email: string;
  phoneNumber?: string;
  studentDetails: {
    academic: {
      currentClass: string;
      currentSection: string;
    };
    personal: {
      dateOfBirth?: string;
      gender?: string;
      bloodGroup?: string;
    }
  };
}

interface ClassStudentsViewProps {
  className: string;
  section: string;
  onBack: () => void;
}

const ClassStudentsView: React.FC<ClassStudentsViewProps> = ({ className, section, onBack }) => {
  const { viewingAcademicYear } = useAcademicYear();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
  }, [className, section, viewingAcademicYear]);

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      console.log(`🔍 Fetching students for Class ${className} Section ${section}`);
      const response = await api.get('/users/role/student', {
        params: {
          class: className,
          section: section,
          academicYear: viewingAcademicYear
        }
      });
      
      if (response.data?.success) {
        setStudents(response.data.data);
      } else {
        throw new Error('Failed to fetch students');
      }
    } catch (err: any) {
      console.error('❌ Error fetching students:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const getStudentName = (student: any) => {
    if (!student.name) return 'N/A';
    if (typeof student.name === 'string') return student.name;
    if (typeof student.name === 'object') {
      return student.name.displayName || 
             `${student.name.firstName || ''} ${student.name.lastName || ''}`.trim() || 
             'N/A';
    }
    return 'N/A';
  };

  const filteredStudents = students.filter(s => {
    const studentName = getStudentName(s);
    const userId = typeof s.userId === 'string' ? s.userId : '';
    return studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           userId.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      {/* Breadcrumbs & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-500 hover:text-blue-600 hover:border-blue-100 hover:shadow-lg transition-all active:scale-95"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Class Directory</span>
              <span className="h-1 w-1 rounded-full bg-gray-300"></span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AY {viewingAcademicYear}</span>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Class {className} - <span className="text-blue-600">{section.toUpperCase()}</span>
            </h1>
          </div>
        </div>

        <div className="relative group w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm"
          />
        </div>
      </div>

      {/* Student List Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Student Info</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Class/Sec</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contacts</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-8 py-6">
                      <div className="h-12 bg-gray-100 rounded-2xl w-full"></div>
                    </td>
                  </tr>
                ))
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="max-w-xs mx-auto space-y-3">
                      <div className="bg-gray-50 h-16 w-16 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        <User className="h-8 w-8 text-gray-300" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">No Students Found</h3>
                      <p className="text-gray-500 text-sm">We couldn't find any student matching your criteria in this section.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const studentName = getStudentName(student);
                  return (
                    <tr key={student._id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium text-base shadow-sm">
                            {studentName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{studentName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">Active</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-center">
                          <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-medium text-gray-700">
                            {className}-{section.toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                          <Hash className="h-3 w-3 text-gray-400" />
                          {student.userId || 'N/A'}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="space-y-1">
                          {student.email && (
                            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                              <Mail className="h-3 w-3" />
                              {student.email}
                            </div>
                          )}
                          {(student.phoneNumber || (student as any).contact?.primaryPhone) && (
                            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                              <Phone className="h-3 w-3" />
                              {student.phoneNumber || (student as any).contact?.primaryPhone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setSelectedStudentId(student._id)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-xs hover:bg-blue-700 transition-all"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View Profile
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedStudentId && (
        <StudentProfileModal 
          studentId={selectedStudentId} 
          onClose={() => setSelectedStudentId(null)} 
        />
      )}
    </div>
  );
};

export default ClassStudentsView;
