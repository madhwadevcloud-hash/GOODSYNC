// backend/utils/s3Uploader.js
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure S3 Client using dynamically injected env variables
const getS3Client = () => {
  const region = process.env.AWS_REGION || 'us-east-1';
  
  // In production, IAM Roles are preferred (no static keys needed). 
  // For local development, fallback to process.env keys.
  const config = { region };
  
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  return new S3Client(config);
};

/**
 * Uploads a file buffer directly to Amazon S3.
 * Compatible with multer.memoryStorage()
 * 
 * @param {Object} file - The file object from multer (req.file)
 * @param {string} folder - Destination folder name inside S3 bucket (e.g. 'assignments', 'profiles')
 * @returns {Promise<Object>} - Contains the S3 file URL and storage key
 */
const uploadToS3 = async (file, folder = 'uploads') => {
  if (!file) throw new Error('No file provided for S3 upload.');
  
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('❌ Missing AWS_S3_BUCKET_NAME in environment configuration.');
  }

  const s3 = getS3Client();
  const fileExtension = path.extname(file.originalname);
  const uniqueFileName = `${folder}/${uuidv4()}${fileExtension}`;

  const uploadParams = {
    Bucket: bucketName,
    Key: uniqueFileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    const command = new PutObjectCommand(uploadParams);
    await s3.send(command);

    // Formulate the public (or CDN/CloudFront) URL for S3
    const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${uniqueFileName}`;
    
    return {
      url: fileUrl,
      key: uniqueFileName,
    };
  } catch (error) {
    console.error('❌ Amazon S3 Upload Error:', error);
    throw new Error(`S3 upload failed: ${error.message}`);
  }
};

/**
 * Deletes an object from the S3 bucket using its key.
 * 
 * @param {string} key - The S3 object key (e.g., 'assignments/some-uuid.pdf')
 * @returns {Promise<boolean>}
 */
const deleteFromS3 = async (key) => {
  if (!key) return false;

  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('❌ Missing AWS_S3_BUCKET_NAME in environment configuration.');
  }

  const s3 = getS3Client();

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    await s3.send(command);
    return true;
  } catch (error) {
    console.error(`❌ Amazon S3 Deletion Error for key ${key}:`, error);
    return false;
  }
};

module.exports = {
  uploadToS3,
  deleteFromS3
};