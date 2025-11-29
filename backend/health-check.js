#!/usr/bin/env node

const https = require('https');

const HEALTH_URL = 'https://supasoka-backend.onrender.com/health';

function checkHealth() {
  return new Promise((resolve, reject) => {
    const req = https.get(HEALTH_URL, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: result
          });
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Health check timeout'));
    });
  });
}

async function main() {
  try {
    console.log('🏥 Checking Supasoka Backend Health...');
    const result = await checkHealth();
    
    if (result.status === 200 && result.data.status === 'OK') {
      console.log('✅ Backend is healthy');
      console.log(`   Uptime: ${Math.floor(result.data.uptime / 60)} minutes`);
      console.log(`   Environment: ${result.data.environment}`);
      process.exit(0);
    } else {
      console.log('❌ Backend health check failed');
      process.exit(1);
    }
  } catch (error) {
    console.log(`❌ Health check error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkHealth };
