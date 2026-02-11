export interface User {
  id: string;
  name: string;
  email: string;
  role: 'teacher';
  employeeId: string;
  subjects: string[];
  classes: string[];
  avatar?: string;
}

export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  class: string;
  section: string;
  email?: string;
  parentEmail?: string;
  avatar?: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  remarks?: string;
  class: string;
  subject: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  subject: string;
  class: string;
  dueDate: string;
  attachments: string[];
  createdDate: string;
  status: 'active' | 'expired';
}

export interface Result {
  id: string;
  studentId: string;
  subject: string;
  examType: string;
  maxMarks: number;
  obtainedMarks: number;
  grade: string;
  date: string;
}

export interface Message {
  id: string;
  sender: string;
  recipient: string[];
  subject: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  type: 'individual' | 'group';
}