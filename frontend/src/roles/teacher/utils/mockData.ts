import { User, Student, AttendanceRecord, Assignment, Result, Message } from '../types';

export const currentUser: User = {
  id: '1',
  name: 'Sunil K',
  email: 'Sunil@fast.in',
  role: 'teacher',
  employeeId: 'T001',
  subjects: ['Mathematics', 'Physics'],
  classes: ['10A', '10B', '11A'],
  avatar: 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2'
};

export const mockStudents: Student[] = [
  {
    id: '1',
    name: 'Mahesh',
    rollNumber: 'S001',
    class: '10A',
    section: 'A',
    email: 'Mahesh@student.edu',
    parentEmail: 'parent.mahesh@email.com'
  },
  {
    id: '2',
    name: 'Shreya',
    rollNumber: 'S002',
    class: '10A',
    section: 'A',
    email: 'shreya@student.edu',
    parentEmail: 'parent.shreya@email.com'
  },
  {
    id: '3',
    name: 'Raj',
    rollNumber: 'S003',
    class: '10A',
    section: 'A',
    email: 'Raj@student.edu',
    parentEmail: 'parent.brown@email.com'
  }
];

export const mockAssignments: Assignment[] = [
  {
    id: '1',
    title: 'Quadratic Equations Practice',
    description: 'Solve the given quadratic equations using different methods',
    subject: 'Mathematics',
    class: '10A',
    dueDate: '2025-01-25',
    attachments: ['math_assignment.pdf'],
    createdDate: '2025-01-15',
    status: 'active'
  }
];

export const mockResults: Result[] = [
  {
    id: '1',
    studentId: '1',
    subject: 'Mathematics',
    examType: 'Mid Term',
    maxMarks: 100,
    obtainedMarks: 85,
    grade: 'A',
    date: '2025-01-10'
  }
];

export const mockMessages: Message[] = [
  {
    id: '1',
    sender: 'sarah.johnson@school.edu',
    recipient: ['parent.johnson@email.com'],
    subject: 'Student Performance Update',
    content: 'Alex is performing well in mathematics. Keep up the good work!',
    timestamp: '2025-01-15T10:30:00Z',
    isRead: true,
    type: 'individual'
  }
];