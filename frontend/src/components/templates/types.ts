export interface TemplateSettings {
  schoolName: string;
  schoolCode: string;
  website: string;
  logoUrl: string;
  headerColor: string;
  accentColor: string;
  address: string;
  phone: string;
  email: string;
}

export interface TemplateProps {
  settings: TemplateSettings;
  data?: any;
  mode?: 'preview' | 'print' | 'export';
  className?: string;
}

export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  sequenceId?: string;
  className: string;
  section: string;
  profileImage?: string;
  fatherName?: string;
  motherName?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  address?: string;
  phone?: string;
}

export interface Subject {
  id: string;
  name: string;
  examDate: string;
  examTime: string;
  examHour: string;
  examMinute: string;
  examAmPm: string;
  roomNumber?: string;
}

export interface IDCardTemplateProps extends TemplateProps {
  student: Student;
  templateId: 'landscape' | 'portrait';
  side: 'front' | 'back';
}

export interface CustomIDCardTemplateProps extends IDCardTemplateProps {
  templateImage: string;
  dataFields: any;
  photoPlacement: any;
  schoolLogoPlacement?: any;
}

export interface AdmitCardTemplateProps extends TemplateProps {
  student: Student;
  subjects: Subject[];
  testName: string;
  enableRoomNumbers?: boolean;
  instructions?: string[];
}

export interface InvoiceTemplateProps extends TemplateProps {
  invoiceData: {
    invoiceNumber: string;
    date: string;
    dueDate: string;
    clientName: string;
    clientAddress: string;
    items: Array<{
      description: string;
      quantity: number;
      rate: number;
      amount: number;
    }>;
    subtotal: number;
    tax: number;
    total: number;
  };
}

export interface CertificateTemplateProps extends TemplateProps {
  certificateData: {
    recipientName: string;
    courseName: string;
    completionDate: string;
    certificateNumber: string;
    signatory: string;
    signatoryTitle: string;
  };
}

export interface TemplateColors {
  primary: string;
  secondary: string;
  accent: string;
}

export const TEMPLATE_COLORS: Record<string, TemplateColors> = {
  template1: { primary: '#1E40AF', secondary: '#3B82F6', accent: '#DBEAFE' },
  template2: { primary: '#059669', secondary: '#10B981', accent: '#D1FAE5' },
  template3: { primary: '#7C3AED', secondary: '#8B5CF6', accent: '#EDE9FE' },
  template4: { primary: '#EA580C', secondary: '#F97316', accent: '#FED7AA' },
};
