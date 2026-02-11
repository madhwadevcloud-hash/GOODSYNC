export type SchoolUserRole = 'admin' | 'teacher' | 'student' | 'parent';

export interface User {
  id: string;
  name: string;
  email: string;
  role: SchoolUserRole;
  status: 'active' | 'inactive';
  avatar?: string;
  joinDate: string;
  subjects?: string[];
  classes?: string[];
  class?: string;
  rollNumber?: string;
}

export interface Result {
  id: string;
  studentId: string;
  term: string;
  totalMarks: number;
  totalPossible: number;
  percentage: number;
  grade: string;
  rank: number;
}

export interface Attendance {
  id: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
}

export interface Mark {
  id: string;
  studentId: string;
  teacherId: string;
  subject: string;
  examType: string;
  marks: number;
  totalMarks: number;
  date: string;
}

export interface SchoolSettings {
  schoolName: string;
  academicYear: string;
  attendanceThreshold: number;
  schoolHours: {
    start: string;
    end: string;
  };
  subjects: string[];
  classes: string[];
}

export interface SchoolData {
  users: User[];
  results: Result[];
  attendance: Attendance[];
  marks: Mark[];
  settings: SchoolSettings;
}

export interface School {
  id: string;
  name: string;
  schoolType?: string;
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  phone?: string;
  email?: string;
  principalName?: string;
  principalEmail?: string;
  area?: string;
  district?: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branch: string;
    accountHolderName: string;
  };
  accessMatrix?: any;
  establishedYear?: string;
  affiliationBoard?: string;
  website?: string;
  secondaryContact?: string;
}
