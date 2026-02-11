const axios = require('axios');

const API_BASE = 'http://localhost:5050/api';

async function testUserCreation() {
  try {
    console.log('🧪 Testing User Creation and Login...\n');

    // Create a superadmin user first for testing
    console.log('1. Logging in as superadmin...');
    try {
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: 'superadmin@instituteerp.com',
        password: 'superadmin123'
      });
      console.log('✅ Superadmin login successful');
      const token = loginResponse.data.token;
      
      // Now get schools with proper auth
      console.log('2. Fetching schools with auth...');
      const schoolsResponseAuth = await axios.get(`${API_BASE}/schools`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const schools = schoolsResponseAuth.data.schools || schoolsResponseAuth.data;
      if (!schools || schools.length === 0) {
        console.log('❌ No schools found. Please create a school first.');
        return;
      }
      
      const schoolId = schools[0]._id;
      console.log(`✅ Using school: ${schools[0].name} (${schoolId})`);
      
      // Create a test user
      console.log('3. Creating test user...');
      const testUser = {
        name: 'Test Admin',
        email: 'testadmin@school.com',
        role: 'admin',
        phone: '+1234567890',
        password: 'test123'
      };
      
      const userResponse = await axios.post(`${API_BASE}/schools/${schoolId}/users`, testUser, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ User created successfully:', userResponse.data.user);
      
      // Test login with the new user
      console.log('4. Testing login with new user...');
      const testLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: testUser.email,
        password: testUser.password
      });
      
      console.log('✅ Login successful!');
      console.log('User info:', testLoginResponse.data.user);
      console.log('Token received:', !!testLoginResponse.data.token);
      
      console.log('\n🎉 All tests passed! The login system is working correctly.');
      console.log('\nTest credentials:');
      console.log(`Email: ${testUser.email}`);
      console.log(`Password: ${testUser.password}`);
      console.log(`Role: ${testUser.role}`);
      console.log(`School: ${schools[0].name}`);
      
    } catch (loginError) {
      console.error('❌ Login error:', loginError.response?.data || loginError.message);
      if (loginError.response?.status === 400) {
        console.log('❌ Superadmin not found. Need to create one first.');
        console.log('Please create a superadmin user through the registration endpoint or seed script.');
      }
      return;
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run the test
testUserCreation();
