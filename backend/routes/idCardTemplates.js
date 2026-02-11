const express = require('express');
const router = express.Router();

// --- HOSTING FIX: Remove local multer, fs, and path ---
// Import controller functions
const {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  setDefaultTemplate
} = require('../controllers/idCardTemplateController');

// Import in-memory controllers (no file storage)
const {
  previewIDCard,
  previewIDCardBase64,
  generateIDCards,
  generateAndDownloadIDCards: downloadIDCards,
  generateBulkPreview
} = require('../controllers/idCardGenerationController');

const { auth } = require('../middleware/auth');
const { setSchoolContext } = require('../middleware/schoolContext');

// --- HOSTING FIX: Wrap in a function to accept 'upload' from server.js ---
module.exports = (upload) => {
  // Apply authentication and school context middleware
  router.use(auth);
  router.use(setSchoolContext);

  // ID Card Generation Routes (In-Memory - No file storage)
  router.post('/generate', generateIDCards);
  router.post('/download', downloadIDCards);
  router.get('/preview', previewIDCard);
  router.get('/preview-base64', previewIDCardBase64);
  router.post('/bulk-preview', generateBulkPreview);

  // Get all templates for the school
  router.get('/', getTemplates);

  // Get a specific template
  router.get('/:templateId', getTemplate);

  // --- HOSTING FIX: Use the injected 'upload.single()' middleware ---
  // Create a new template
  router.post('/', upload.single('templateImage'), createTemplate);

  // Update a template
  // Added upload middleware, as this route will also need to handle image changes
  router.put('/:templateId', upload.single('templateImage'), updateTemplate);
  // --- END FIX ---

  // Delete a template (soft delete)
  router.delete('/:templateId', deleteTemplate);

  // Set default template
  router.post('/:templateId/set-default', setDefaultTemplate);

  return router;
};

