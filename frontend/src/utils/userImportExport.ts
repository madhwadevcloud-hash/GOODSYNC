import { User } from '../types/user';

// CSV headers for user import/export
export const getUserImportHeaders = () => {
  return [
    // Basic Information
    'firstName', 'middleName', 'lastName', 'email', 'role',
    
    // Contact Information
    'primaryPhone', 'secondaryPhone', 'whatsappNumber',
    'emergencyContactName', 'emergencyContactRelation', 'emergencyContactPhone',
    
    // Address Information
    'permanentStreet', 'permanentArea', 'permanentCity', 'permanentState', 
    'permanentCountry', 'permanentPincode', 'permanentLandmark',
    'sameAsPermanent', 'currentStreet', 'currentArea', 'currentCity', 
    'currentState', 'currentCountry', 'currentPincode', 'currentLandmark',
    
    // Identity Information
    'aadharNumber', 'panNumber',
    
    // Student Specific Fields
    'currentClass', 'currentSection', 'rollNumber', 'admissionNumber', 'admissionDate',
    'dateOfBirth', 'gender', 'bloodGroup', 'nationality', 'religion', 'caste', 'category',
    'fatherName', 'fatherPhone', 'fatherEmail', 'fatherOccupation', 'fatherAnnualIncome',
    'motherName', 'motherPhone', 'motherEmail', 'motherOccupation', 'motherAnnualIncome',
    'guardianName', 'guardianRelationship', 'guardianPhone', 'guardianEmail',
    'previousSchoolName', 'previousBoard', 'lastClass', 'tcNumber',
    'transportMode', 'busRoute', 'pickupPoint',
    'feeCategory', 'concessionType', 'concessionPercentage',
    'bankName', 'bankAccountNo', 'bankIFSC',
    'medicalConditions', 'allergies', 'specialNeeds',
    
    // Teacher Specific Fields
    'employeeId', 'subjects', 'qualification', 'experience', 'joiningDate',
    'specialization', 'previousExperience',
    
    // Admin Specific Fields
    'designation'
  ];
};

// Generate sample data for import template
export const generateSampleImportData = () => {
  return [
    // Student sample
    {
      firstName: 'John',
      middleName: 'Kumar',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      role: 'student',
      primaryPhone: '9876543210',
      secondaryPhone: '9876543211',
      whatsappNumber: '9876543210',
      emergencyContactName: 'Jane Doe',
      emergencyContactRelation: 'Mother',
      emergencyContactPhone: '9876543211',
      permanentStreet: '123 Main Street',
      permanentArea: 'City Center',
      permanentCity: 'Bangalore',
      permanentState: 'Karnataka',
      permanentCountry: 'India',
      permanentPincode: '560001',
      permanentLandmark: 'Near City Mall',
      sameAsPermanent: 'true',
      currentStreet: '',
      currentArea: '',
      currentCity: '',
      currentState: '',
      currentCountry: '',
      currentPincode: '',
      currentLandmark: '',
      aadharNumber: '123456789012',
      panNumber: '',
      currentClass: '10th',
      currentSection: 'A',
      rollNumber: '10',
      admissionNumber: 'ADM2024001',
      admissionDate: '2024-04-01',
      dateOfBirth: '2008-05-15',
      gender: 'male',
      bloodGroup: 'O+',
      nationality: 'Indian',
      religion: 'Hindu',
      caste: 'General',
      category: 'General',
      fatherName: 'Robert Doe',
      fatherPhone: '9876543212',
      fatherEmail: 'robert.doe@example.com',
      fatherOccupation: 'Engineer',
      fatherAnnualIncome: '500000',
      motherName: 'Jane Doe',
      motherPhone: '9876543211',
      motherEmail: 'jane.doe@example.com',
      motherOccupation: 'Teacher',
      motherAnnualIncome: '300000',
      guardianName: '',
      guardianRelationship: '',
      guardianPhone: '',
      guardianEmail: '',
      previousSchoolName: 'ABC School',
      previousBoard: 'CBSE',
      lastClass: '9th',
      tcNumber: 'TC123',
      transportMode: 'Bus',
      busRoute: 'Route 5',
      pickupPoint: 'City Center Stop',
      feeCategory: 'Regular',
      concessionType: '',
      concessionPercentage: '0',
      bankName: 'SBI',
      bankAccountNo: '12345678901',
      bankIFSC: 'SBIN0001234',
      medicalConditions: 'None',
      allergies: 'Peanuts',
      specialNeeds: 'None',
      employeeId: '',
      subjects: '',
      qualification: '',
      experience: '',
      joiningDate: '',
      specialization: '',
      previousExperience: '',
      designation: ''
    },
    
    // Teacher sample
    {
      firstName: 'Sarah',
      middleName: 'R',
      lastName: 'Smith',
      email: 'sarah.smith@example.com',
      role: 'teacher',
      primaryPhone: '9876543220',
      secondaryPhone: '',
      whatsappNumber: '9876543220',
      emergencyContactName: 'Michael Smith',
      emergencyContactRelation: 'Husband',
      emergencyContactPhone: '9876543221',
      permanentStreet: '456 Teacher Lane',
      permanentArea: 'Education District',
      permanentCity: 'Bangalore',
      permanentState: 'Karnataka',
      permanentCountry: 'India',
      permanentPincode: '560002',
      permanentLandmark: 'Near School Complex',
      sameAsPermanent: 'true',
      currentStreet: '',
      currentArea: '',
      currentCity: '',
      currentState: '',
      currentCountry: '',
      currentPincode: '',
      currentLandmark: '',
      aadharNumber: '123456789013',
      panNumber: 'ABCDE1234F',
      currentClass: '',
      currentSection: '',
      rollNumber: '',
      admissionNumber: '',
      admissionDate: '',
      dateOfBirth: '1985-03-20',
      gender: 'female',
      bloodGroup: 'A+',
      nationality: 'Indian',
      religion: 'Christian',
      caste: '',
      category: '',
      fatherName: '',
      fatherPhone: '',
      fatherEmail: '',
      fatherOccupation: '',
      fatherAnnualIncome: '',
      motherName: '',
      motherPhone: '',
      motherEmail: '',
      motherOccupation: '',
      motherAnnualIncome: '',
      guardianName: '',
      guardianRelationship: '',
      guardianPhone: '',
      guardianEmail: '',
      previousSchoolName: '',
      previousBoard: '',
      lastClass: '',
      tcNumber: '',
      transportMode: '',
      busRoute: '',
      pickupPoint: '',
      feeCategory: '',
      concessionType: '',
      concessionPercentage: '',
      bankName: 'HDFC Bank',
      bankAccountNo: '12345678902',
      bankIFSC: 'HDFC0001234',
      medicalConditions: '',
      allergies: '',
      specialNeeds: '',
      employeeId: 'EMP001',
      subjects: 'Mathematics;Physics',
      qualification: 'M.Sc Mathematics',
      experience: '5',
      joiningDate: '2023-06-01',
      specialization: 'Applied Mathematics',
      previousExperience: 'Taught at XYZ School for 3 years',
      designation: ''
    },
    
    // Admin sample
    {
      firstName: 'David',
      middleName: '',
      lastName: 'Wilson',
      email: 'david.wilson@example.com',
      role: 'admin',
      primaryPhone: '9876543230',
      secondaryPhone: '',
      whatsappNumber: '9876543230',
      emergencyContactName: 'Lisa Wilson',
      emergencyContactRelation: 'Wife',
      emergencyContactPhone: '9876543231',
      permanentStreet: '789 Admin Road',
      permanentArea: 'Central Business District',
      permanentCity: 'Bangalore',
      permanentState: 'Karnataka',
      permanentCountry: 'India',
      permanentPincode: '560003',
      permanentLandmark: 'Near Government Office',
      sameAsPermanent: 'true',
      currentStreet: '',
      currentArea: '',
      currentCity: '',
      currentState: '',
      currentCountry: '',
      currentPincode: '',
      currentLandmark: '',
      aadharNumber: '123456789014',
      panNumber: 'FGHIJ5678K',
      currentClass: '',
      currentSection: '',
      rollNumber: '',
      admissionNumber: '',
      admissionDate: '',
      dateOfBirth: '1980-12-10',
      gender: 'male',
      bloodGroup: 'B+',
      nationality: 'Indian',
      religion: 'Hindu',
      caste: '',
      category: '',
      fatherName: '',
      fatherPhone: '',
      fatherEmail: '',
      fatherOccupation: '',
      fatherAnnualIncome: '',
      motherName: '',
      motherPhone: '',
      motherEmail: '',
      motherOccupation: '',
      motherAnnualIncome: '',
      guardianName: '',
      guardianRelationship: '',
      guardianPhone: '',
      guardianEmail: '',
      previousSchoolName: '',
      previousBoard: '',
      lastClass: '',
      tcNumber: '',
      transportMode: '',
      busRoute: '',
      pickupPoint: '',
      feeCategory: '',
      concessionType: '',
      concessionPercentage: '',
      bankName: 'ICICI Bank',
      bankAccountNo: '12345678903',
      bankIFSC: 'ICIC0001234',
      medicalConditions: '',
      allergies: '',
      specialNeeds: '',
      employeeId: 'ADM001',
      subjects: '',
      qualification: 'MBA',
      experience: '10',
      joiningDate: '2020-01-15',
      specialization: '',
      previousExperience: 'Worked as Assistant Principal at DEF School',
      designation: 'Principal'
    }
  ];
};

// Convert user data to CSV row
export const userToCSVRow = (user: User): string[] => {
  const headers = getUserImportHeaders();
  return headers.map(header => {
    switch (header) {
      // Basic Information
      case 'firstName': return user.name.firstName || '';
      case 'middleName': return user.name.middleName || '';
      case 'lastName': return user.name.lastName || '';
      case 'email': return user.email || '';
      case 'role': return user.role || '';
      
      // Contact Information
      case 'primaryPhone': return user.contact.primaryPhone || '';
      case 'secondaryPhone': return user.contact.secondaryPhone || '';
      case 'whatsappNumber': return user.contact.whatsappNumber || '';
      case 'emergencyContactName': return user.contact.emergencyContact?.name || '';
      case 'emergencyContactRelation': return user.contact.emergencyContact?.relationship || '';
      case 'emergencyContactPhone': return user.contact.emergencyContact?.phone || '';
      
      // Address Information
      case 'permanentStreet': return user.address.permanent.street || '';
      case 'permanentArea': return user.address.permanent.area || '';
      case 'permanentCity': return user.address.permanent.city || '';
      case 'permanentState': return user.address.permanent.state || '';
      case 'permanentCountry': return user.address.permanent.country || '';
      case 'permanentPincode': return user.address.permanent.pincode || '';
      case 'permanentLandmark': return user.address.permanent.landmark || '';
      case 'sameAsPermanent': return user.address.sameAsPermanent ? 'true' : 'false';
      case 'currentStreet': return user.address.current?.street || '';
      case 'currentArea': return user.address.current?.area || '';
      case 'currentCity': return user.address.current?.city || '';
      case 'currentState': return user.address.current?.state || '';
      case 'currentCountry': return user.address.current?.country || '';
      case 'currentPincode': return user.address.current?.pincode || '';
      case 'currentLandmark': return user.address.current?.landmark || '';
      
      // Identity Information
      case 'aadharNumber': return user.identity?.aadharNumber || '';
      case 'panNumber': return user.identity?.panNumber || '';
      
      // Student Specific Fields
      case 'currentClass': return user.studentDetails?.currentClass || '';
      case 'currentSection': return user.studentDetails?.currentSection || '';
      case 'rollNumber': return user.studentDetails?.rollNumber || '';
      case 'admissionNumber': return user.studentDetails?.admissionNumber || '';
      case 'admissionDate': return user.studentDetails?.admissionDate || '';
      case 'dateOfBirth': 
        return user.studentDetails?.dateOfBirth || 
               user.teacherDetails?.dateOfBirth || 
               user.adminDetails?.dateOfBirth || '';
      case 'gender': 
        return user.studentDetails?.gender || 
               user.teacherDetails?.gender || 
               user.adminDetails?.gender || '';
      case 'bloodGroup': 
        return user.studentDetails?.bloodGroup || 
               user.teacherDetails?.bloodGroup || 
               user.adminDetails?.bloodGroup || '';
      case 'nationality': 
        return user.studentDetails?.nationality || 
               user.teacherDetails?.nationality || 
               user.adminDetails?.nationality || '';
      case 'religion': 
        return user.studentDetails?.religion || 
               user.teacherDetails?.religion || '';
      case 'caste': return user.studentDetails?.caste || '';
      case 'category': return user.studentDetails?.category || '';
      case 'fatherName': return user.studentDetails?.fatherName || '';
      case 'fatherPhone': return user.studentDetails?.fatherPhone || '';
      case 'fatherEmail': return user.studentDetails?.fatherEmail || '';
      case 'fatherOccupation': return user.studentDetails?.fatherOccupation || '';
      case 'fatherAnnualIncome': return user.studentDetails?.fatherAnnualIncome?.toString() || '';
      case 'motherName': return user.studentDetails?.motherName || '';
      case 'motherPhone': return user.studentDetails?.motherPhone || '';
      case 'motherEmail': return user.studentDetails?.motherEmail || '';
      case 'motherOccupation': return user.studentDetails?.motherOccupation || '';
      case 'motherAnnualIncome': return user.studentDetails?.motherAnnualIncome?.toString() || '';
      case 'guardianName': return user.studentDetails?.guardianName || '';
      case 'guardianRelationship': return user.studentDetails?.guardianRelationship || '';
      case 'guardianPhone': return user.studentDetails?.guardianPhone || '';
      case 'guardianEmail': return user.studentDetails?.guardianEmail || '';
      case 'previousSchoolName': return user.studentDetails?.previousSchoolName || '';
      case 'previousBoard': return user.studentDetails?.previousBoard || '';
      case 'lastClass': return user.studentDetails?.lastClass || '';
      case 'tcNumber': return user.studentDetails?.tcNumber || '';
      case 'transportMode': return user.studentDetails?.transportMode || '';
      case 'busRoute': return user.studentDetails?.busRoute || '';
      case 'pickupPoint': return user.studentDetails?.pickupPoint || '';
      case 'feeCategory': return user.studentDetails?.feeCategory || '';
      case 'concessionType': return user.studentDetails?.concessionType || '';
      case 'concessionPercentage': return user.studentDetails?.concessionPercentage?.toString() || '';
      case 'bankName': 
        return user.studentDetails?.bankName || 
               user.teacherDetails?.bankName || 
               user.adminDetails?.bankName || '';
      case 'bankAccountNo': 
        return user.studentDetails?.bankAccountNo || 
               user.teacherDetails?.bankAccountNo || 
               user.adminDetails?.bankAccountNo || '';
      case 'bankIFSC': 
        return user.studentDetails?.bankIFSC || 
               user.teacherDetails?.bankIFSC || 
               user.adminDetails?.bankIFSC || '';
      case 'medicalConditions': return user.studentDetails?.medicalConditions || '';
      case 'allergies': return user.studentDetails?.allergies || '';
      case 'specialNeeds': return user.studentDetails?.specialNeeds || '';
      
      // Teacher Specific Fields
      case 'employeeId': 
        return user.teacherDetails?.employeeId || user.adminDetails?.employeeId || '';
      case 'subjects': return user.teacherDetails?.subjects?.join(';') || '';
      case 'qualification': 
        return user.teacherDetails?.qualification || user.adminDetails?.qualification || '';
      case 'experience': 
        return user.teacherDetails?.experience?.toString() || user.adminDetails?.experience?.toString() || '';
      case 'joiningDate': 
        return user.teacherDetails?.joiningDate || user.adminDetails?.joiningDate || '';
      case 'specialization': return user.teacherDetails?.specialization || '';
      case 'previousExperience': 
        return user.teacherDetails?.previousExperience || user.adminDetails?.previousExperience || '';
      
      // Admin Specific Fields
      case 'designation': return user.adminDetails?.designation || '';
      
      default: return '';
    }
  });
};

// Generate and download CSV file
export const downloadCSV = (data: any[], filename: string, headers?: string[]) => {
  let csvContent = '';
  
  // Add headers if provided
  if (headers) {
    csvContent += headers.join(',') + '\n';
  }
  
  // Add data rows
  if (Array.isArray(data) && data.length > 0) {
    if (typeof data[0] === 'object') {
      // If data is array of objects, extract values
      data.forEach(row => {
        if (headers) {
          const values = headers.map(header => {
            const value = row[header] || '';
            // Escape commas and quotes in CSV
            return `"${String(value).replace(/"/g, '""')}"`;
          });
          csvContent += values.join(',') + '\n';
        } else {
          const values = Object.values(row).map(value => `"${String(value).replace(/"/g, '""')}"`);
          csvContent += values.join(',') + '\n';
        }
      });
    } else {
      // If data is array of arrays
      data.forEach(row => {
        const values = row.map((value: any) => `"${String(value).replace(/"/g, '""')}"`);
        csvContent += values.join(',') + '\n';
      });
    }
  }
  
  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Generate import template
export const generateImportTemplate = (schoolCode: string) => {
  const headers = getUserImportHeaders();
  const sampleData = generateSampleImportData();
  
  downloadCSV(
    sampleData,
    `user_import_template_${schoolCode}_${new Date().toISOString().split('T')[0]}.csv`,
    headers
  );
};

// Export users to CSV
export const exportUsers = (users: User[], schoolCode: string) => {
  const headers = getUserImportHeaders();
  const csvData = users.map(user => {
    const row: any = {};
    const csvRow = userToCSVRow(user);
    headers.forEach((header, index) => {
      row[header] = csvRow[index];
    });
    return row;
  });
  
  downloadCSV(
    csvData,
    `users_export_${schoolCode}_${new Date().toISOString().split('T')[0]}.csv`,
    headers
  );
};
