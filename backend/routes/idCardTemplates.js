// backend/routes/idCardTemplates.js
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
const { uploadToS3 } = require('../utils/s3Uploader'); // <-- Import S3 uploader

/**
 * ADAPTER MIDDLEWARE: Handles a single file upload in memory (via Multer),
 * uploads it to Amazon S3, and adapts the req.file object for downstream controllers.
 */
const handleSingleS3Upload = (folderName) => async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    console.log(`📡 Uploading template image (${req.file.originalname}) to S3 folder: "${folderName}"`);
    
    // Upload to S3
    const s3Result = await uploadToS3(req.file, folderName);

    // Overwrite req.file properties so controllers read S3 metadata seamlessly
    req.file = {
      ...req.file,
      path: s3Result.url,       // Overwrite local disk path with the S3 URL
      filename: s3Result.key,   // Overwrite filename with S3 unique Key
      location: s3Result.url    // Fallback property
    };

    console.log('✅ S3 template image upload complete. req.file adapted.');
    next();
  } catch (error) {
    console.error('❌ S3 Single Upload Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Failed to upload file to storage: ${error.message}` 
    });
  }
};

// --- HOSTING FIX: Wrap in a function to accept 'upload' from server.js ---
module.exports = (upload) => {
  // Apply authentication and school context middleware
  router.use(auth);
  router.use(setSchoolContext);

  // ID Card Generation Routes (In-Memory - No file storage)
  router.post('/generate', generateIDCards);
  router.post('/download', downloadIDCards);
  router.get('/preview', previewIDCard);
  router.post('/preview', previewIDCard);
  router.get('/preview-base64', previewIDCardBase64);
  router.post('/bulk-preview', generateBulkPreview);

  // Get all templates for the school
  router.get('/', getTemplates);

  // Get a specific template
  router.get('/:templateId', getTemplate);

  // --- HOSTING FIX: Use memory upload + S3 adapter middleware ---
  // Create a new template
  router.post('/', 
    upload.single('templateImage'),            // 1. Parse image in memory
    handleSingleS3Upload('id-card-templates'),  // 2. Upload to S3 & mock req.file
    createTemplate                             // 3. Controller runs completely unmodified!
  );

  // Update a template
  router.put('/:templateId', 
    upload.single('templateImage'), 
    handleSingleS3Upload('id-card-templates'), 
    updateTemplate
  );
  // --- END FIX ---

  // Delete a template (soft delete)
  router.delete('/:templateId', deleteTemplate);

  // Set default template
  router.post('/:templateId/set-default', setDefaultTemplate);

  return router;
};