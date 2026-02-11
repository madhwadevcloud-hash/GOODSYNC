require('dotenv').config();
const mongoose = require('mongoose');
const UserGenerator = require('../utils/userGenerator');
const SchoolDatabaseManager = require('../utils/databaseManager');

// Sample data for generating realistic student names
const firstNames = {
  male: [
    'Aarav', 'Arjun', 'Aditya', 'Anish', 'Akash', 'Arnav', 'Aman', 'Ayaan', 'Atharv', 'Abhay',
    'Harsh', 'Ishaan', 'Karan', 'Krishna', 'Laksh', 'Manish', 'Nikhil', 'Om', 'Pranav', 'Raj',
    'Rohan', 'Sahil', 'Shaan', 'Tanish', 'Utkarsh', 'Vedant', 'Vihaan', 'Yash', 'Zain', 'Dev'
  ],
  female: [
    'Aadhya', 'Ananya', 'Aisha', 'Aria', 'Avni', 'Diya', 'Ira', 'Kavya', 'Kiara', 'Mira',
    'Nisha', 'Priya', 'Rhea', 'Saanvi', 'Sara', 'Tara', 'Veda', 'Zara', 'Ishita', 'Meera',
    'Pooja', 'Riya', 'Shreya', 'Siya', 'Sneha', 'Suhana', 'Tanvi', 'Urvi', 'Vaanya', 'Yara'
  ]
};

const lastNames = [
  'Sharma', 'Patel', 'Singh', 'Kumar', 'Gupta', 'Agarwal', 'Reddy', 'Nair', 'Iyer', 'Joshi',
  'Mehta', 'Shah', 'Rao', 'Chopra', 'Malhotra', 'Bansal', 'Arora', 'Saxena', 'Verma', 'Bhatia',
  'Khanna mehta', 'Jain', 'Sinha', 'Mishra', 'Pandey', 'Tiwari', 'Dubey', 'Thakur', 'Chauhan', 'Yadav'
];

// Subject mappings for different classes
const subjectsByClass = {
  'LKG': ['English', 'Hindi', 'Mathematics', 'Environmental Studies', 'Art & Craft', 'Physical Education'],
  'UKG': ['English', 'Hindi', 'Mathematics', 'Environmental Studies', 'Art & Craft', 'Physical Education'],
  '1': ['English', 'Hindi', 'Mathematics', 'Environmental Studies', 'Art & Craft', 'Physical Education'],
  '2': ['English', 'Hindi', 'Mathematics', 'Environmental Studies', 'Art & Craft', 'Physical Education'],
  '3': ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies', 'Art & Craft', 'Physical Education'],
  '4': ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies', 'Art & Craft', 'Physical Education'],
  '5': ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies', 'Computer Science', 'Physical Education'],
  '6': ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies', 'Computer Science', 'Physical Education'],
  '7': ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies', 'Computer Science', 'Physical Education'],
  '8': ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies', 'Computer Science', 'Physical Education'],
  '9': ['English', 'Hindi', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Social Studies', 'Computer Science', 'Physical Education'],
  '10': ['English', 'Hindi', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Social Studies', 'Computer Science', 'Physical Education'],
  '11': ['English', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'Computer Science', 'Physical Education', 'Economics'],
  '12': ['English', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'Computer Science', 'Physical Education', 'Economics']
};

// Teacher subjects specialization
const teacherSubjects = [
  'English', 'Hindi', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 
  'Social Studies', 'Computer Science', 'Physical Education', 'Art & Craft',
  'Environmental Studies', 'Economics', 'Science'
];

// Generate random Indian phone number
const generatePhoneNumber = () => {
  const prefixes = ['98', '99', '97', '96', '95', '94', '93', '92', '91', '90'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const remaining = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return `${prefix}${remaining}`;
};

// Generate random email
const generateEmail = (firstName, lastName, role, classNum = '', section = '') => {
  const domain = '@example.com';
  if (role === 'student') {
    return `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${classNum}${section.toLowerCase()}${domain}`;
  } else {
    return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${domain}`;
  }
};

// Generate student data
const generateStudentData = (classNum, section, studentNumber) => {
  const gender = Math.random() > 0.5 ? 'male' : 'female';
  const firstName = firstNames[gender][Math.floor(Math.random() * firstNames[gender].length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const name = `${firstName} ${lastName}`;
  
  // Calculate age based on class
  let ageYears = 3; // Default for LKG
  if (classNum === 'UKG') ageYears = 4;
  else if (classNum !== 'LKG' && classNum !== 'UKG') {
    ageYears = parseInt(classNum) + 5; // Class 1 = 6 years, Class 2 = 7 years, etc.
  }
  
  const birthYear = new Date().getFullYear() - ageYears;
  const birthMonth = Math.floor(Math.random() * 12);
  const birthDay = Math.floor(Math.random() * 28) + 1;
  
  return {
    name: name,
    email: generateEmail(firstName, lastName, 'student', classNum, section),
    role: 'student',
    class: classNum,
    section: section,
    
    // Personal Information
    firstName: firstName,
    lastName: lastName,
    dateOfBirth: new Date(birthYear, birthMonth, birthDay).toISOString().split('T')[0],
    gender: gender,
    ageYears: ageYears,
    ageMonths: Math.floor(Math.random() * 12),
    nationality: 'Indian',
    
    // Student specific fields
    studentNameKannada: `${firstName} ${lastName}`, // Simplified for demo
    bloodGroup: ['A+', 'B+', 'AB+', 'O+', 'A-', 'B-', 'AB-', 'O-'][Math.floor(Math.random() * 8)],
    religion: ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist'][Math.floor(Math.random() * 6)],
    socialCategory: ['General', 'SC', 'ST', 'OBC'][Math.floor(Math.random() * 4)],
    studentCaste: ['Brahmin', 'Kshatriya', 'Vaishya', 'Shudra', 'SC', 'ST'][Math.floor(Math.random() * 6)],
    motherTongue: ['Hindi', 'Kannada', 'Telugu', 'Tamil', 'Marathi', 'Gujarati'][Math.floor(Math.random() * 6)],
    
    // Family Information
    fatherName: `${firstNames.male[Math.floor(Math.random() * firstNames.male.length)]} ${lastName}`,
    fatherNameKannada: `Father ${lastName}`,
    fatherPhone: generatePhoneNumber(),
    fatherOccupation: ['Business', 'Service', 'Agriculture', 'Professional', 'Daily Wage'][Math.floor(Math.random() * 5)],
    fatherEducation: ['Graduate', 'Post Graduate', '12th Pass', '10th Pass', 'Professional'][Math.floor(Math.random() * 5)],
    
    motherName: `${firstNames.female[Math.floor(Math.random() * firstNames.female.length)]} ${lastName}`,
    motherNameKannada: `Mother ${lastName}`,
    motherPhone: generatePhoneNumber(),
    motherOccupation: ['Housewife', 'Service', 'Business', 'Professional', 'Teacher'][Math.floor(Math.random() * 5)],
    motherEducation: ['Graduate', 'Post Graduate', '12th Pass', '10th Pass', 'Professional'][Math.floor(Math.random() * 5)],
    
    // Banking Information
    bankName: ['SBI', 'HDFC', 'ICICI', 'Axis Bank', 'Canara Bank'][Math.floor(Math.random() * 5)],
    bankAccountNumber: Math.floor(Math.random() * 1000000000000).toString(),
    ifscCode: 'SBIN0001234',
    accountHolderName: name,
    
    // Contact Information
    phone: generatePhoneNumber(),
    address: `House No. ${Math.floor(Math.random() * 999) + 1}, Street ${Math.floor(Math.random() * 50) + 1}, Bangalore`,
    
    // Academic Information
    academicYear: '2024-25',
    admissionDate: new Date(2024, 3, Math.floor(Math.random() * 30) + 1).toISOString().split('T')[0], // April admission
    rollNumber: studentNumber.toString().padStart(2, '0'),
    
    // Other fields
    belongingToBPL: Math.random() > 0.8 ? 'Yes' : 'No',
    disability: 'Not Applicable'
  };
};

// Generate teacher data
const generateTeacherData = (subject, teacherNumber) => {
  const gender = Math.random() > 0.4 ? 'female' : 'male'; // More female teachers
  const firstName = firstNames[gender][Math.floor(Math.random() * firstNames[gender].length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const name = `${firstName} ${lastName}`;
  
  const experience = Math.floor(Math.random() * 15) + 2; // 2-16 years experience
  const ageYears = experience + 25; // Start teaching at 25
  
  return {
    name: name,
    email: generateEmail(firstName, lastName, 'teacher'),
    role: 'teacher',
    
    // Personal Information
    firstName: firstName,
    lastName: lastName,
    dateOfBirth: new Date(new Date().getFullYear() - ageYears, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
    gender: gender,
    nationality: 'Indian',
    
    // Teacher specific fields
    subjects: [subject],
    qualification: ['B.Ed', 'M.Ed', 'B.A B.Ed', 'B.Sc B.Ed', 'M.A', 'M.Sc'][Math.floor(Math.random() * 6)],
    experience: experience,
    designation: experience > 10 ? 'Senior Teacher' : experience > 5 ? 'Teacher' : 'Junior Teacher',
    department: subject === 'Physical Education' ? 'Sports' : subject === 'Art & Craft' ? 'Arts' : 'Academic',
    
    // Contact Information
    phone: generatePhoneNumber(),
    address: `House No. ${Math.floor(Math.random() * 999) + 1}, Teacher Colony, Bangalore`,
    
    // Other fields
    religion: ['Hindu', 'Muslim', 'Christian', 'Sikh'][Math.floor(Math.random() * 4)],
    bloodGroup: ['A+', 'B+', 'AB+', 'O+', 'A-', 'B-', 'AB-', 'O-'][Math.floor(Math.random() * 8)]
  };
};

// Main function to populate database
async function populateDatabase(schoolCode = 'DEMO001') {
  try {
    console.log('🚀 Starting database population...');
    console.log(`School Code: ${schoolCode}`);
    
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }
    
    console.log('🔗 Connecting to MongoDB...');
    console.log(`📍 URI: ${mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // Hide credentials in log
    
    // Connect to MongoDB using the URI from .env
    await mongoose.connect(mongoUri);
    
    // Initialize database manager
    await SchoolDatabaseManager.initialize();
    const connection = await SchoolDatabaseManager.getSchoolConnection(schoolCode);
    console.log('✅ Connected to school database');
    
    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🧹 Clearing existing student and teacher data...');
    await connection.collection('students').deleteMany({});
    await connection.collection('teachers').deleteMany({});
    
    let totalStudents = 0;
    let totalTeachers = 0;
    
    // Define all classes
    const classes = ['LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    const sections = ['A', 'B', 'C', 'D', 'E', 'F'];
    
    console.log('👥 Creating teachers...');
    
    // Create teachers for each subject
    const createdTeachers = [];
    for (const subject of teacherSubjects) {
      console.log(`📚 Creating teacher for ${subject}...`);
      
      const teacherData = generateTeacherData(subject, createdTeachers.length + 1);
      
      try {
        const result = await UserGenerator.createUser(schoolCode, teacherData);
        createdTeachers.push({
          ...result,
          subject: subject,
          name: teacherData.name
        });
        totalTeachers++;
        console.log(`✅ Created teacher: ${teacherData.name} (${subject})`);
      } catch (error) {
        console.error(`❌ Error creating teacher for ${subject}:`, error.message);
      }
    }
    
    console.log(`\n👨‍🏫 Created ${totalTeachers} teachers\n`);
    
    // Create students for each class and section
    console.log('👨‍🎓 Creating students...');
    
    for (const classNum of classes) {
      console.log(`\n📖 Processing Class ${classNum}...`);
      
      for (const section of sections) {
        console.log(`  📝 Creating students for Section ${section}...`);
        
        // Create 12 students per section (more than requested 10)
        for (let studentNum = 1; studentNum <= 12; studentNum++) {
          const studentData = generateStudentData(classNum, section, studentNum);
          
          try {
            const result = await UserGenerator.createUser(schoolCode, studentData);
            totalStudents++;
            
            if (studentNum <= 3) { // Show first 3 students for each section
              console.log(`    ✅ ${studentData.name} (${classNum}-${section})`);
            }
          } catch (error) {
            console.error(`    ❌ Error creating student ${studentData.name}:`, error.message);
          }
        }
        
        console.log(`    📊 Section ${section}: 12 students created`);
      }
      
      console.log(`  📊 Class ${classNum}: ${sections.length * 12} students created`);
    }
    
    console.log('\n🎉 Database population completed!');
    console.log('📊 Summary:');
    console.log(`   👨‍🏫 Teachers: ${totalTeachers}`);
    console.log(`   👨‍🎓 Students: ${totalStudents}`);
    console.log(`   🏫 Classes: ${classes.length} (LKG to 12)`);
    console.log(`   📝 Sections per class: ${sections.length} (A-F)`);
    console.log(`   👥 Students per section: 12`);
    console.log(`   📚 Subjects covered: ${teacherSubjects.length}`);
    
    console.log('\n📋 Class-wise Distribution:');
    classes.forEach(classNum => {
      console.log(`   Class ${classNum}: ${sections.length * 12} students (${sections.length} sections × 12 students)`);
    });
    
    console.log('\n👨‍🏫 Subject Teachers Created:');
    createdTeachers.forEach(teacher => {
      console.log(`   ${teacher.subject}: ${teacher.name}`);
    });
    
    return {
      totalStudents,
      totalTeachers,
      classes: classes.length,
      sections: sections.length,
      studentsPerSection: 12
    };
    
  } catch (error) {
    console.error('❌ Error populating database:', error);
    throw error;
  }
}

// Run the population script
if (require.main === module) {
  // Default school code - change as needed
  const schoolCode = process.argv[2] || 'DEMO001';
  
  populateDatabase(schoolCode)
    .then((summary) => {
      console.log('\n✅ Database population successful!');
      console.log('Summary:', summary);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database population failed:', error);
      process.exit(1);
    });
}

module.exports = { populateDatabase };
