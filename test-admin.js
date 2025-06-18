const axios = require('axios');

// Test admin login
async function testAdminLogin() {
    try {
        console.log('Testing admin login...');
        
        // Test the auth route is accessible
        const testResponse = await axios.get('http://localhost:4000/auth/test');
        console.log('✅ Auth route test:', testResponse.data);
        
        // Test admin login with sample data
        const loginData = {
            email: 'admin@example.com',
            password: 'password123',
            role: 'admin'
        };
        
        const loginResponse = await axios.post('http://localhost:4000/auth/login', loginData, {
            withCredentials: true
        });
        
        console.log('✅ Admin login response:', loginResponse.data);
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Test creating first admin
async function testCreateFirstAdmin() {
    try {
        console.log('Testing create first admin...');
        
        const adminData = {
            name: 'Test Admin',
            email: 'admin@example.com',
            password: 'password123',
            phoneNumber: '1234567890'
        };
        
        const response = await axios.post('http://localhost:4000/auth/first-admin', adminData);
        console.log('✅ Create first admin response:', response.data);
        
    } catch (error) {
        console.error('❌ Create first admin failed:', error.response?.data || error.message);
    }
}

// Run tests
async function runTests() {
    console.log('🚀 Starting admin system tests...\n');
    
    await testAdminLogin();
    console.log('\n');
    await testCreateFirstAdmin();
    
    console.log('\n✅ Tests completed!');
}

runTests(); 