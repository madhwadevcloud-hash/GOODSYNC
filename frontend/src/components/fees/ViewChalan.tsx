import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import api from '../../services/api';

interface ViewChalanProps {
  isOpen: boolean;
  onClose: () => void;
  chalan: ChalanDetails;
}

// Utility functions
const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Compute a sensible default academic year (April-start school year),
// used ONLY when neither the chalan nor the backend gave us one — never
// a hardcoded string like "2024-25".
const computeDefaultAcademicYear = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  return month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

interface BankDetails {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  accountHolderName: string;
}

interface Address {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  [key: string]: any; // Allow additional dynamic properties
}

interface SchoolData {
  _id?: string;
  name?: string;
  schoolName?: string;
  code?: string;
  schoolCode?: string;
  logo?: string;
  logoUrl?: string;
  address?: string | Address;
  contact?: {
    email?: string;
    phone?: string;
    website?: string;
    [key: string]: any;
  };
  [key: string]: any; // Allow additional dynamic properties
}

interface ChalanDetails {
  // Chalan Details
  chalanNumber: string;
  chalanDate: string;

  // Installment Details
  installmentName: string;
  amount: number;
  dueDate: string;

  // Student Details
  studentName: string;
  studentId: string;
  userId?: string; // User-friendly ID (e.g., 123-S-0006)
  admissionNumber?: string; // Alternative ID field
  rollNumber?: string | null; // Another possible ID field
  className: string;
  section: string;
  academicYear: string;

  // School Details
  schoolName: string;
  schoolAddress: string;
  schoolPhone?: string;
  schoolEmail?: string;
  schoolLogo?: string;
  schoolCode?: string;
  schoolData?: SchoolData; // Add schoolData to store complete school information

  // Bank Details
  bankDetails?: BankDetails;

  // Backend fields
  _id?: string;
  status?: 'unpaid' | 'paid' | 'cancelled';

  [key: string]: unknown; // Allow additional dynamic properties
}

// Helper hook: resolve the chalan number to display (backend value preferred,
// falls back to a server-generated or local placeholder).
const useChalanNumber = (chalan: ChalanDetails) => {
  const [chalanNumber, setChalanNumber] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const generateChalanNumber = useCallback(() => {
    const randomNum = Math.floor(Math.random() * 1000);
    return `CRN-TEMP-${randomNum}`;
  }, []);

  useEffect(() => {
    const fetchChalanNumber = async () => {
      if (chalan.chalanNumber && chalan.chalanNumber.trim() !== '') {
        setChalanNumber(chalan.chalanNumber.trim().toUpperCase());
        return;
      }

      setIsLoading(true);
      try {
        const response = await api.get('/chalans/next-chalan-number');
        if (response?.data?.success && response?.data?.chalanNumber) {
          setChalanNumber(response.data.chalanNumber);
          return;
        }
        setChalanNumber(generateChalanNumber());
      } catch (error) {
        console.error('Error fetching chalan number:', error);
        setChalanNumber(generateChalanNumber());
      } finally {
        setIsLoading(false);
      }
    };

    if (chalan.chalanNumber) {
      setChalanNumber(chalan.chalanNumber);
    } else {
      fetchChalanNumber();
    }
  }, [chalan.chalanNumber, generateChalanNumber]);

  return { chalanNumber, isLoading };
};

interface ChalanCopyProps {
  chalan: ChalanDetails;
  copyType: 'Student Copy' | 'Office Copy' | 'Admin Copy';
}

const ChalanCopy: React.FC<ChalanCopyProps> = ({ chalan, copyType }) => {
  const isLoading = false;

  const getLogoUrl = useCallback((logoPath?: string): string => {
    if (!logoPath) return '';
    if (logoPath.startsWith('http')) return logoPath;
    if (logoPath.startsWith('/uploads')) {
      const envBase = (import.meta.env.VITE_API_BASE_URL as string);
      const baseUrl = envBase.replace(/\/api\/?$/, '');
      return `${baseUrl}${logoPath}`;
    }
    return logoPath;
  }, []);

  const getChalanLogoUrl = useCallback(() => {
    if (chalan?.schoolLogo) return getLogoUrl(chalan.schoolLogo);
    const logoFromSchoolData = chalan?.schoolData?.logo || chalan?.schoolData?.logoUrl;
    if (logoFromSchoolData) return getLogoUrl(logoFromSchoolData);
    const defaultLogo = import.meta.env.VITE_DEFAULT_SCHOOL_LOGO || '/default-school-logo.svg';
    return getLogoUrl(defaultLogo);
  }, [chalan?.schoolLogo, chalan?.schoolData, getLogoUrl]);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    const defaultLogo = import.meta.env.VITE_DEFAULT_SCHOOL_LOGO || '/default-school-logo.svg';
    const defaultLogoUrl = getLogoUrl(defaultLogo);
    if (target.src !== defaultLogoUrl) {
      target.src = defaultLogoUrl;
    } else {
      target.style.display = 'none';
    }
  }, [getLogoUrl]);

  // Academic year: use the real value from the chalan; only fall back to a
  // dynamically computed year (never a hardcoded string) if it's missing.
  const displayAcademicYear = chalan.academicYear || computeDefaultAcademicYear();

  return (
    <div className="w-full max-w-full min-w-0 border-2 border-gray-400 p-4 mb-4" style={{ backgroundColor: '#ffffff' }}>
      {/* School Header with Logo and Details */}
      <div className="mb-4 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <div className="h-16 w-16 flex items-center justify-center border border-gray-200 rounded overflow-hidden">
              <img
                src={getChalanLogoUrl()}
                alt={`${chalan.schoolName || 'School'} Logo`}
                className="w-full h-full object-contain p-1"
                crossOrigin="anonymous"
                onError={handleImageError}
              />
            </div>
          </div>

          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {chalan.schoolName || 'School Name'}
            </h1>
            <p className="text-sm text-gray-600">
              {formatAddress(chalan.schoolAddress || chalan.schoolData?.address) || 'Address not available'}
            </p>
          </div>
        </div>

        <div className="text-center mt-3">
          <p className="text-sm font-bold uppercase tracking-wide">FEE PAYMENT CHALAN</p>
          <p className="text-xs text-gray-600 mt-1">Academic Year: {displayAcademicYear}</p>
          <p className="text-xs font-semibold text-blue-600 mt-1">{copyType.toUpperCase()}</p>
          <p className="text-sm font-semibold text-gray-700 mt-2">
            Chalan: {isLoading ? 'Loading...' : chalan.chalanNumber || 'N/A'}
          </p>
        </div>
      </div>

      <div className="border-t border-gray-200 my-2"></div>

      {/* Student Details Section */}
      <div className="mt-2 px-4 text-xs">
        <div className="mb-2">
          <p className="text-xs font-medium">Student Details</p>
        </div>
        <div>
          <div className="space-y-1">
            <div className="flex items-center mb-1">
              <span className="w-28 text-xs text-gray-600 font-medium">Name:</span>
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-800">{chalan.studentName || 'N/A'}</span>
              </div>
            </div>

            <div className="flex items-center mb-1">
              <span className="w-28 text-xs text-gray-600 font-medium">Student ID:</span>
              <div className="flex-1">
                <span className="text-sm font-mono text-gray-800">
                  {chalan.userId ||
                    chalan.admissionNumber ||
                    (chalan.studentId?.startsWith('KVS-')
                      ? chalan.studentId
                      : chalan.studentId?.match(/^[0-9a-fA-F]{24}$/)
                      ? 'N/A'
                      : chalan.studentId || 'N/A')}
                </span>
              </div>
            </div>

            <div className="flex items-center">
              <span className="w-28 text-xs text-gray-600 font-medium">Class & Sec:</span>
              <div className="flex-1">
                <span className="text-sm text-gray-800">
                  {chalan.className || 'N/A'} {chalan.section ? `- ${chalan.section}` : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 my-2"></div>

          <div className="mt-4">
            <p className="font-semibold mb-2 text-sm">Payment Details:</p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center">
                <span className="w-28 text-xs text-gray-600 font-medium">Installment:</span>
                <div className="flex-1">
                  <span className="text-sm text-gray-900">{chalan.installmentName || 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-center">
                <span className="w-28 text-xs text-gray-600 font-medium">Amount:</span>
                <span className="text-sm font-bold text-blue-700">{formatCurrency(chalan.amount)}</span>
              </div>

              <div className="flex items-center">
                <span className="w-28 text-xs text-gray-600 font-medium">Due Date:</span>
                <div className="flex-1">
                  <span className="text-sm text-gray-900">{formatDate(chalan.dueDate) || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* School Bank Details Section */}
        <div className="mt-4 border-t border-gray-200 pt-3">
          <p className="font-semibold mb-2 text-left text-xs">School Bank Details:</p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center">
              <p className="w-28 text-xs text-gray-600 font-medium">Bank Name:</p>
              <p className="text-sm text-gray-900">
                {chalan.schoolData?.bankDetails?.bankName || chalan.bankDetails?.bankName || 'Not Available'}
              </p>
            </div>
            <div className="flex items-center">
              <p className="w-28 text-xs text-gray-600 font-medium">Account Holder:</p>
              <p className="text-sm font-medium text-gray-800">
                {chalan.schoolData?.bankDetails?.accountHolderName ||
                  chalan.bankDetails?.accountHolderName ||
                  'Not Available'}
              </p>
            </div>
            <div className="flex items-center">
              <p className="w-28 text-xs text-gray-600 font-medium">A/c No:</p>
              <p className="text-sm font-mono text-gray-900">
                {chalan.schoolData?.bankDetails?.accountNumber || chalan.bankDetails?.accountNumber || 'Not Available'}
              </p>
            </div>
            <div className="flex items-center">
              <p className="w-28 text-xs text-gray-600 font-medium">IFSC Code:</p>
              <p className="text-sm font-mono text-gray-900">
                {chalan.schoolData?.bankDetails?.ifscCode || chalan.bankDetails?.ifscCode || 'Not Available'}
              </p>
            </div>
            <div className="flex items-center">
              <p className="w-28 text-xs text-gray-600 font-medium">Branch:</p>
              <p className="text-sm text-gray-900">
                {chalan.schoolData?.bankDetails?.branch || chalan.bankDetails?.branch || 'Not Available'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const formatAddress = (address: string | Address | undefined): string => {
  if (!address) return 'School Address, City, State - Pincode';
  if (typeof address === 'string') return address;
  if (typeof address === 'object') {
    const { street = '', area = '', city = '', state = '', country = '', pinCode = '' } = address;
    const parts = [street, area, city, state, country, pinCode || ''].filter(Boolean);
    return parts.join(', ');
  }
  return String(address);
};

const ViewChalan: React.FC<ViewChalanProps> = ({ isOpen, onClose, chalan: initialChalan }) => {
  const { user } = useAuth();
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const [chalan, setChalan] = useState<ChalanDetails>(() => ({
    chalanNumber: initialChalan?.chalanNumber || '',
    chalanDate: '',
    chalanStatus: 'generated',
    installmentName: '',
    amount: 0,
    dueDate: '',
    studentName: '',
    studentId: '',
    className: '',
    section: '',
    academicYear: '',
    schoolName: '',
    schoolAddress: '',
    schoolPhone: '',
    schoolEmail: '',
    schoolLogo: '',
    schoolData: {},
    bankDetails: {
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      branch: '',
      accountHolderName: ''
    }
  }));

  const { chalanNumber: fetchedChalanNumber } = useChalanNumber(chalan);

  useEffect(() => {
    if (fetchedChalanNumber && isOpen) {
      setChalan(prev => ({ ...prev, chalanNumber: fetchedChalanNumber }));
    }
  }, [fetchedChalanNumber, isOpen]);

  const [loading, setLoading] = useState(true);

  // Fetch school data when component opens
  useEffect(() => {
    const fetchSchoolData = async () => {
      if (!initialChalan || !isOpen) return;

      try {
        setLoading(true);
        let updatedChalan = { ...initialChalan };

        const response = await api.get('/schools/database/school-info');
        const schoolData = response?.data?.data || response?.data;

        if (schoolData) {
          let logoUrl = '';
          if (schoolData.logoUrl || schoolData.logo) {
            const rawLogoUrl = schoolData.logoUrl || schoolData.logo;
            if (rawLogoUrl.startsWith('/uploads')) {
              const envBase = (import.meta.env.VITE_API_BASE_URL as string);
              const baseUrl = envBase.replace(/\/api\/?$/, '');
              logoUrl = `${baseUrl}${rawLogoUrl}`;
            } else {
              logoUrl = rawLogoUrl;
            }
          }

          updatedChalan = {
            ...updatedChalan,
            schoolName: updatedChalan.schoolName || schoolData.name || schoolData.schoolName || 'School Name',
            schoolCode: updatedChalan.schoolCode || schoolData.code || schoolData.schoolCode || 'SCH001',
            schoolAddress: formatAddress(schoolData.address) || updatedChalan.schoolAddress,
            schoolEmail: schoolData.contact?.email || schoolData.email || updatedChalan.schoolEmail,
            schoolPhone: schoolData.contact?.phone || schoolData.phone || updatedChalan.schoolPhone,
            schoolLogo: logoUrl || updatedChalan.schoolLogo,
            bankDetails: schoolData.bankDetails,
            schoolData
          };
        }

        if (
          updatedChalan.studentId &&
          updatedChalan.studentId.match(/^[0-9a-fA-F]{24}$/) &&
          (updatedChalan as any)._id === updatedChalan.studentId
        ) {
          updatedChalan.studentId = 'N/A';
        }

        setChalan(updatedChalan);
      } catch (error) {
        console.error('Error fetching school data:', error);
        setChalan({
          ...initialChalan,
          schoolName: initialChalan.schoolName || 'School Name',
          schoolCode: initialChalan.schoolCode || 'SCH001'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolData();
  }, [isOpen, initialChalan]);

  if (!isOpen || !chalan || loading) return null;

  // Screenshots the rendered 3-copy layout (colors, borders, everything) and
  // saves it as a PDF — no OS print dialog involved.
  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    try {
      setDownloading(true);

      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const canvas = await html2canvas(printAreaRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: canvas.width >= canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Chalan-${chalan.chalanNumber || 'download'}.pdf`);
    } catch (error) {
      console.error('Failed to generate chalan PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const chalanCopies = [
    { type: 'Student Copy' as const, bgColor: 'bg-blue-50' },
    { type: 'Office Copy' as const, bgColor: 'bg-green-50' },
    { type: 'Admin Copy' as const, bgColor: 'bg-purple-50' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[calc(100vh-3rem)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 p-4">
          <h2 className="text-xl font-semibold text-gray-800">Chalan Details</h2>
          <div className="flex space-x-2">
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="p-2 text-gray-600 hover:text-blue-600 disabled:opacity-50"
              title="Download PDF"
            >
              {downloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
            </button>
            <button onClick={onClose} className="p-2 text-gray-600 hover:text-red-600">
              ✕
            </button>
          </div>
        </div>

        {/* Chalan Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div ref={printAreaRef} id="chalan-print" className="space-y-6" style={{ backgroundColor: '#ffffff' }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {chalanCopies.map((copy, index) => (
                <div key={index} className={`chalan-copy ${copy.bgColor}`}>
                  <ChalanCopy chalan={chalan} copyType={copy.type} />
                </div>
              ))}
            </div>
          </div>

          {/* Student Info */}
          <div className="border border-gray-200 rounded-lg p-4 mb-6 mt-6">
            <div className="grid grid-cols-3 gap-1 text-xs">
              <div>
                <p className="text-sm text-gray-600">Class</p>
                <p className="font-medium">{chalan.className}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  Date: <span className="font-medium">{chalan.chalanDate ? formatDate(chalan.chalanDate) : ''}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Fee Details */}
          <div className="border border-gray-200 rounded-lg overflow-hidden mb-6 overflow-x-auto">
            <table className="min-w-full w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-2">{chalan.installmentName} - {formatDate(chalan.dueDate)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(chalan.amount)}</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-2 font-semibold">Total Amount</td>
                  <td className="px-4 py-2 text-right font-semibold">{formatCurrency(chalan.amount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* School Bank Details */}
          <div className="mt-4 border-t border-gray-200 pt-3">
            <p className="font-semibold mb-3 text-left text-sm">Payment Instructions</p>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <svg className="h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700 mb-3">
                    Please deposit the fee in the following bank account and keep this chalan for future reference.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center">
                <p className="w-28 text-xs text-gray-600 font-medium">Account Name:</p>
                <p className="text-sm font-medium text-gray-800">
                  {chalan.schoolData?.bankDetails?.accountHolderName ||
                    chalan.bankDetails?.accountHolderName ||
                    'School Account'}
                </p>
              </div>
              <div className="flex items-center">
                <p className="w-28 text-xs text-gray-600 font-medium">Account No:</p>
                <p className="text-sm font-mono text-gray-900">
                  {chalan.schoolData?.bankDetails?.accountNumber || chalan.bankDetails?.accountNumber || 'XXXXXXXXXXXX'}
                </p>
              </div>
              <div className="flex items-center">
                <p className="w-28 text-xs text-gray-600 font-medium">Bank Name:</p>
                <p className="text-sm text-gray-900">
                  {chalan.schoolData?.bankDetails?.bankName || chalan.bankDetails?.bankName || 'Bank Name'}
                </p>
              </div>
              <div className="flex items-center">
                <p className="w-28 text-xs text-gray-600 font-medium">IFSC Code:</p>
                <p className="text-sm font-mono text-gray-900">
                  {chalan.schoolData?.bankDetails?.ifscCode || chalan.bankDetails?.ifscCode || 'XXXX0000000'}
                </p>
              </div>
              <div className="flex items-center">
                <p className="w-28 text-xs text-gray-600 font-medium">Branch:</p>
                <p className="text-sm text-gray-900">
                  {chalan.schoolData?.bankDetails?.branch || chalan.bankDetails?.branch || 'Branch Name'}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
            <p>This is a computer-generated chalan. No signature is required.</p>
            <p className="mt-1">For any queries, please contact the school office.</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-3 border-t border-gray-200 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60"
          >
            {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            {downloading ? 'Preparing PDF...' : 'Download Chalan'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewChalan;