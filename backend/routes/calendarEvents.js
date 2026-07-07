const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  importHolidays
} = require('../controllers/calendarEventController');

// All calendar routes require an authenticated user so that req.user
// (id/role) is available to the controller for ownership checks.
router.use(auth);

router.route('/import-holidays')
  .post(importHolidays);

router.route('/')
  .get(getEvents)
  .post(createEvent);

router.route('/:id')
  .put(updateEvent)
  .delete(deleteEvent);

module.exports = router;