const CalendarEvent = require('../models/CalendarEvent');

// @desc    Get all calendar events for a school and academic year
// @route   GET /api/calendar-events
// @access  Private
exports.getEvents = async (req, res) => {
  try {
    const schoolCode = req.schoolCode || req.headers['x-school-code'];
    const { academicYear } = req.query;

    if (!schoolCode) {
      return res.status(400).json({ success: false, message: 'School code is required' });
    }

    if (!academicYear) {
      return res.status(400).json({ success: false, message: 'Academic year is required' });
    }

    const events = await CalendarEvent.find({
      schoolCode: schoolCode.toUpperCase(),
      academicYear
    }).sort({ date: 1 });

    res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Create a new calendar event
// @route   POST /api/calendar-events
// @access  Private (Admin/SuperAdmin)
exports.createEvent = async (req, res) => {
  try {
    const schoolCode = req.schoolCode || req.headers['x-school-code'];
    const { academicYear, title, date, type, time, location, description } = req.body;

    if (!schoolCode) {
      return res.status(400).json({ success: false, message: 'School code is required' });
    }

    if (!academicYear || !title || !date) {
      return res.status(400).json({ success: false, message: 'Academic year, title, and date are required' });
    }

    const newEvent = await CalendarEvent.create({
      schoolCode: schoolCode.toUpperCase(),
      academicYear,
      title,
      date,
      type: type || 'other',
      time,
      location,
      description,
      createdBy: req.user ? req.user.id : undefined
    });

    res.status(201).json({
      success: true,
      data: newEvent
    });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Update a calendar event
// @route   PUT /api/calendar-events/:id
// @access  Private (Admin/SuperAdmin)
exports.updateEvent = async (req, res) => {
  try {
    const schoolCode = req.schoolCode || req.headers['x-school-code'];
    
    if (!schoolCode) {
      return res.status(400).json({ success: false, message: 'School code is required' });
    }

    let event = await CalendarEvent.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Ensure the event belongs to the school
    if (event.schoolCode !== schoolCode.toUpperCase()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this event' });
    }

    event = await CalendarEvent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Error updating calendar event:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Delete a calendar event
// @route   DELETE /api/calendar-events/:id
// @access  Private (Admin/SuperAdmin)
exports.deleteEvent = async (req, res) => {
  try {
    const schoolCode = req.schoolCode || req.headers['x-school-code'];
    
    if (!schoolCode) {
      return res.status(400).json({ success: false, message: 'School code is required' });
    }

    const event = await CalendarEvent.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Ensure the event belongs to the school
    if (event.schoolCode !== schoolCode.toUpperCase()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this event' });
    }

    await event.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Import standard public holidays for an academic year
// @route   POST /api/calendar-events/import-holidays
// @access  Private (Admin/SuperAdmin)
exports.importHolidays = async (req, res) => {
  try {
    const schoolCode = req.schoolCode || req.headers['x-school-code'];
    const { academicYear } = req.body;

    if (!schoolCode || !academicYear) {
      return res.status(400).json({ success: false, message: 'School code and academic year are required' });
    }

    // Extract the starting year from academicYear (e.g., "2026-27" -> 2026)
    const startYear = parseInt(academicYear.substring(0, 4), 10);
    const endYear = startYear + 1;

    // Standard fixed holidays
    const standardHolidays = [
      { title: 'New Year Day', date: new Date(`${startYear}-01-01T00:00:00.000Z`) },
      { title: 'Republic Day', date: new Date(`${startYear}-01-26T00:00:00.000Z`) },
      { title: 'Labor Day', date: new Date(`${startYear}-05-01T00:00:00.000Z`) },
      { title: 'Independence Day', date: new Date(`${startYear}-08-15T00:00:00.000Z`) },
      { title: 'Gandhi Jayanti', date: new Date(`${startYear}-10-02T00:00:00.000Z`) },
      { title: 'Christmas Day', date: new Date(`${startYear}-12-25T00:00:00.000Z`) },
      
      // Some generic placeholders for lunar/variable festivals (dates are approximate for generic purposes, user can edit)
      { title: 'Maha Shivaratri', date: new Date(`${startYear}-02-15T00:00:00.000Z`), description: 'Approximate date' },
      { title: 'Holi', date: new Date(`${startYear}-03-15T00:00:00.000Z`), description: 'Approximate date' },
      { title: 'Eid al-Fitr', date: new Date(`${startYear}-04-10T00:00:00.000Z`), description: 'Approximate date' },
      { title: 'Dussehra', date: new Date(`${startYear}-10-15T00:00:00.000Z`), description: 'Approximate date' },
      { title: 'Diwali', date: new Date(`${startYear}-11-05T00:00:00.000Z`), description: 'Approximate date' }
    ];

    let importedCount = 0;

    for (const holiday of standardHolidays) {
      // Check if it already exists to avoid duplicates
      const exists = await CalendarEvent.findOne({
        schoolCode: schoolCode.toUpperCase(),
        academicYear,
        title: holiday.title,
        type: 'holiday'
      });

      if (!exists) {
        await CalendarEvent.create({
          schoolCode: schoolCode.toUpperCase(),
          academicYear,
          title: holiday.title,
          date: holiday.date,
          type: 'holiday',
          description: holiday.description || 'Public Holiday',
          createdBy: req.user ? req.user.id : undefined
        });
        importedCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Successfully imported ${importedCount} holidays`,
      importedCount
    });
  } catch (error) {
    console.error('Error importing holidays:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};