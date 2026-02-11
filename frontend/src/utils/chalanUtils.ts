import { v4 as uuidv4 } from 'uuid';

interface Installment {
  name: string;
  amount: number;
  dueDate: string;
  description: string;
  chalanNumber?: string;
  chalanDate?: string;
  chalanBank?: string;
  chalanStatus?: 'pending' | 'generated' | 'paid';
}

interface StudentInfo {
  name: string;
  className: string;
  academicYear: string;
}

export const generateChalanNumber = (): string => {
  // Format: CHL-YYYYMMDD-XXXXX (where X are random alphanumeric characters)
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `CHL-${dateStr}-${randomStr}`;
};

export const generateChalan = (
  installment: Installment,
  studentInfo: StudentInfo
) => {
  const chalanNumber = generateChalanNumber();
  const today = new Date().toISOString().split('T')[0];
  
  return {
    ...installment,
    chalanNumber,
    chalanDate: today,
    chalanStatus: 'generated' as const,
    studentName: studentInfo.name,
    className: studentInfo.className,
    academicYear: studentInfo.academicYear,
  };
};

export const getDefaultBank = (): string => {
  // You can implement logic to get the default bank from settings if needed
  return 'SBI';
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB');
};
