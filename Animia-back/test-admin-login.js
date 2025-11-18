// test-admin-login.js
// Test script to verify admin login endpoint
const axios = require('axios');

const testAdminLogin = async () => {
  const baseURL = process.env.API_BASE_URL || 'http://localhost:3000';
  
  try {
    console.log('🧪 Testing admin login endpoint...');
    
    // Test with default admin credentials
    const response = await axios.post(`${baseURL}/api/admin-auth/login`, {
      email: 'admin@animia.com',
      password: 'admin123'
    });

    console.log('✅ Admin login successful!');
    console.log('📊 Response:', {
      success: response.data.success,
      message: response.data.message,
      hasToken: !!response.data.token,
      userRole: response.data.user?.role,
      userName: response.data.user?.name
    });

    // Test token validation
    if (response.data.token) {
      console.log('\n🔐 Testing token validation...');
      
      const profileResponse = await axios.get(`${baseURL}/api/admin-auth/profile`, {
        headers: {
          'Authorization': `Bearer ${response.data.token}`
        }
      });

      console.log('✅ Token validation successful!');
      console.log('👤 Admin profile:', {
        id: profileResponse.data.user?.id,
        name: profileResponse.data.user?.name,
        email: profileResponse.data.user?.email,
        role: profileResponse.data.user?.role
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n💡 Troubleshooting:');
      console.log('1. Make sure the server is running');
      console.log('2. Check if admin-auth routes are properly mounted');
      console.log('3. Verify the admin table exists in database');
      console.log('4. Run: node setup-admin.js to create admin user');
    }
  }
};

// Run test
testAdminLogin();
