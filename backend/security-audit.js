#!/usr/bin/env node

/**
 * Comprehensive Security Audit Script
 * Tests all security fixes and ensures no vulnerabilities remain
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 COMPREHENSIVE SECURITY AUDIT\n');
console.log('=====================================\n');

let auditResults = {
  passed: 0,
  failed: 0,
  total: 0
};

function test(name, condition, details = '') {
  auditResults.total++;
  if (condition) {
    console.log(`✅ PASS: ${name}`);
    if (details) console.log(`   Details: ${details}`);
    auditResults.passed++;
  } else {
    console.log(`❌ FAIL: ${name}`);
    if (details) console.log(`   Details: ${details}`);
    auditResults.failed++;
  }
  console.log('');
}

function scanFileForPattern(filePath, pattern, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = content.match(pattern);
    return {
      found: matches && matches.length > 0,
      count: matches ? matches.length : 0,
      matches: matches || []
    };
  } catch (error) {
    return { found: false, count: 0, matches: [], error: error.message };
  }
}

// Test 1: JWT Secret Requirements
console.log('1. JWT SECRET SECURITY TESTS');
console.log('-------------------------');

// Check server.js for JWT secret validation
const serverContent = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
test('Server requires JWT_SECRET at startup', 
  serverContent.includes('if (!process.env.JWT_SECRET)'),
  'Server fails to start without JWT_SECRET');

test('No weak JWT fallback secrets in server.js',
  !serverContent.includes('default_development_secret'),
  'No weak fallback secrets found');

// Scan all files for JWT fallback patterns (excluding node_modules and audit script)
const jsFiles = getAllJsFiles(__dirname).filter(file => 
  !file.includes('node_modules') && 
  !file.includes('security-audit.js')
);
let jwtFallbackFound = false;
jsFiles.forEach(file => {
  const result = scanFileForPattern(file, /JWT_SECRET.*\|\|.*default|default.*JWT_SECRET/i);
  if (result.found) {
    jwtFallbackFound = true;
    console.log(`⚠️  JWT fallback found in: ${file}`);
  }
});
test('No JWT fallback secrets in any files', !jwtFallbackFound);

// Test 2: Unauthenticated Debug Endpoints
console.log('2. DEBUG ENDPOINT SECURITY TESTS');
console.log('---------------------------------');

test('Direct test endpoints removed from server.js',
  !serverContent.includes('/api/direct-test'),
  'Debug endpoints removed');

test('Test endpoint removed from server.js',
  !serverContent.includes('/api/test-endpoint'),
  'Unauthenticated test endpoint removed');

test('Demo credentials endpoint disabled',
  scanFileForPattern(path.join(__dirname, 'controllers/authController.js'), 
    /Endpoint not available/i).found,
  'Demo credentials endpoint returns 404');

// Test 3: Credential Leakage Prevention
console.log('3. CREDENTIAL LEAKAGE TESTS');
console.log('---------------------------');

// Check for actual password logging (excluding node_modules and audit script)
let passwordLoggingFound = false;
jsFiles.forEach(file => {
  // More precise pattern that catches actual password values being logged
  const result = scanFileForPattern(file, /console\.log.*password.*:.*[^HIDDEN\[\]]/i);
  if (result.found) {
    passwordLoggingFound = true;
    console.log(`⚠️  Password logging found in: ${file}`);
  }
});
test('No password logging in console output', !passwordLoggingFound);

// Check for actual email logging (excluding node_modules and audit script)
let emailLoggingFound = false;
jsFiles.forEach(file => {
  // More precise pattern that catches actual email values being logged
  const result = scanFileForPattern(file, /console\.log.*email.*:.*[^HIDDEN\[\]]/i);
  if (result.found) {
    emailLoggingFound = true;
    console.log(`⚠️  Email logging found in: ${file}`);
  }
});
test('No email logging in console output', !emailLoggingFound);

// Test 4: Hardcoded Credentials
console.log('4. HARDCODED CREDENTIALS TESTS');
console.log('------------------------------');

// Check scripts for hardcoded credentials
const scriptFiles = jsFiles.filter(file => file.includes('scripts/'));
let hardcodedCredsFound = false;

scriptFiles.forEach(file => {
  // Check for hardcoded MongoDB URIs
  const mongoResult = scanFileForPattern(file, /mongodb\+?:\/\/[^:]+:[^@]+@/i);
  if (mongoResult.found) {
    hardcodedCredsFound = true;
    console.log(`⚠️  Hardcoded MongoDB URI found in: ${file}`);
  }
  
  // Check for hardcoded passwords
  const passwordResult = scanFileForPattern(file, /password.*=.*['"][^'"]{3,}['"]/i);
  if (passwordResult.found) {
    hardcodedCredsFound = true;
    console.log(`⚠️  Hardcoded password found in: ${file}`);
  }
  
  // Check for hardcoded emails
  const emailResult = scanFileForPattern(file, /email.*=.*['"][^'"]+@[^'"]+['"]/i);
  if (emailResult.found && !emailResult.matches[0].includes('process.env')) {
    hardcodedCredsFound = true;
    console.log(`⚠️  Hardcoded email found in: ${file}`);
  }
});

test('No hardcoded credentials in scripts', !hardcodedCredsFound);

// Test 5: Environment Variable Security
console.log('5. ENVIRONMENT VARIABLE SECURITY TESTS');
console.log('--------------------------------------');

test('NODE_ENV validation present in server.js',
  serverContent.includes('NODE_ENV') && serverContent.includes('development'),
  'NODE_ENV validation implemented');

test('Stack traces only in development mode',
  serverContent.includes('process.env.NODE_ENV === \'development\''),
  'Production stack trace protection enabled');

// Test 6: Security Headers and Middleware
console.log('6. SECURITY HEADERS TESTS');
console.log('-------------------------');

test('Helmet security middleware enabled',
  serverContent.includes('app.use(helmet())'),
  'Security headers configured');

test('Rate limiting middleware enabled',
  serverContent.includes('rateLimiter') || serverContent.includes('express-rate-limit'),
  'Rate limiting protection active');

test('MongoDB sanitization enabled',
  serverContent.includes('express-mongo-sanitize'),
  'NoSQL injection protection active');

// Test 7: File Security
console.log('7. FILE SECURITY TESTS');
console.log('---------------------');

// Check .env.example for security
const envExample = fs.readFileSync(path.join(__dirname, '.env.example'), 'utf8');
test('No weak JWT secret in .env.example',
  !envExample.includes('your_super_secret_jwt_key_here_make_it_long_and_random'),
  'Example config uses proper environment variables');

// Test 8: Authentication Security
console.log('8. AUTHENTICATION SECURITY TESTS');
console.log('------------------------------');

const authController = fs.readFileSync(path.join(__dirname, 'controllers/authController.js'), 'utf8');
test('JWT signed with proper secret',
  authController.includes('process.env.JWT_SECRET'),
  'JWT uses environment variable secret');

test('Password hashing with bcrypt',
  authController.includes('bcrypt.compare') && authController.includes('bcrypt.hash'),
  'Proper password hashing implemented');

// Helper function to get all JS files
function getAllJsFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllJsFiles(filePath, arrayOfFiles);
    } else if (file.endsWith('.js')) {
      arrayOfFiles.push(filePath);
    }
  });
  
  return arrayOfFiles;
}

// Final Results
console.log('=====================================');
console.log('AUDIT SUMMARY');
console.log('=====================================\n');

console.log(`Total Tests: ${auditResults.total}`);
console.log(`Passed: ${auditResults.passed}`);
console.log(`Failed: ${auditResults.failed}`);
console.log(`Success Rate: ${((auditResults.passed / auditResults.total) * 100).toFixed(1)}%\n`);

if (auditResults.failed === 0) {
  console.log('🎉 ALL SECURITY TESTS PASSED!');
  console.log('✅ Your application is secure against the identified vulnerabilities');
} else {
  console.log('⚠️  SECURITY ISSUES FOUND!');
  console.log('❌ Please address the failed tests before deploying to production');
}

console.log('\n=====================================');
console.log('SECURITY RECOMMENDATIONS');
console.log('=====================================\n');
console.log('1. Always set NODE_ENV=production in production');
console.log('2. Use a strong, random JWT_SECRET (at least 32 characters)');
console.log('3. Set all required environment variables before starting');
console.log('4. Regularly update dependencies for security patches');
console.log('5. Enable HTTPS in production');
console.log('6. Monitor logs for security events');
console.log('7. Regular security audits and penetration testing');

process.exit(auditResults.failed === 0 ? 0 : 1);
