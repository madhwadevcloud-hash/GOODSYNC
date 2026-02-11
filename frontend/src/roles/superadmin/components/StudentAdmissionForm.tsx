import React, { useState, useEffect } from 'react';
import { Search, User, FileText, MapPin, Phone, CreditCard, Bus, Save, X, RefreshCw } from 'lucide-react';
import {
  StudentAdmissionForm,
  AdmissionSearchCriteria,
  AdmissionValidationErrors,
  CLASS_OPTIONS,
  ACADEMIC_YEAR_OPTIONS,
  SEMESTER_OPTIONS,
  MEDIUM_OPTIONS,
  MOTHER_TONGUE_OPTIONS,
  SOCIAL_CATEGORY_OPTIONS,
  RELIGION_OPTIONS,
  DISABILITY_OPTIONS,
  KARNATAKA_DISTRICTS,
  VALIDATION_PATTERNS
} from '../types/admission';

interface StudentAdmissionFormProps {
  onSubmit: (formData: StudentAdmissionForm) => Promise<void>;
  onSearch: (criteria: AdmissionSearchCriteria) => Promise<any>;
  loading?: boolean;
}

const StudentAdmissionFormComponent: React.FC<StudentAdmissionFormProps> = ({
  onSubmit,
  onSearch,
  loading = false
}) => {
  const [activeSection, setActiveSection] = useState<'search' | 'admission' | 'student' | 'contact' | 'banking'>('search');
  const [formData, setFormData] = useState<Partial<StudentAdmissionForm>>({
    // Initialize with default values
    semester: 'SA-1',
    mediumOfInstruction: 'English',
    motherTongue: 'Kannada',
    gender: 'Male',
    socialCategory: 'GENERAL',
    religion: 'Hindu',
    specialCategory: 'None',
    belongingToBPL: 'No',
    disability: 'None',
    isRTECandidate: 'No',
    urbanRural: 'Urban',
    bmtcBusPass: 'Not Required'
  });
  const [searchCriteria, setSearchCriteria] = useState<AdmissionSearchCriteria>({});
  const [errors, setErrors] = useState<AdmissionValidationErrors>({});
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form data
  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Update nested form data
  const updateNestedFormData = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent as keyof StudentAdmissionForm] as Record<string, any>),
        [field]: value
      }
    }));
  };

  // Validate form section
  const validateSection = (section: string): boolean => {
    const newErrors: AdmissionValidationErrors = {};

    switch (section) {
      case 'admission':
        if (!formData.admissionToClass) newErrors.admissionToClass = 'Admission class is required';
        if (!formData.academicYear) newErrors.academicYear = 'Academic year is required';
        if (!formData.semester) newErrors.semester = 'Semester is required';
        if (!formData.mediumOfInstruction) newErrors.mediumOfInstruction = 'Medium of instruction is required';
        if (!formData.motherTongue) newErrors.motherTongue = 'Mother tongue is required';
        break;

      case 'student':
        if (!formData.studentNameEnglish?.firstName) newErrors['studentNameEnglish.firstName'] = 'First name is required';
        if (!formData.studentNameEnglish?.lastName) newErrors['studentNameEnglish.lastName'] = 'Last name is required';
        if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
        if (!formData.gender) newErrors.gender = 'Gender is required';
        if (!formData.isRTECandidate) newErrors.isRTECandidate = 'RTE candidate status is required';

        // Aadhar validation
        if (formData.aadharKPRNo && !VALIDATION_PATTERNS.aadhar.test(formData.aadharKPRNo)) {
          newErrors.aadharKPRNo = 'Aadhar number must be 12 digits';
        }
        break;

      case 'contact':
        if (!formData.pinCode || !VALIDATION_PATTERNS.pinCode.test(formData.pinCode)) {
          newErrors.pinCode = 'Pin code must be 6 digits';
        }
        if (!formData.district) newErrors.district = 'District is required';
        if (!formData.address) newErrors.address = 'Address is required';

        // Mobile number validations
        if (formData.studentMobileNo && !VALIDATION_PATTERNS.mobile.test(formData.studentMobileNo)) {
          newErrors.studentMobileNo = 'Mobile number must be 10 digits';
        }
        if (formData.fatherMobileNo && !VALIDATION_PATTERNS.mobile.test(formData.fatherMobileNo)) {
          newErrors.fatherMobileNo = 'Father mobile number must be 10 digits';
        }
        if (formData.motherMobileNo && !VALIDATION_PATTERNS.mobile.test(formData.motherMobileNo)) {
          newErrors.motherMobileNo = 'Mother mobile number must be 10 digits';
        }

        // Email validations
        if (formData.studentEmailId && !VALIDATION_PATTERNS.email.test(formData.studentEmailId)) {
          newErrors.studentEmailId = 'Invalid email format';
        }
        if (formData.fatherEmailId && !VALIDATION_PATTERNS.email.test(formData.fatherEmailId)) {
          newErrors.fatherEmailId = 'Invalid father email format';
        }
        if (formData.motherEmailId && !VALIDATION_PATTERNS.email.test(formData.motherEmailId)) {
          newErrors.motherEmailId = 'Invalid mother email format';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle search
  const handleSearch = async () => {
    if (!searchCriteria.enrollmentNo && !searchCriteria.tcNo) {
      alert('Please enter either Enrollment No or TC No to search');
      return;
    }

    setIsSearching(true);
    try {
      const results = await onSearch(searchCriteria);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      alert('Error searching for student records');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validate all sections
    const sections = ['admission', 'student', 'contact'];
    let isValid = true;

    for (const section of sections) {
      if (!validateSection(section)) {
        isValid = false;
        setActiveSection(section as any);
        break;
      }
    }

    if (!isValid) {
      alert('Please fix the validation errors before submitting');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData as StudentAdmissionForm);
      alert('Student admission form submitted successfully!');
      // Reset form
      setFormData({
        semester: 'SA-1',
        mediumOfInstruction: 'English',
        motherTongue: 'Kannada',
        gender: 'Male',
        socialCategory: 'GENERAL',
        religion: 'Hindu',
        specialCategory: 'None',
        belongingToBPL: 'No',
        disability: 'None',
        isRTECandidate: 'No',
        urbanRural: 'Urban',
        bmtcBusPass: 'Not Required'
      });
      setActiveSection('search');
    } catch (error) {
      console.error('Submit error:', error);
      alert('Error submitting admission form');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate age from date of birth
  const calculateAge = (dob: string) => {
    if (!dob) return { years: 0, months: 0 };

    const birthDate = new Date(dob.split('/').reverse().join('-'));
    const today = new Date();
    const years = today.getFullYear() - birthDate.getFullYear();
    const months = today.getMonth() - birthDate.getMonth();

    return {
      years: months < 0 ? years - 1 : years,
      months: months < 0 ? months + 12 : months
    };
  };

  // Auto-calculate age when DOB changes
  useEffect(() => {
    if (formData.dateOfBirth) {
      const age = calculateAge(formData.dateOfBirth);
      updateFormData('age', age);
    }
  }, [formData.dateOfBirth]);

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Student Admission Form</h2>
        <p className="text-gray-600">Comprehensive admission form for Karnataka Education Department</p>
      </div>

      {/* Section Navigation */}
      <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
        {[
          { key: 'search', label: 'Search', icon: Search },
          { key: 'admission', label: 'Admission Details', icon: FileText },
          { key: 'student', label: 'Student Details', icon: User },
          { key: 'contact', label: 'Contact Info', icon: MapPin },
          { key: 'banking', label: 'Banking & Transport', icon: CreditCard }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeSection === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Search Section */}
      {activeSection === 'search' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Basic Search Section</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enrollment No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="8-digit number"
                  value={searchCriteria.enrollmentNo || ''}
                  onChange={(e) => setSearchCriteria(prev => ({ ...prev, enrollmentNo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TC No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Transfer Certificate reference number"
                  value={searchCriteria.tcNo || ''}
                  onChange={(e) => setSearchCriteria(prev => ({ ...prev, tcNo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSearching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span>{isSearching ? 'Searching...' : 'Search'}</span>
              </button>
            </div>
          </div>

          {searchResults && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">Search Results</h4>
              <pre className="text-sm text-green-800">{JSON.stringify(searchResults, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {/* Admission Details Section */}
      {activeSection === 'admission' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Admission Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admission to Class <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.admissionToClass || ''}
                onChange={(e) => updateFormData('admissionToClass', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Class</option>
                {CLASS_OPTIONS.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
              {errors.admissionToClass && <p className="text-red-500 text-sm mt-1">{errors.admissionToClass}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Academic Year <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.academicYear || ''}
                onChange={(e) => updateFormData('academicYear', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Academic Year</option>
                {ACADEMIC_YEAR_OPTIONS.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              {errors.academicYear && <p className="text-red-500 text-sm mt-1">{errors.academicYear}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Semester <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.semester || ''}
                onChange={(e) => updateFormData('semester', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {SEMESTER_OPTIONS.map(sem => (
                  <option key={sem} value={sem}>{sem}</option>
                ))}
              </select>
              {errors.semester && <p className="text-red-500 text-sm mt-1">{errors.semester}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Medium of Instruction <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.mediumOfInstruction || ''}
                onChange={(e) => updateFormData('mediumOfInstruction', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {MEDIUM_OPTIONS.map(medium => (
                  <option key={medium} value={medium}>{medium}</option>
                ))}
              </select>
              {errors.mediumOfInstruction && <p className="text-red-500 text-sm mt-1">{errors.mediumOfInstruction}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mother Tongue <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.motherTongue || ''}
                onChange={(e) => updateFormData('motherTongue', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {MOTHER_TONGUE_OPTIONS.map(tongue => (
                  <option key={tongue} value={tongue}>{tongue}</option>
                ))}
              </select>
              {errors.motherTongue && <p className="text-red-500 text-sm mt-1">{errors.motherTongue}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Student Details Section */}
      {activeSection === 'student' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Student Details</h3>

          {/* Personal Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-4">Personal Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student Name (English) <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={formData.studentNameEnglish?.firstName || ''}
                    onChange={(e) => updateNestedFormData('studentNameEnglish', 'firstName', e.target.value.toUpperCase())}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Middle Name"
                    value={formData.studentNameEnglish?.middleName || ''}
                    onChange={(e) => updateNestedFormData('studentNameEnglish', 'middleName', e.target.value.toUpperCase())}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={formData.studentNameEnglish?.lastName || ''}
                    onChange={(e) => updateNestedFormData('studentNameEnglish', 'lastName', e.target.value.toUpperCase())}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student Name (Kannada) <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="ಮೊದಲ ಹೆಸರು"
                    value={formData.studentNameKannada?.firstName || ''}
                    onChange={(e) => updateNestedFormData('studentNameKannada', 'firstName', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <input
                    type="text"
                    placeholder="ಮಧ್ಯದ ಹೆಸರು"
                    value={formData.studentNameKannada?.middleName || ''}
                    onChange={(e) => updateNestedFormData('studentNameKannada', 'middleName', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <input
                    type="text"
                    placeholder="ಕೊನೆಯ ಹೆಸರು"
                    value={formData.studentNameKannada?.lastName || ''}
                    onChange={(e) => updateNestedFormData('studentNameKannada', 'lastName', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="DD/MM/YYYY"
                  value={formData.dateOfBirth || ''}
                  onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.dateOfBirth && <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    placeholder="Years"
                    value={formData.age?.years || ''}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                  <input
                    type="number"
                    placeholder="Months"
                    value={formData.age?.months || ''}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age Appropriation Reason
                </label>
                <input
                  type="text"
                  placeholder="If age doesn't match class"
                  value={formData.ageAppropriationReason || ''}
                  onChange={(e) => updateFormData('ageAppropriationReason', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.gender || ''}
                  onChange={(e) => updateFormData('gender', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
              </div>
            </div>
          </div>

          {/* Family Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-4">Family Details</h4>
            <div className="space-y-4">
              {/* Father's Details */}
              <div>
                <h5 className="font-medium text-gray-800 mb-2">Father's Details</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Father Name (English) <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="First Name"
                        value={formData.fatherNameEnglish?.firstName || ''}
                        onChange={(e) => updateNestedFormData('fatherNameEnglish', 'firstName', e.target.value.toUpperCase())}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Middle Name"
                        value={formData.fatherNameEnglish?.middleName || ''}
                        onChange={(e) => updateNestedFormData('fatherNameEnglish', 'middleName', e.target.value.toUpperCase())}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Last Name"
                        value={formData.fatherNameEnglish?.lastName || ''}
                        onChange={(e) => updateNestedFormData('fatherNameEnglish', 'lastName', e.target.value.toUpperCase())}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Father Aadhar No <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="12-digit Aadhar number"
                      value={formData.fatherAadharNo || ''}
                      onChange={(e) => updateFormData('fatherAadharNo', e.target.value.replace(/\D/g, '').slice(0, 12))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={12}
                    />
                  </div>
                </div>
              </div>

              {/* Mother's Details */}
              <div>
                <h5 className="font-medium text-gray-800 mb-2">Mother's Details</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mother Name (English) <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="First Name"
                        value={formData.motherNameEnglish?.firstName || ''}
                        onChange={(e) => updateNestedFormData('motherNameEnglish', 'firstName', e.target.value.toUpperCase())}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Middle Name"
                        value={formData.motherNameEnglish?.middleName || ''}
                        onChange={(e) => updateNestedFormData('motherNameEnglish', 'middleName', e.target.value.toUpperCase())}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Last Name"
                        value={formData.motherNameEnglish?.lastName || ''}
                        onChange={(e) => updateNestedFormData('motherNameEnglish', 'lastName', e.target.value.toUpperCase())}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mother Aadhar No <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="12-digit Aadhar number"
                      value={formData.motherAadharNo || ''}
                      onChange={(e) => updateFormData('motherAadharNo', e.target.value.replace(/\D/g, '').slice(0, 12))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={12}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Identity Documents */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-4">Identity Documents</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Aadhar/KPR No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="12-digit Aadhar number"
                  value={formData.aadharKPRNo || ''}
                  onChange={(e) => updateFormData('aadharKPRNo', e.target.value.replace(/\D/g, '').slice(0, 12))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={12}
                />
                {errors.aadharKPRNo && <p className="text-red-500 text-sm mt-1">{errors.aadharKPRNo}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student Caste Certificate No
                </label>
                <input
                  type="text"
                  placeholder="Caste certificate number"
                  value={formData.studentCasteCertificateNo || ''}
                  onChange={(e) => updateFormData('studentCasteCertificateNo', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Father Caste Certificate No
                </label>
                <input
                  type="text"
                  placeholder="Father caste certificate number"
                  value={formData.fatherCasteCertificateNo || ''}
                  onChange={(e) => updateFormData('fatherCasteCertificateNo', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mother Caste Certificate No
                </label>
                <input
                  type="text"
                  placeholder="Mother caste certificate number"
                  value={formData.motherCasteCertificateNo || ''}
                  onChange={(e) => updateFormData('motherCasteCertificateNo', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Caste and Category Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-4">Caste and Category Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student Caste
                </label>
                <input
                  type="text"
                  placeholder="Student caste"
                  value={formData.studentCaste || ''}
                  onChange={(e) => updateFormData('studentCaste', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Father Caste
                </label>
                <input
                  type="text"
                  placeholder="Father caste"
                  value={formData.fatherCaste || ''}
                  onChange={(e) => updateFormData('fatherCaste', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mother Caste
                </label>
                <input
                  type="text"
                  placeholder="Mother caste"
                  value={formData.motherCaste || ''}
                  onChange={(e) => updateFormData('motherCaste', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Social Category
                </label>
                <select
                  value={formData.socialCategory || ''}
                  onChange={(e) => updateFormData('socialCategory', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {SOCIAL_CATEGORY_OPTIONS.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Religion
                </label>
                <select
                  value={formData.religion || ''}
                  onChange={(e) => updateFormData('religion', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {RELIGION_OPTIONS.map(religion => (
                    <option key={religion} value={religion}>{religion}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Category
                </label>
                <select
                  value={formData.specialCategory || ''}
                  onChange={(e) => updateFormData('specialCategory', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="None">None</option>
                  <option value="Others">Others</option>
                </select>
              </div>
            </div>
          </div>

          {/* Economic Status */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-4">Economic Status</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Belonging to BPL
                </label>
                <select
                  value={formData.belongingToBPL || ''}
                  onChange={(e) => updateFormData('belongingToBPL', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              {formData.belongingToBPL === 'Yes' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    BPL Card No
                  </label>
                  <input
                    type="text"
                    placeholder="BPL card number"
                    value={formData.bplCardNo || ''}
                    onChange={(e) => updateFormData('bplCardNo', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bhagyalakshmi Bond No
                </label>
                <input
                  type="text"
                  placeholder="Government scheme reference"
                  value={formData.bhagyalakshmiBondNo || ''}
                  onChange={(e) => updateFormData('bhagyalakshmiBondNo', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Special Needs */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-4">Special Needs</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Disability
                </label>
                <select
                  value={formData.disability || ''}
                  onChange={(e) => updateFormData('disability', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {DISABILITY_OPTIONS.map(disability => (
                    <option key={disability} value={disability}>{disability}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Is the student an RTE (Right to Education) candidate? <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.isRTECandidate || ''}
                  onChange={(e) => updateFormData('isRTECandidate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Option</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                {errors.isRTECandidate && <p className="text-red-500 text-sm mt-1">{errors.isRTECandidate}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Details Section */}
      {activeSection === 'contact' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Contact Details</h3>

          {/* Address Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-4">Address Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Urban/Rural <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.urbanRural || ''}
                  onChange={(e) => updateFormData('urbanRural', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Urban">Urban</option>
                  <option value="Rural">Rural</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pin Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="6-digit pin code"
                  value={formData.pinCode || ''}
                  onChange={(e) => updateFormData('pinCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={6}
                />
                {errors.pinCode && <p className="text-red-500 text-sm mt-1">{errors.pinCode}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  District <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.district || ''}
                  onChange={(e) => updateFormData('district', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select District</option>
                  {KARNATAKA_DISTRICTS.map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
                {errors.district && <p className="text-red-500 text-sm mt-1">{errors.district}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Taluka
                </label>
                <input
                  type="text"
                  placeholder="Taluka"
                  value={formData.taluka || ''}
                  onChange={(e) => updateFormData('taluka', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City/Village/Town
                </label>
                <input
                  type="text"
                  placeholder="City/Village/Town"
                  value={formData.cityVillageTown || ''}
                  onChange={(e) => updateFormData('cityVillageTown', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Locality
                </label>
                <input
                  type="text"
                  placeholder="Locality"
                  value={formData.locality || ''}
                  onChange={(e) => updateFormData('locality', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  placeholder="Complete address"
                  value={formData.address || ''}
                  onChange={(e) => updateFormData('address', e.target.value.toUpperCase())}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
              </div>
            </div>
          </div>

          {/* Communication Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-4">Communication Details</h4>
            <div className="space-y-4">
              {/* Student Communication */}
              <div>
                <h5 className="font-medium text-gray-800 mb-2">Student Communication</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Student Mobile No
                    </label>
                    <input
                      type="text"
                      placeholder="10-digit mobile number"
                      value={formData.studentMobileNo || ''}
                      onChange={(e) => updateFormData('studentMobileNo', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={10}
                    />
                    {errors.studentMobileNo && <p className="text-red-500 text-sm mt-1">{errors.studentMobileNo}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Student E-mail ID
                    </label>
                    <input
                      type="email"
                      placeholder="student@example.com"
                      value={formData.studentEmailId || ''}
                      onChange={(e) => updateFormData('studentEmailId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.studentEmailId && <p className="text-red-500 text-sm mt-1">{errors.studentEmailId}</p>}
                  </div>
                </div>
              </div>

              {/* Father Communication */}
              <div>
                <h5 className="font-medium text-gray-800 mb-2">Father Communication</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Father Mobile No <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="10-digit mobile number"
                      value={formData.fatherMobileNo || ''}
                      onChange={(e) => updateFormData('fatherMobileNo', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={10}
                    />
                    {errors.fatherMobileNo && <p className="text-red-500 text-sm mt-1">{errors.fatherMobileNo}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Father E-mail ID
                    </label>
                    <input
                      type="email"
                      placeholder="father@example.com"
                      value={formData.fatherEmailId || ''}
                      onChange={(e) => updateFormData('fatherEmailId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.fatherEmailId && <p className="text-red-500 text-sm mt-1">{errors.fatherEmailId}</p>}
                  </div>
                </div>
              </div>

              {/* Mother Communication */}
              <div>
                <h5 className="font-medium text-gray-800 mb-2">Mother Communication</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mother Mobile No <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="10-digit mobile number"
                      value={formData.motherMobileNo || ''}
                      onChange={(e) => updateFormData('motherMobileNo', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={10}
                    />
                    {errors.motherMobileNo && <p className="text-red-500 text-sm mt-1">{errors.motherMobileNo}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mother E-mail ID
                    </label>
                    <input
                      type="email"
                      placeholder="mother@example.com"
                      value={formData.motherEmailId || ''}
                      onChange={(e) => updateFormData('motherEmailId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.motherEmailId && <p className="text-red-500 text-sm mt-1">{errors.motherEmailId}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Banking and Transport Section */}
      {activeSection === 'banking' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">School and Banking Information</h3>

          {/* School Admission Date */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-4">School Admission Information</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                School Admission Date <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="DD/MM/YYYY"
                value={formData.schoolAdmissionDate || ''}
                onChange={(e) => updateFormData('schoolAdmissionDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Banking Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-4">Student/Parent's Bank Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  placeholder="Bank name"
                  value={formData.bankName || ''}
                  onChange={(e) => updateFormData('bankName', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Account No
                </label>
                <input
                  type="text"
                  placeholder="Bank account number"
                  value={formData.bankAccountNo || ''}
                  onChange={(e) => updateFormData('bankAccountNo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank IFSC Code
                </label>
                <input
                  type="text"
                  placeholder="IFSC code"
                  value={formData.bankIFSCCode || ''}
                  onChange={(e) => updateFormData('bankIFSCCode', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={11}
                />
              </div>
            </div>
          </div>

          {/* Transportation */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-4">Transportation</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                BMTC Bus Pass
              </label>
              <select
                value={formData.bmtcBusPass || ''}
                onChange={(e) => updateFormData('bmtcBusPass', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Required">Required</option>
                <option value="Not Required">Not Required</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-between items-center pt-6 border-t">
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => {
              setFormData({
                semester: 'SA-1',
                mediumOfInstruction: 'English',
                motherTongue: 'Kannada',
                gender: 'Male',
                socialCategory: 'GENERAL',
                religion: 'Hindu',
                specialCategory: 'None',
                belongingToBPL: 'No',
                disability: 'None',
                isRTECandidate: 'No',
                urbanRural: 'Urban',
                bmtcBusPass: 'Not Required'
              });
              setErrors({});
              setActiveSection('search');
            }}
            className="flex items-center space-x-2 px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
            <span>Reset</span>
          </button>
        </div>

        <div className="flex space-x-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentAdmissionFormComponent;
