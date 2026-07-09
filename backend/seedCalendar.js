require('dotenv').config();
const mongoose = require('mongoose');
const CalendarEvent = require('./models/CalendarEvent');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ERP:ERP@consultancy.baiim7n.mongodb.net/?appName=consultancy';

const events = [
  { title: 'School Reopens', date: '2024-06-01', type: 'other', description: 'Start of the new academic year 2024-2025', time: '08:00 AM' },
  { title: 'Parent-Teacher Meeting', date: '2024-06-15', type: 'meeting', description: 'First PTM of the year', time: '10:00 AM' },
  { title: 'Mid-Term Examinations', date: '2024-09-10', type: 'exam', description: 'Term 1 examinations begin', time: '09:00 AM' },
  { title: 'Diwali Holidays', date: '2024-10-31', type: 'holiday', description: 'School closed for Diwali festival' },
  { title: 'Annual Sports Day', date: '2024-11-20', type: 'other', description: 'Inter-house sports competitions', time: '08:30 AM' },
  { title: 'Christmas Vacation', date: '2024-12-24', type: 'holiday', description: 'Winter break begins' },
  { title: 'School Reopens (Term 2)', date: '2025-01-03', type: 'other', description: 'School reopens after winter break' },
  { title: 'Republic Day Celebration', date: '2025-01-26', type: 'other', description: 'Flag hoisting ceremony', time: '08:00 AM' },
  { title: 'Final Examinations', date: '2025-03-15', type: 'exam', description: 'End of year examinations begin', time: '09:00 AM' },
  { title: 'Result Declaration', date: '2025-04-10', type: 'other', description: 'Final report cards distribution', time: '10:00 AM' },
  { title: 'Summer Vacation Begins', date: '2025-04-15', type: 'holiday', description: 'Start of summer break' },
  { title: 'Independence Day', date: '2024-08-15', type: 'holiday', description: 'Flag hoisting and cultural programs', time: '08:00 AM' },
  { title: 'Teacher\'s Day', date: '2024-09-05', type: 'other', description: 'Special assembly by students', time: '09:00 AM' },
  { title: 'Science Exhibition', date: '2024-10-15', type: 'other', description: 'Annual science fair in the main auditorium', time: '10:00 AM' },
  { title: 'Pre-Board Exams (Class X & XII)', date: '2025-02-01', type: 'exam', description: 'Mock board examinations begin', time: '09:00 AM' }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const schoolCode = 'CCHS';
    const academicYear = '2024-2025';

    console.log(`Clearing existing dummy events for ${schoolCode} (${academicYear})...`);
    await CalendarEvent.deleteMany({ schoolCode, academicYear });

    console.log('Inserting new events...');
    const eventsToInsert = events.map(e => ({
      ...e,
      schoolCode,
      academicYear,
      date: new Date(e.date)
    }));

    await CalendarEvent.insertMany(eventsToInsert);
    console.log(`✅ Successfully inserted ${eventsToInsert.length} calendar events!`);
    
    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
}

seed();
