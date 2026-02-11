import React from 'react';
import { BookOpen } from 'lucide-react';

const AcademicDetailsSimple: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Academic Details</h1>
          <p className="text-gray-600 mt-1">Manage subjects for each class</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-6">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Subjects</h2>
          </div>

          <div className="text-center py-8">
            <p className="text-gray-500">Academic Details component loaded successfully!</p>
            <p className="text-sm text-gray-400 mt-2">This simplified version confirms the routing is working.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademicDetailsSimple;
