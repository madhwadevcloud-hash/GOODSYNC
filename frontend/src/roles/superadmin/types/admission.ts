// Comprehensive Student Admission Form Types
export interface StudentAdmissionForm {
  // Basic Search Section
  enrollmentNo?: string;
  tcNo?: string;

  // Admission Details
  admissionToClass: string; // 1-10
  academicYear: string; // YYYY-YYYY format
  semester: 'SA-1' | 'SA-2' | 'FA-1' | 'FA-2';
  mediumOfInstruction: 'Kannada' | 'English' | 'Hindi' | 'Urdu' | 'Marathi' | 'Tamil' | 'Telugu';
  motherTongue: 'Kannada' | 'English' | 'Hindi' | 'Urdu' | 'Marathi' | 'Tamil' | 'Telugu' | 'Others';

  // Student Personal Information
  studentNameEnglish: {
    firstName: string;
    middleName?: string;
    lastName: string;
  };
  studentNameKannada: {
    firstName: string;
    middleName?: string;
    lastName: string;
  };
  dateOfBirth: string; // DD/MM/YYYY
  age: {
    years: number;
    months: number;
  };
  ageAppropriationReason?: string;
  gender: 'Male' | 'Female';

  // Family Details
  fatherNameEnglish: {
    firstName: string;
    middleName?: string;
    lastName: string;
  };
  fatherNameKannada: {
    firstName: string;
    middleName?: string;
    lastName: string;
  };
  fatherAadharNo: string; // 12 digits

  motherNameEnglish: {
    firstName: string;
    middleName?: string;
    lastName: string;
  };
  motherNameKannada: {
    firstName: string;
    middleName?: string;
    lastName: string;
  };
  motherAadharNo: string; // 12 digits

  // Identity Documents
  aadharKPRNo: string; // 12 digits
  studentCasteCertificateNo?: string;
  fatherCasteCertificateNo?: string;
  motherCasteCertificateNo?: string;

  // Caste and Category Information
  studentCaste: string;
  fatherCaste: string;
  motherCaste: string;
  socialCategory: 'GENERAL' | 'SC' | 'ST' | 'OBC';
  religion: 'Hindu' | 'Muslim' | 'Christian' | 'Others';
  specialCategory: 'None' | 'Others';

  // Economic Status
  belongingToBPL: 'Yes' | 'No';
  bplCardNo?: string;
  bhagyalakshmiBondNo?: string;

  // Special Needs
  disability: string; // Disability categories as specified
  
  // RTE (Right to Education) Status
  isRTECandidate: 'Yes' | 'No';

  // Address Information
  urbanRural: 'Urban' | 'Rural';
  pinCode: string; // 6 digits
  district: string;
  taluka: string;
  cityVillageTown: string;
  locality: string;
  address: string;

  // Communication Details
  studentMobileNo: string; // 10 digits
  studentEmailId?: string;
  fatherMobileNo: string; // 10 digits
  fatherEmailId?: string;
  motherMobileNo: string; // 10 digits
  motherEmailId?: string;

  // School and Banking Information
  schoolAdmissionDate: string; // DD/MM/YYYY
  bankName?: string;
  bankAccountNo?: string;
  bankIFSCCode?: string;

  // Transportation
  bmtcBusPass: 'Required' | 'Not Required';
}

export interface AdmissionSearchCriteria {
  enrollmentNo?: string;
  tcNo?: string;
}

export interface AdmissionValidationErrors {
  [key: string]: string;
}

// Dropdown options
export const CLASS_OPTIONS = Array.from({ length: 10 }, (_, i) => (i + 1).toString());

export const ACADEMIC_YEAR_OPTIONS = (() => {
  const currentYear = new Date().getFullYear();
  const options = [];
  for (let i = -2; i <= 2; i++) {
    const startYear = currentYear + i;
    const endYear = startYear + 1;
    options.push(`${startYear}-${endYear}`);
  }
  return options;
})();

export const SEMESTER_OPTIONS = ['SA-1', 'SA-2', 'FA-1', 'FA-2'] as const;

export const MEDIUM_OPTIONS = ['Kannada', 'English', 'Hindi', 'Urdu', 'Marathi', 'Tamil', 'Telugu'] as const;

export const MOTHER_TONGUE_OPTIONS = ['Kannada', 'English', 'Hindi', 'Urdu', 'Marathi', 'Tamil', 'Telugu', 'Others'] as const;

export const SOCIAL_CATEGORY_OPTIONS = ['GENERAL', 'SC', 'ST', 'OBC'] as const;

export const RELIGION_OPTIONS = ['Hindu', 'Muslim', 'Christian', 'Others'] as const;

export const DISABILITY_OPTIONS = [
  'None',
  'Leprosy Cured persons',
  'Dwarfism',
  'Intellectual Disability',
  'Muscular Dystrophy',
  'Others'
] as const;

// Karnataka Districts for dropdown
export const KARNATAKA_DISTRICTS = [
  'Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban',
  'Bidar', 'Chamarajanagar', 'Chikballapur', 'Chikkamagaluru', 'Chitradurga',
  'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan',
  'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal',
  'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga',
  'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayapura', 'Yadgir'
];

// Common Talukas (this would be dynamic based on district selection)
export const COMMON_TALUKAS = [
  'Select District First'
];

// Validation patterns
export const VALIDATION_PATTERNS = {
  aadhar: /^\d{12}$/,
  mobile: /^\d{10}$/,
  pinCode: /^\d{6}$/,
  ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  enrollmentNo: /^\d{8}$/
};
