const fs = require('fs').promises;
const path = require('path');

/**
 * Clean up old ID card files from the generated-idcards directory
 * Deletes files older than the specified age (default: 1 hour)
 */
async function cleanupOldIDCards(maxAgeMinutes = 60) {
  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'generated-idcards');
    
    // Check if directory exists
    try {
      await fs.access(uploadsDir);
    } catch (err) {
      console.log('📁 Generated ID cards directory does not exist, skipping cleanup');
      return { deleted: 0, errors: 0 };
    }

    const files = await fs.readdir(uploadsDir);
    const now = Date.now();
    const maxAge = maxAgeMinutes * 60 * 1000; // Convert to milliseconds
    
    let deletedCount = 0;
    let errorCount = 0;

    console.log(`🧹 Starting cleanup of ID cards older than ${maxAgeMinutes} minutes...`);
    console.log(`📂 Found ${files.length} files in generated-idcards directory`);

    for (const file of files) {
      try {
        const filePath = path.join(uploadsDir, file);
        const stats = await fs.stat(filePath);
        
        // Check if file is older than maxAge
        const fileAge = now - stats.mtimeMs;
        
        if (fileAge > maxAge) {
          await fs.unlink(filePath);
          deletedCount++;
          console.log(`🗑️ Deleted old file: ${file} (age: ${Math.round(fileAge / 60000)} minutes)`);
        }
      } catch (err) {
        errorCount++;
        console.warn(`⚠️ Error processing file ${file}:`, err.message);
      }
    }

    console.log(`✅ Cleanup complete: ${deletedCount} files deleted, ${errorCount} errors`);
    
    return {
      deleted: deletedCount,
      errors: errorCount,
      total: files.length
    };
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    return {
      deleted: 0,
      errors: 1,
      total: 0,
      error: error.message
    };
  }
}

/**
 * Clean up all files in the generated-idcards directory
 */
async function cleanupAllIDCards() {
  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'generated-idcards');
    
    // Check if directory exists
    try {
      await fs.access(uploadsDir);
    } catch (err) {
      console.log('📁 Generated ID cards directory does not exist');
      return { deleted: 0, errors: 0 };
    }

    const files = await fs.readdir(uploadsDir);
    let deletedCount = 0;
    let errorCount = 0;

    console.log(`🧹 Cleaning up all ${files.length} files in generated-idcards directory...`);

    for (const file of files) {
      try {
        const filePath = path.join(uploadsDir, file);
        await fs.unlink(filePath);
        deletedCount++;
      } catch (err) {
        errorCount++;
        console.warn(`⚠️ Error deleting file ${file}:`, err.message);
      }
    }

    console.log(`✅ Cleanup complete: ${deletedCount} files deleted, ${errorCount} errors`);
    
    return {
      deleted: deletedCount,
      errors: errorCount,
      total: files.length
    };
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    return {
      deleted: 0,
      errors: 1,
      total: 0,
      error: error.message
    };
  }
}

module.exports = {
  cleanupOldIDCards,
  cleanupAllIDCards
};
