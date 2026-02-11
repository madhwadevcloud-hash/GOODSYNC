const IDCardTemplate = require('../models/IDCardTemplate');
const sharp = require('sharp');

// --- HOSTING FIX: Import Cloudinary helpers ---
const {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
  extractPublicId
} = require('../config/cloudinary');

// --- HOSTING FIX: All local 'multer', 'fs', and 'path' logic has been removed ---

// Get all templates for a school
const getTemplates = async (req, res) => {
  try {
    const { schoolId } = req.user;
    const { orientation, side } = req.query;

    let query = { schoolId, isActive: true };
    if (orientation) query.orientation = orientation;
    if (side) query.side = side;

    const templates = await IDCardTemplate.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching templates',
      error: error.message
    });
  }
};

// Get a single template
const getTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { schoolId } = req.user;

    const template = await IDCardTemplate.findOne({
      _id: templateId,
      schoolId,
      isActive: true
    }).populate('createdBy', 'name email');

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching template',
      error: error.message
    });
  }
};

// Create a new template
const createTemplate = async (req, res) => {
  try {
    const { schoolId, _id: userId, schoolCode } = req.user;
    const {
      name,
      description,
      orientation,
      side,
      dataFields,
      photoPlacement,
      schoolLogoPlacement
    } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Template image is required'
      });
    }

    // --- HOSTING FIX: Process image in memory and upload to Cloudinary ---
    const folder = `id_card_templates/${schoolCode.toUpperCase()}`;
    const publicId = `${name.replace(/\s+/g, '_')}_${side}_${Date.now()}`;
    let imageBuffer;

    try {
      // Optimize image from buffer (using req.file.buffer from memory)
      imageBuffer = await sharp(req.file.buffer)
        .resize(1200, 800, { fit: 'inside', withoutEnlargement: true })
        .png({ quality: 90 })
        .toBuffer();
    } catch (imageError) {
      console.error('Image processing error:', imageError);
      // Fallback to original buffer if sharp fails
      imageBuffer = req.file.buffer;
    }

    // Upload optimized buffer to Cloudinary
    const uploadResult = await uploadBufferToCloudinary(imageBuffer, folder, publicId);
    // --- END FIX ---

    const template = new IDCardTemplate({
      schoolId,
      name,
      description,
      orientation,
      side,
      templateImage: uploadResult.secure_url, // <-- Save Cloudinary URL
      dataFields: dataFields || {},
      photoPlacement: photoPlacement || {},
      schoolLogoPlacement: schoolLogoPlacement || {},
      createdBy: userId
    });

    await template.save();

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: template
    });
  } catch (error) {
    console.error('Error creating template:', error);
    // --- HOSTING FIX: Clean up req.file if it exists on error ---
    if (req.file) {
      // This is just good practice, though not strictly needed with memoryStorage
      console.warn('Cleaning up failed upload from memory.');
    }
    res.status(500).json({
      success: false,
      message: 'Error creating template',
      error: error.message
    });
  }
};

// Update template
const updateTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { schoolId, _id: userId } = req.user;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.schoolId;
    delete updateData.createdBy;
    delete updateData.createdAt;

    // --- HOSTING FIX: ---
    // This function, as you wrote it, does not handle file uploads.
    // If you add a file upload to your "Update" feature in the future,
    // you must copy the upload logic from 'createTemplate' here
    // and also delete the old image from Cloudinary.
    // --- END FIX ---

    const template = await IDCardTemplate.findOneAndUpdate(
      { _id: templateId, schoolId },
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: template
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating template',
      error: error.message
    });
  }
};

// Delete template
const deleteTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { schoolId } = req.user;

    const template = await IDCardTemplate.findOneAndUpdate(
      { _id: templateId, schoolId },
      { isActive: false },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // --- HOSTING FIX: Delete the template image from Cloudinary ---
    if (template.templateImage) {
      const publicId = extractPublicId(template.templateImage);
      if (publicId) {
        await deleteFromCloudinary(publicId);
        console.log(`Deleted template image from Cloudinary: ${publicId}`);
      }
    }
    // --- END FIX ---

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting template',
      error: error.message
    });
  }
};

// Set default template
const setDefaultTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { schoolId } = req.user;
    const { orientation, side } = req.body;

    // Remove default status from other templates of same orientation/side
    await IDCardTemplate.updateMany(
      { schoolId, orientation, side },
      { isDefault: false }
    );

    // Set new default
    const template = await IDCardTemplate.findOneAndUpdate(
      { _id: templateId, schoolId },
      { isDefault: true },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      message: 'Default template set successfully',
      data: template
    });
  } catch (error) {
    console.error('Error setting default template:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting default template',
      error: error.message
    });
  }
};

module.exports = {
  // --- HOSTING FIX: 'uploadTemplate' is no longer exported ---
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  setDefaultTemplate
};