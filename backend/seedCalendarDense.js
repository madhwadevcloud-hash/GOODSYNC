require('dotenv').config();
const mongoose = require('mongoose');
const CalendarEvent = require('./models/CalendarEvent');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ERP:ERP@consultancy.baiim7n.mongodb.net/?appName=consultancy';

// Dense events for July 2026
const denseEvents = [
  // First week
  { title: 'Staff Meeting', date: '2026-07-01', type: 'meeting', time: '09:00 AM' },
  { title: 'Math Weekly Test', date: '2026-07-02', type: 'exam', time: '10:00 AM' },
  { title: 'Science Lab Inspection', date: '2026-07-03', type: 'other', time: '11:00 AM' },
  { title: 'PTA Committee', date: '2026-07-04', type: 'meeting', time: '02:00 PM' },
  { title: 'Sports Practice', date: '2026-07-04', type: 'other', time: '04:00 PM' },
  
  // Second week
  { title: 'Monthly Assessment - Physics', date: '2026-07-06', type: 'exam', time: '09:00 AM' },
  { title: 'Final Exam', date: '2026-07-07', type: 'exam', time: '10:00 AM' },
  { title: 'Board Review Meeting', date: '2026-07-07', type: 'meeting', time: '02:30 PM' },
  { title: 'Guest Lecture', date: '2026-07-08', type: 'other', time: '11:00 AM' },
  { title: 'Cultural Fest Prep', date: '2026-07-08', type: 'other', time: '03:00 PM' },
  { title: 'English Essay Competition', date: '2026-07-09', type: 'other', time: '10:30 AM' },
  { title: 'Principal\'s Address', date: '2026-07-10', type: 'meeting', time: '09:00 AM' },
  { title: 'Half-day for Students', date: '2026-07-11', type: 'holiday' },
  
  // Third week
  { title: 'Term 1 Revision begins', date: '2026-07-13', type: 'other', time: '08:00 AM' },
  { title: 'Chemistry Practical Exam', date: '2026-07-14', type: 'exam', time: '09:00 AM' },
  { title: 'Teacher Training Workshop', date: '2026-07-15', type: 'meeting', time: '10:00 AM' },
  { title: 'Local Holiday', date: '2026-07-16', type: 'holiday' },
  { title: 'Inter-School Debate', date: '2026-07-17', type: 'other', time: '09:30 AM' },
  { title: 'Alumni Meet', date: '2026-07-18', type: 'meeting', time: '05:00 PM' },
  { title: 'Weekend Study Camp', date: '2026-07-18', type: 'other', time: '09:00 AM' },
  
  // Fourth week
  { title: 'Pre-Board Exam 1', date: '2026-07-20', type: 'exam', time: '09:00 AM' },
  { title: 'Department Head Meeting', date: '2026-07-21', type: 'meeting', time: '01:00 PM' },
  { title: 'Pre-Board Exam 2', date: '2026-07-22', type: 'exam', time: '09:00 AM' },
  { title: 'Parent Teacher Meeting', date: '2026-07-24', type: 'meeting', time: '10:00 AM' },
  { title: 'Blood Donation Camp', date: '2026-07-25', type: 'other', time: '09:00 AM' },
  
  // Final week
  { title: 'Pre-Board Exam 3', date: '2026-07-27', type: 'exam', time: '09:00 AM' },
  { title: 'Results Compilation', date: '2026-07-28', type: 'meeting', time: '11:00 AM' },
  { title: 'Science Exhibition', date: '2026-07-29', type: 'other', time: '09:00 AM' },
  { title: 'Annual Picnic', date: '2026-07-30', type: 'holiday' },
  { title: 'Month End Review', date: '2026-07-31', type: 'meeting', time: '03:00 PM' },
  { title: 'Farewell Party Prep', date: '2026-07-31', type: 'other', time: '05:00 PM' }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const schoolCode = 'CCHS';
    
    // We will inject these events for ALL possible academic years they might have selected
    const years = ['2023-2024', '2024-2025', '2025-2026', '2026-2027'];
    
    for (const academicYear of years) {
      console.log(`Inserting dense events for July 2026 into academicYear ${academicYear}...`);
      const eventsToInsert = denseEvents.map(e => ({
        ...e,
        schoolCode,
        academicYear,
        date: new Date(e.date)
      }));

      await CalendarEvent.insertMany(eventsToInsert);
    }
    
    console.log(`✅ Successfully inserted dense calendar events across all possible dropdown years!`);
    
    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
}

seed();
