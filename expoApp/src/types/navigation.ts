export type RootTabParamList = {
  Home: undefined;
  Attendance: undefined;
  Results: undefined;
  Assignments: undefined;
  Activity: undefined;
};

export type Assignment = {
  id: number;
  subject: string;
  title: string;
  due: string;
  status: 'To Do' | 'Complete' | 'Graded';
  statusColor: string;
  icon: string;
  iconBg: string;
};

export type TestResult = {
  id: number;
  title: string;
  date: string;
  icon: string;
  iconBg: string;
  iconColor: string;
};

export type Activity = {
  id: number;
  title: string;
  subtitle: string;
  time: string;
  icon: string;
  iconBg: string;
};

export type CalendarDay = {
  day: number;
  month: 'prev' | 'current' | 'next';
  status: 'present' | 'absent' | 'no-class' | null;
};

