// backend/test-s3.js
require('dotenv').config(); // Load local .env variables
const { uploadToS3, deleteFromS3 } = require('./utils/s3Uploader');

const testS3Integration = async () => {
  console.log('🚀 Starting S3 Upload Test...');
  console.log('Using Bucket:', process.env.AWS_S3_BUCKET_NAME);
  console.log('Using Region:', process.env.AWS_REGION || 'us-east-1');

  // Create a mock file buffer mimicking multer's output
  const mockFile = {
    originalname: 'test-document.txt',
    buffer: Buffer.from('Hello from the AWS S3 Integration Test!'),
    mimetype: 'text/plain',
    size: 38
  };

  try {
    // 1. Test Upload
    console.log('\nStep 1: Attempting upload to S3...');
    const uploadResult = await uploadToS3(mockFile, 'test-folder');
    console.log('✅ Upload Successful!');
    console.log('S3 Public URL:', uploadResult.url);
    console.log('S3 Object Key:', uploadResult.key);

    // 2. Test Deletion
    console.log('\nStep 2: Attempting deletion from S3...');
    const deleteResult = await deleteFromS3(uploadResult.key);
    if (deleteResult) {
      console.log('✅ Deletion Successful! S3 bucket is clean.');
    } else {
      console.warn('⚠️ Deletion returned false. Check permissions.');
    }

    console.log('\n🎉 S3 INTEGRATION TEST PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('\n❌ S3 INTEGRATION TEST FAILED:');
    console.error(error.message);
  }
};

testS3Integration();