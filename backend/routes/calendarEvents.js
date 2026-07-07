const express = require('express');
const router = express.Router();
const {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  importHolidays
} = require('../controllers/calendarEventController');

// All routes require authentication in this app, usually handled by server.js mounting
router.route('/import-holidays')
  .post(importHolidays);

router.route('/')
  .get(getEvents)
  .post(createEvent);

router.route('/:id')
  .put(updateEvent)
  .delete(deleteEvent);

module.exports = router;
