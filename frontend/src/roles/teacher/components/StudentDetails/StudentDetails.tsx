import React, { useState, useEffect } from 'react';
import { Users, Search, GraduationCap, X } from 'lucide-react';
import { useAuth } from '../../../../auth/AuthContext';
import { useAcademicYear } from '../../../../contexts/AcademicYearContext';
import api from '../../../../services/api';
import ClassStudentsView from './ClassStudentsView';  

interface ClassCount {
  className: string;
  section: string;
  count: number;
}

const StudentDetails: React.FC = () => {
  const { user } = useAuth();
  const { currentAcademicYear, viewingAcademicYear } = useAcademicYear();
  
  const [classCounts, setClassCounts] = useState<ClassCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<{ className: string; section: string } | null>(null);

  useEffect(() => {
    fetchStudentCounts();
  }, [viewingAcademicYear]);

  const fetchStudentCounts = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('📊 Fetching student counts for:', viewingAcademicYear);
      const response = await api.get('/users/stats/student-counts', {
        params: { academicYear: viewingAcademicYear }
      });
      
      if (response.data?.success) {
        setClassCounts(response.data.data);
      } else {
        throw new Error('Failed to fetch student counts');
      }
    } catch (err: any) {
      console.error('❌ Error fetching student counts:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load class data');
    } finally {
      setLoading(false);
    }
  };

  const filteredCounts = classCounts.filter(c => 
    c.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.section.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedClass) {
    return (
      <ClassStudentsView 
        className={selectedClass.className} 
        section={selectedClass.section} 
        onBack={() => setSelectedClass(null)} 
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Student Details</h1>
          <p className="text-gray-500 mt-1 text-sm">Overview of students across all classes and sections</p>
        </div>
        
        <div className="relative group w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Search Class or Section..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm"
          />
        </div>
      </div>

      {/* Grid of Classes */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="h-10 w-10 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
          <p className="text-sm font-medium text-gray-500">Loading Class Records...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 p-8 rounded-xl text-center space-y-4">
          <div className="bg-red-100 h-12 w-12 rounded-full flex items-center justify-center mx-auto">
            <X className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Oops! Something went wrong</h3>
          <p className="text-sm text-red-700 max-w-md mx-auto">{error}</p>
          <button 
            onClick={fetchStudentCounts}
            className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all active:scale-95"
          >
            Retry Now
          </button>
        </div>
      ) : filteredCounts.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">No classes found</h3>
          <p className="text-sm text-gray-500">Try adjusting your search or check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCounts.map((item, index) => (
            <button
              key={`${item.className}-${item.section}`}
              onClick={() => setSelectedClass({ className: item.className, section: item.section })}
              className="group relative bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all flex-shrink-0">
                  <GraduationCap className="h-6 w-6" />
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    Class {item.className}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 uppercase">Section {item.section.toUpperCase()}</span>
                    <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                    <span className="text-[10px] font-medium text-emerald-600 uppercase">Active</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-600 min-w-[60px] px-2 py-1.5 rounded-lg flex flex-col items-center justify-center">
                <div className="text-lg font-bold text-white leading-none">{item.count}</div>
                <div className="text-[8px] font-medium text-blue-100 uppercase tracking-wider mt-0.5">Students</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentDetails;
