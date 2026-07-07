const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
  schoolCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    index: true
  },
  academicYear: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['holiday', 'exam', 'meeting', 'other'],
    default: 'other'
  },
  time: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index for fast queries by school, year, and date
calendarEventSchema.index({ schoolCode: 1, academicYear: 1, date: 1 });

const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);

module.exports = CalendarEvent;