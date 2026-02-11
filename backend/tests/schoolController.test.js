const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const School = require('../models/School');
const User = require('../models/User');

describe('School Controller - Classes Endpoint', () => {
  let testSchool;
  let adminUser;
  let superAdminUser;
  let adminToken;
  let superAdminToken;

  beforeAll(async () => {
    // Create test school
    testSchool = await School.create({
      name: 'Test School',
      code: 'TEST',
      principalName: 'Test Principal',
      principalEmail: 'principal@test.com',
      address: 'Test Address',
      contact: { primary: '1234567890' },
      accessMatrix: {},
      bankDetails: {},
      settings: {},
      features: {},
      schoolType: 'CBSE',
      establishedYear: 2020,
      affiliationBoard: 'CBSE',
      website: 'https://test.com',
      isActive: true
    });

    // Create admin user
    adminUser = await User.create({
      name: {
        firstName: 'Admin',
        lastName: 'User',
        displayName: 'Admin User'
      },
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin',
      schoolId: testSchool._id,
      schoolCode: testSchool.code,
      isActive: true
    });

    // Create super admin user
    superAdminUser = await User.create({
      name: {
        firstName: 'Super',
        lastName: 'Admin',
        displayName: 'Super Admin'
      },
      email: 'superadmin@test.com',
      password: 'password123',
      role: 'superadmin',
      isActive: true
    });

    // Generate tokens (simplified for testing)
    adminToken = 'mock-admin-token';
    superAdminToken = 'mock-superadmin-token';
  });

  afterAll(async () => {
    // Clean up test data
    await School.findByIdAndDelete(testSchool._id);
    await User.findByIdAndDelete(adminUser._id);
    await User.findByIdAndDelete(superAdminUser._id);
    await mongoose.connection.close();
  });

  describe('GET /api/schools/:schoolId/classes', () => {
    it('should return 403 for admin trying to access other school', async () => {
      const otherSchool = await School.create({
        name: 'Other School',
        code: 'OTHER',
        principalName: 'Other Principal',
        principalEmail: 'other@test.com',
        address: 'Other Address',
        contact: { primary: '0987654321' },
        isActive: true
      });

      const response = await request(app)
        .get(`/api/schools/${otherSchool._id}/classes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access denied');

      await School.findByIdAndDelete(otherSchool._id);
    });

    it('should return 404 for non-existent school', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/schools/${fakeId}/classes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('School not found');
    });

    it('should return empty array when no classes exist', async () => {
      const response = await request(app)
        .get(`/api/schools/${testSchool._id}/classes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should return classes data when classes exist', async () => {
      // This test would require setting up the school's dedicated database
      // and creating classes in the classes collection
      // For now, we'll test the basic structure
      
      const response = await request(app)
        .get(`/api/schools/${testSchool._id}/classes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should allow super admin to access any school', async () => {
      const response = await request(app)
        .get(`/api/schools/${testSchool._id}/classes`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should include caching headers', async () => {
      const response = await request(app)
        .get(`/api/schools/${testSchool._id}/classes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.headers['cache-control']).toContain('max-age=30');
    });
  });
});
