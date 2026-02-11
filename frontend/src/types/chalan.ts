export interface Chalan {
  _id: string;
  chalanNumber: string;
  studentId: string | { _id: string; name?: string; admissionNo?: string };
  studentUserId: string;
  studentName?: string;
  admissionNumber?: string;
  class: string;
  section: string;
  amount: number;
  totalAmount: number;
  installmentName?: string;
  dueDate: string;
  status: 'unpaid' | 'paid' | 'cancelled';
  paymentId?: string;
  generatedBy: string;
  schoolId: string;
  copies: {
    student: string;
    office: string;
    admin: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface GenerateChalanData {
  class: string;
  section: string;
  installmentName?: string;
  dueDate: string;
  amount: number;
  studentIds: string[];
}
