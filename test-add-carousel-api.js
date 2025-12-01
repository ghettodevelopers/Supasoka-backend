// Test script to add carousel via Render.com API
const https = require('https');

// First, login as admin to get token
async function loginAdmin() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      email: 'Ghettodevelopers@gmail.com',
      password: 'Chundabadi'
    });

    const options = {
      hostname: 'supasoka-backend.onrender.com',
      port: 443,
      path: '/api/auth/admin/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.token) {
            console.log('✅ Admin login successful');
            resolve(response.token);
          } else {
            reject(new Error('No token in response'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Add carousel image
async function addCarousel(token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      imageUrl: 'https://picsum.photos/800/400?random=' + Date.now(),
      title: 'Production Test Carousel',
      description: 'Added via API test script',
      linkUrl: '',
      order: 0,
      isActive: true
    });

    const options = {
      hostname: 'supasoka-backend.onrender.com',
      port: 443,
      path: '/api/channels/carousel',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': `Bearer ${token}`
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log('📡 Response status:', res.statusCode);
        console.log('📦 Response body:', body);
        
        try {
          const response = JSON.parse(body);
          if (res.statusCode === 201) {
            console.log('✅ Carousel added successfully!');
            console.log('   ID:', response.image?.id);
            console.log('   Title:', response.image?.title);
            console.log('   Image URL:', response.image?.imageUrl);
            resolve(response.image);
          } else {
            reject(new Error(`Failed with status ${res.statusCode}: ${body}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Verify carousel was added
async function verifyCarousel() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'supasoka-backend.onrender.com',
      port: 443,
      path: '/api/channels/carousel',
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          console.log('\n🔍 Verification - Public carousel endpoint:');
          console.log('   Total images:', response.images?.length || 0);
          if (response.images && response.images.length > 0) {
            response.images.forEach((img, index) => {
              console.log(`   ${index + 1}. ${img.title} - ${img.imageUrl}`);
            });
          }
          resolve(response.images);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Run the test
async function runTest() {
  try {
    console.log('🚀 Starting carousel API test...\n');
    
    console.log('1️⃣ Logging in as admin...');
    const token = await loginAdmin();
    
    console.log('\n2️⃣ Adding carousel image...');
    const carousel = await addCarousel(token);
    
    console.log('\n3️⃣ Verifying carousel was added...');
    await verifyCarousel();
    
    console.log('\n✅ Test completed successfully!');
    console.log('\n📱 Now refresh your user app to see the carousel!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('   Details:', error);
  }
}

runTest();
