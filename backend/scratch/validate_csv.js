
const fs = require('fs');
const csv = require('csv-parse/sync');

const headerMappings = {
    // Basic Info (Common)
    'firstname': 'firstname', 'middlename': 'middlename', 'lastname': 'lastname',
    'email': 'email', 'phone': 'primaryphone', 'primaryphone': 'primaryphone',
    'dateofbirth': 'dateofbirth', 'dob': 'dateofbirth', 'birthdate': 'dateofbirth',
    'gender': 'gender',
    // Address Info (Common)
    'address': 'permanentstreet', 'permanentstreet': 'permanentstreet', 'permanentarea': 'permanentarea',
    'city': 'permanentcity', 'permanentcity': 'permanentcity', 'state': 'permanentstate', 'permanentstate': 'permanentstate',
    'pincode': 'permanentpincode', 'permanentpincode': 'permanentpincode',
    'country': 'permanentcountry', 'permanentcountry': 'permanentcountry', 'permanentlandmark': 'permanentlandmark',
    'sameaspermanent': 'sameaspermanent', 'currentstreet': 'currentstreet', 'currentcity': 'currentcity',
    'currentstate': 'currentstate', 'currentpincode': 'currentpincode', 'currentcountry': 'currentcountry',
    'currentarea': 'currentarea', 'currentlandmark': 'currentlandmark',
    // Status (Common)
    'status': 'isactive', 'isactive': 'isactive',
    // Identity (Common)
    'aadharnumber': 'aadharnumber', 'religion': 'religion',
    // Bank Details (Common)
    'bankname': 'bankname', 'accountnumber': 'bankaccountno', 'bankaccountno': 'bankaccountno',
    'ifscode': 'bankifsc', 'bankifsc': 'bankifsc',
    'profileimage': 'profileimage',

    // Student Specific
    'studentid': 'studentid', 'admissionnumber': 'admissionnumber', 'rollnumber': 'rollnumber',
    'class': 'currentclass', 'currentclass': 'currentclass', 'admissiontoclass': 'currentclass', 'section': 'currentsection', 'currentsection': 'currentsection',
    'academicyear': 'academicyear', 'admissiondate': 'admissiondate',
    'fathername': 'fathername', 'mothername': 'mothername', 'guardianname': 'guardianname',
    'fatherphone': 'fatherphone', 'motherphone': 'motherphone', 'fatheremail': 'fatheremail', 'motheremail': 'motheremail',
    'caste': 'caste', 'category': 'category', 'disability': 'disability', 'isrtcandidate': 'isrtcandidate',
    'previousschool': 'previousschoolname', 'previousschoolname': 'previousschoolname',
    'transportmode': 'transportmode', 'busroute': 'busroute', 'pickuppoint': 'pickuppoint',
    'feecategory': 'feecategory', 'concessiontype': 'concessiontype', 'concessionpercentage': 'concessionpercentage',
    'medicalconditions': 'medicalconditions', 'allergies': 'allergies', 'specialneeds': 'specialneeds',
    'previousboard': 'previousboard', 'lastclass': 'lastclass', 'tcnumber': 'tcnumber',
    'tcno': 'tcnumber', 'tc': 'tcnumber',
    'enrollmentno': 'admissionnumber', 'enrollmentnumber': 'admissionnumber',
    'studentcastecertificateno': 'studentcastecertno', 'studentcastecertno': 'studentcastecertno', 'studentcastecertificate': 'studentcastecertno',
    'userid': 'studentid', 'user id': 'studentid', 'userId': 'studentid',
    'cityvillagetown': 'permanentcity', 'schooladmissiondate': 'admissiondate', 'bankifsccode': 'bankifsc', 'isrtecandidate': 'isrtcandidate',
    'phonenumber': 'primaryphone', // Added for robustness
};

function normalizeNumericValue(val) {
  if (val === undefined || val === null) return '';
  let str = String(val).trim();
  if (!str) return '';
  return str.replace(/\D/g, '');
}

function validateStudentRowRobust(normalizedRow, rowNumber) {
  const errors = [];
  const requiredKeys = [
    'firstname', 'lastname', 'email', 'primaryphone', 'dateofbirth', 'gender',
    'currentclass', 'currentsection', 'admissionnumber', 'tcnumber',
    'studentcastecertno', 'admissiondate',
    'bankname', 'bankaccountno', 'bankifsc', 'nationality',
    'permanentstreet', 'permanentcity', 'permanentpincode'
  ];

  requiredKeys.forEach(key => {
    if (!normalizedRow.hasOwnProperty(key) || normalizedRow[key] === undefined || normalizedRow[key] === null || String(normalizedRow[key]).trim() === '') {
      errors.push({ row: rowNumber, error: `is required`, field: key });
    }
  });

  if (normalizedRow['email'] && !/\S+@\S+\.\S+/.test(normalizedRow['email'])) { errors.push({ row: rowNumber, error: `Invalid format`, field: 'email' }); }
  const pincode = normalizeNumericValue(normalizedRow['permanentpincode']);
  if (pincode && pincode.length !== 6) { errors.push({ row: rowNumber, error: `Invalid format (must be 6 digits)`, field: 'permanentpincode' }); }
  const gender = normalizedRow['gender']?.toLowerCase();
  if (gender && !['male', 'female', 'other'].includes(gender)) { errors.push({ row: rowNumber, error: `Invalid value`, field: 'gender' }); }
  const phone = normalizeNumericValue(normalizedRow['primaryphone']);
  if (phone && (phone.length < 7 || phone.length > 15)) { errors.push({ row: rowNumber, error: `Invalid length`, field: 'primaryphone' }); }
  return errors;
}

const csvFilePath = 'D:\\ssinphinite\\ERP Latest\\GOODSYNC\\karnataka_students.csv';
const fileContentBuf = fs.readFileSync(csvFilePath);

const records = csv.parse(fileContentBuf, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true
});

console.log(`Total records: ${records.length}`);
if (records.length > 0) {
    console.log('First record original keys:', Object.keys(records[0]));
    for (const key in records[0]) {
        const normalizedKey = key.toLowerCase()
            .replace('*', '')
            .split(' (')[0]
            .replace(/[^\w]/gi, '')
            .trim();
        const internalKey = headerMappings[normalizedKey];
        console.log(`Header: [${key}] -> Normalized: [${normalizedKey}] -> Internal: [${internalKey}]`);
    }
}

let allErrors = [];
let rowNumber = 1;

for (const record of records) {
    rowNumber++;
    const normalizedRecord = {};
    for (const key in record) {
        const normalizedKey = key.toLowerCase()
            .replace('*', '')
            .split(' (')[0]
            .replace(/[^\w]/gi, '')
            .trim();
        const internalKey = headerMappings[normalizedKey];
        if (internalKey) {
            normalizedRecord[internalKey] = record[key];
        }
    }

    const errors = validateStudentRowRobust(normalizedRecord, rowNumber);
    if (errors.length > 0) {
        allErrors.push(...errors);
    }
}

if (allErrors.length > 0) {
    console.log('Validation Errors Found:');
    console.log(allErrors.slice(0, 10));
} else {
    console.log('No validation errors found.');
}
