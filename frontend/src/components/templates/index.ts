// Template Components Export
export { default as IDCardTemplate } from './IDCardTemplate';
export { default as NewIDCardTemplate } from './NewIDCardTemplate';
export { default as CustomIDCardTemplate } from './CustomIDCardTemplate';
export { default as AdmitCardTemplate } from './AdmitCardTemplate';
export { default as InvoiceTemplate } from './InvoiceTemplate';
export { default as CertificateTemplate } from './CertificateTemplate';

// Template Data Hooks
export { useTemplateData } from './hooks/useTemplateData';

// Template Types
export type {
  TemplateSettings,
  TemplateProps,
  IDCardTemplateProps,
  CustomIDCardTemplateProps,
  AdmitCardTemplateProps,
  InvoiceTemplateProps,
  CertificateTemplateProps,
  Student,
  Subject,
  TemplateColors
} from './types.ts';

// Re-export template colors for easy access
export { TEMPLATE_COLORS } from './types';
