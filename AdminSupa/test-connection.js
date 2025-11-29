// Quick test to check backend connection
const axios = require('axios');

const testUrls = [
  'http://10.240.153.205:5000/api/channels',
  'http://localhost:5000/api/channels',
  'https://supasoka-backend.onrender.com/api/channels',
];

async function testConnection() {
  console.log('🔍 Testing backend connections...\n');
  
  for (const url of testUrls) {
    try {
      console.log(`Testing: ${url}`);
      const response = await axios.get(url, { timeout: 5000 });
      console.log(`✅ SUCCESS! Found ${response.data.channels?.length || 0} channels\n`);
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`❌ Connection refused - Backend not running on this address\n`);
      } else if (error.code === 'ETIMEDOUT') {
        console.log(`❌ Timeout - Backend not reachable\n`);
      } else {
        console.log(`❌ Error: ${error.message}\n`);
      }
    }
  }
}

testConnection();
