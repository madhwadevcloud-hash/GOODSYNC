import React from 'react';
import { Calendar, Lock, AlertCircle } from 'lucide-react';
import { useAcademicYear } from '../../../contexts/AcademicYearContext';

const AcademicYearCard: React.FC = () => {
  const { currentAcademicYear, academicYearStart, academicYearEnd, loading, error } = useAcademicYear();

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="animate-spin h-6 w-6 border-3 border-white border-t-transparent rounded-full"></div>
          <span className="text-sm">Loading Academic Year...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-6 w-6 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-sm">Error Loading Academic Year</h3>
            <p className="text-xs opacity-90 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg border-2 border-indigo-400">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-white bg-opacity-20 p-3 rounded-lg">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-medium opacity-90 flex items-center gap-2">
              Current Academic Year
              <span title="Read-only - Set by Admin">
                <Lock className="h-3.5 w-3.5" />
              </span>
            </h3>
            <p className="text-2xl font-bold mt-1">{currentAcademicYear}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white bg-opacity-10 rounded-lg p-3 backdrop-blur-sm">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="opacity-80 text-xs mb-1">Start Date</p>
            <p className="font-semibold">{formatDate(academicYearStart)}</p>
          </div>
          <div>
            <p className="opacity-80 text-xs mb-1">End Date</p>
            <p className="font-semibold">{formatDate(academicYearEnd)}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center space-x-2 text-xs opacity-80">
        <Lock className="h-3.5 w-3.5" />
        <span>This academic year is set by your school admin and cannot be changed</span>
      </div>
    </div>
  );
};

export default AcademicYearCard;
