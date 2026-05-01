import React, { useState, useEffect } from 'react';
import { X, User, BookOpen, Heart, MapPin, Phone, Mail, Calendar, Briefcase, GraduationCap, ShieldCheck } from 'lucide-react';
import api from '../../../../services/api';

interface StudentProfileModalProps {
  studentId: string;
  onClose: () => void;
}

const StudentProfileModal: React.FC<StudentProfileModalProps> = ({ studentId, onClose }) => {
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (studentId) {
      fetchStudentProfile();
    }
  }, [studentId]);

  const fetchStudentProfile = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('📥 Fetching student profile for:', studentId);
      const response = await api.get(`/users/${studentId}`);
      setStudent(response.data);
    } catch (err: any) {
      console.error('❌ Error fetching profile:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load student profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
        <div className="bg-white rounded-[40px] w-full max-w-4xl h-[80vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
            <p className="text-sm font-medium text-gray-500">Loading Student Profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl w-full max-w-lg p-6 text-center space-y-4 shadow-xl">
          <div className="bg-red-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto">
            <X className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Access Restricted</h2>
          <p className="text-sm text-gray-500">{error}</p>
          <button onClick={onClose} className="w-full py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-all">Close Window</button>
        </div>
      </div>
    );
  }

  const studentData = student?.studentDetails || {};
  const personal = studentData.personal || {};
  const academic = studentData.academic || {};
  const family = studentData.family || {};
  
  // Robust mapping for family details (handles both old and new structures)
  const parentsDisplay = {
    fatherName: family.father?.name || studentData.parents?.fatherName || studentData.fatherName || 'N/A',
    fatherPhone: family.father?.phone || studentData.parents?.fatherPhone || studentData.fatherPhone || 'N/A',
    motherName: family.mother?.name || studentData.parents?.motherName || 'N/A',
  };

  // Robust mapping for academic details
  const academicDisplay = {
    rollNumber: studentData.rollNumber || academic.rollNumber || 'N/A',
    admissionNumber: studentData.admissionNumber || academic.admissionNumber || 'N/A',
    currentClass: academic.currentClass || studentData.class || 'N/A',
    currentSection: academic.currentSection || studentData.section || 'N/A',
    academicYear: academic.academicYear || studentData.academicYear || '2024-25',
    admissionDate: academic.admissionDate || studentData.admissionDate || null
  };

  // Robust mapping for address (checks top-level and nested)
  const addressSource = student?.address?.current || student?.address?.permanent || studentData.address || {};
  const addressDisplay = {
    street: addressSource.street || addressSource.addressLine1 || 'N/A',
    city: addressSource.city || 'N/A',
    state: addressSource.state || 'N/A',
    pincode: addressSource.pincode || addressSource.pinCode || 'N/A'
  };

  // Helper to safely get student name from unified user schema
  const getStudentName = (studentObj: any) => {
    if (!studentObj) return 'N/A';
    if (typeof studentObj.name === 'string') return studentObj.name;
    if (typeof studentObj.name === 'object' && studentObj.name !== null) {
      return studentObj.name.displayName || 
             `${studentObj.name.firstName || ''} ${studentObj.name.lastName || ''}`.trim() || 
             'N/A';
    }
    return 'N/A';
  };

  const InfoCard = ({ icon: Icon, title, value }: any) => (
    <div className="p-4 rounded-xl bg-white border border-gray-100 transition-all">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gray-50 text-gray-500">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{title}</p>
          <p className="text-sm font-semibold text-gray-900">{value || 'N/A'}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl animate-in zoom-in-95 duration-200">
        {/* Header - Simple */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 overflow-hidden">
              {student?.profileImage ? (
                <img src={student.profileImage} alt={getStudentName(student)} className="h-full w-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-blue-600" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{getStudentName(student)}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-medium rounded-full border border-blue-100">
                  ID: {student?.userId}
                </span>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-medium rounded-full border border-emerald-100">
                  Class {academicDisplay.currentClass}-{academicDisplay.currentSection}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-10 bg-gray-50/30">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12">
            
            {/* Core Info - Wider Column */}
            <div className="lg:col-span-4 space-y-10">
              {/* Personal Details */}
              <section className="space-y-4">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-1">Personal Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <InfoCard icon={Calendar} title="Date of Birth" value={personal.dateOfBirth ? new Date(personal.dateOfBirth).toLocaleDateString() : 'N/A'} />
                  <InfoCard icon={User} title="Gender" value={personal.gender} />
                  <InfoCard icon={Heart} title="Blood Group" value={personal.bloodGroup} />
                  <InfoCard icon={ShieldCheck} title="Admission Date" value={academicDisplay.admissionDate ? new Date(academicDisplay.admissionDate).toLocaleDateString() : 'N/A'} />
                </div>
              </section>

              {/* Academic Status - NEW LOCATION */}
              <section className="space-y-4">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-1">Academic Status</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <InfoCard icon={GraduationCap} title="Roll Number" value={academicDisplay.rollNumber} />
                  <InfoCard icon={ShieldCheck} title="Admission No" value={academicDisplay.admissionNumber} />
                  <InfoCard icon={Calendar} title="Academic Year" value={academicDisplay.academicYear} />
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Status</span>
                    <span className="text-sm font-bold text-emerald-700">ACTIVE</span>
                  </div>
                </div>
              </section>

              {/* Family Details - Optimized layout */}
              <section className="space-y-4">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-1">Family & Contact</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoCard icon={User} title="Father's Name" value={parentsDisplay.fatherName} />
                  <InfoCard icon={Phone} title="Parent Phone" value={parentsDisplay.fatherPhone} />
                  <div className="sm:col-span-2">
                    <InfoCard icon={Mail} title="School Email" value={student.email} />
                  </div>
                </div>
              </section>

              {/* Residential Address - End to End */}
              <section className="space-y-4">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-1">Current Address</h3>
                <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
                  <p className="text-sm text-gray-600 font-medium leading-relaxed">
                    {addressDisplay.street || 'No address information provided'}
                    {addressDisplay.city !== 'N/A' ? `, ${addressDisplay.city}` : ''}
                    {addressDisplay.state !== 'N/A' ? `, ${addressDisplay.state}` : ''}
                    {addressDisplay.pincode !== 'N/A' ? ` - ${addressDisplay.pincode}` : ''}
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-white border-t border-gray-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-all text-sm"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentProfileModal;