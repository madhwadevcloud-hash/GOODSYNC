import { schoolAPI } from '../services/api';

// Default school details that will be used if API fails
export const defaultSchoolDetails = {
  schoolName: 'KENDRIYA VIDYALAYA',
  schoolCode: 'KV',
  logoUrl: '/default-school-logo.svg', // Default logo path
  address: 'School Address, City, State - Pincode',
  phone: '+91 XXXXXXXXXX',
  email: 'info@school.edu.in',
  website: 'www.school.edu.in',
  headerColor: '#1f2937',
  accentColor: '#3b82f6',
  contact: {
    phone: '+91 XXXXXXXXXX'
  },
  bankDetails: {
    bankName: 'School Bank',
    accountNumber: '12345678901234',
    ifscCode: 'SBIN0001234',
    branch: 'Main Branch',
    accountHolderName: 'KENDRIYA VIDYALAYA'
  }
};

/**
 * Fetches school details from the API or returns default values if the API fails
 * @param schoolId The ID of the school to fetch details for
 * @returns Promise that resolves to school details in TemplateSettings format
 */
export const getSchoolDetails = async (schoolId: string) => {
  try {
    console.log(`[getSchoolDetails] Fetching school data for ID: ${schoolId}`);
    const response = await schoolAPI.getSchoolById(schoolId);
    
    if (response?.data?.data) {
      const apiData = response.data.data;
      
      // Transform API data to match TemplateSettings format
      const schoolData = {
        schoolName: apiData.schoolName || apiData.name || defaultSchoolDetails.schoolName,
        schoolCode: apiData.schoolCode || apiData.code || defaultSchoolDetails.schoolCode,
        logoUrl: getSchoolLogo(apiData),
        address: formatAddress(apiData.address || apiData.schoolAddress || defaultSchoolDetails.address),
        phone: apiData.contact?.phone || apiData.phone || defaultSchoolDetails.phone,
        email: apiData.contact?.email || apiData.email || defaultSchoolDetails.email,
        website: apiData.website || defaultSchoolDetails.website,
        headerColor: apiData.headerColor || defaultSchoolDetails.headerColor,
        accentColor: apiData.accentColor || defaultSchoolDetails.accentColor,
        bankDetails: {
          ...defaultSchoolDetails.bankDetails,
          ...(apiData.bankDetails || apiData.bank || {})
        }
      };
      
      console.log('[getSchoolDetails] Processed school data:', schoolData);
      return schoolData;
    }
    
    console.warn('[getSchoolDetails] No data in API response, using defaults');
    return defaultSchoolDetails;
  } catch (error) {
    console.error('Error fetching school details, using defaults:', error);
    return defaultSchoolDetails;
  }
};

/**
 * Gets the school logo URL with proper formatting
 * @param schoolDetails School details object
 * @returns URL to the school logo
 */
export const getSchoolLogo = (schoolDetails: any): string => {
  if (!schoolDetails) return defaultSchoolDetails.logoUrl;
  
  // Check for logo in different possible properties
  const logoUrl = schoolDetails.logoUrl || 
                 schoolDetails.schoolLogo || 
                 schoolDetails.logo;
  
  if (!logoUrl) return defaultSchoolDetails.logoUrl;
  
  // If it's already a full URL, return as is
  if (logoUrl.startsWith('http')) return logoUrl;
  
  // If it's a path, ensure it has a leading slash
  return logoUrl.startsWith('/') ? logoUrl : `/${logoUrl}`;
};

/**
 * Formats address from different possible formats into a single string
 */
const formatAddress = (address: string | {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  [key: string]: any;
}): string => {
  if (typeof address === 'string') return address;
  
  const parts = [
    address.addressLine1,
    address.addressLine2,
    address.area,
    address.city,
    address.state,
    address.pincode || address.zipCode
  ].filter(Boolean);
  
  return parts.join(', ');
};

/**
 * Gets formatted bank details for display in challans
 * @param schoolDetails School details object
 * @returns Formatted bank details string
 */
export const getFormattedBankDetails = (schoolDetails: any) => {
  const bank = schoolDetails?.bankDetails || defaultSchoolDetails.bankDetails;
  return `A/C Holder: ${bank.accountName}\n` +
         `A/C No: ${bank.accountNumber}\n` +
         `Bank: ${bank.bankName}\n` +
         `IFSC: ${bank.ifscCode}\n` +
         `Branch: ${bank.branch}`;
};

/**
 * Gets formatted school address
 * @param schoolDetails School details object
 * @returns Formatted address string
 */
export const getFormattedAddress = (schoolDetails: any) => {
  const addr = schoolDetails?.address || defaultSchoolDetails.address;
  return `${addr.addressLine1 || ''}\n` +
         `${addr.city || ''} ${addr.state || ''} - ${addr.pincode || ''}\n` +
         `Ph: ${schoolDetails?.contact?.phone || defaultSchoolDetails.contact.phone}`;
};
