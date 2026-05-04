#!/usr/bin/env node

// Test script to verify security fixes
console.log('🔒 Testing Security Fixes...\n');

// Test 1: JWT Secret Requirement
console.log('1. Testing JWT Secret Requirement...');
delete process.env.JWT_SECRET;

try {
  // This should fail to start without JWT_SECRET
  require('./server.js');
  console.log('❌ FAIL: Server started without JWT_SECRET');
} catch (error) {
  if (error.message.includes('JWT_SECRET')) {
    console.log('✅ PASS: Server correctly requires JWT_SECRET');
  } else {
    console.log('❌ FAIL: Unexpected error:', error.message);
  }
}

// Test 2: NODE_ENV Validation
console.log('\n2. Testing NODE_ENV Validation...');
process.env.NODE_ENV = 'invalid';
require('dotenv').config();

// This should default to development
if (process.env.NODE_ENV === 'development') {
  console.log('✅ PASS: Invalid NODE_ENV defaults to development');
} else {
  console.log('❌ FAIL: NODE_ENV validation not working');
}

// Test 3: Demo Credentials Endpoint
console.log('\n3. Testing Demo Credentials Endpoint...');
const { getDemoCredentials } = require('./controllers/authController');

// Mock request/response
const mockReq = {};
const mockRes = {
  status: (code) => ({
    json: (data) => {
      if (code === 404 && data.message === 'Endpoint not available') {
        console.log('✅ PASS: Demo credentials endpoint disabled');
      } else {
        console.log('❌ FAIL: Demo credentials endpoint still active');
      }
    }
  })
};

getDemoCredentials(mockReq, mockRes);

console.log('\n🔒 Security Tests Complete!');
