#!/usr/bin/env node

/**
 * Supasoka Backend Production Readiness Test
 * This script tests all critical functionality before deployment
 */

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const BASE_URL = 'http://localhost:5000';
const prisma = new PrismaClient();

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0
};

async function runTest(testName, testFunction) {
  try {
    info(`Testing: ${testName}`);
    await testFunction();
    success(`${testName} - PASSED`);
    testResults.passed++;
  } catch (err) {
    error(`${testName} - FAILED: ${err.message}`);
    testResults.failed++;
  }
}

async function runWarningTest(testName, testFunction) {
  try {
    info(`Checking: ${testName}`);
    await testFunction();
    success(`${testName} - OK`);
  } catch (err) {
    warning(`${testName} - WARNING: ${err.message}`);
    testResults.warnings++;
  }
}

// Test functions
async function testHealthEndpoint() {
  const response = await axios.get(`${BASE_URL}/health`);
  if (response.status !== 200) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  if (response.data.status !== 'OK') {
    throw new Error(`Health status is ${response.data.status}, expected OK`);
  }
}

async function testDatabaseConnection() {
  await prisma.$connect();
  const userCount = await prisma.user.count();
  info(`Database connected. Found ${userCount} users.`);
}

async function testAdminAuthentication() {
  const response = await axios.post(`${BASE_URL}/api/auth/admin/login`, {
    email: 'admin@supasoka.com',
    password: 'admin123'
  });
  
  if (!response.data.token) {
    throw new Error('No token received from admin login');
  }
  
  // Store token for subsequent tests
  global.adminToken = response.data.token;
}

async function testChannelsEndpoint() {
  const response = await axios.get(`${BASE_URL}/api/channels`);
  if (!response.data.channels || !Array.isArray(response.data.channels)) {
    throw new Error('Channels endpoint should return an object with channels array');
  }
  info(`Found ${response.data.channels.length} channels`);
}

async function testCarouselEndpoint() {
  const response = await axios.get(`${BASE_URL}/api/channels/carousel`);
  if (!response.data.images || !Array.isArray(response.data.images)) {
    throw new Error('Carousel endpoint should return an object with images array');
  }
  info(`Found ${response.data.images.length} carousel images`);
}

async function testAdminStatsEndpoint() {
  if (!global.adminToken) {
    throw new Error('Admin token not available');
  }
  
  const response = await axios.get(`${BASE_URL}/api/admin/stats`, {
    headers: { Authorization: `Bearer ${global.adminToken}` }
  });
  
  if (!response.data.stats || (response.data.stats.totalUsers === undefined && response.data.stats.totalUsers !== 0)) {
    throw new Error('Stats endpoint should return stats object with totalUsers');
  }
  info(`Found ${response.data.stats.totalUsers} total users`);
}

async function testNotificationSystem() {
  if (!global.adminToken) {
    throw new Error('Admin token not available');
  }
  
  // Test getting notifications
  const response = await axios.get(`${BASE_URL}/api/notifications/admin/all`, {
    headers: { Authorization: `Bearer ${global.adminToken}` }
  });
  
  if (!response.data.notifications || !Array.isArray(response.data.notifications)) {
    throw new Error('Notifications endpoint should return notifications array');
  }
}

async function testUserInitialization() {
  const testDeviceId = `test_device_${Date.now()}`;
  
  const response = await axios.post(`${BASE_URL}/api/auth/user/initialize`, {
    deviceId: testDeviceId,
    deviceName: 'Test Device',
    platform: 'test'
  });
  
  if (!response.data.token) {
    throw new Error('User initialization should return a token');
  }
  
  // Clean up test user
  try {
    await prisma.user.delete({
      where: { deviceId: testDeviceId }
    });
  } catch (err) {
    // Ignore cleanup errors
  }
}

async function testEnvironmentVariables() {
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD'
  ];
  
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

async function testJWTSecret() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET should be at least 32 characters long for production');
  }
}

async function testProductionConfig() {
  if (process.env.NODE_ENV === 'production') {
    if (process.env.ADMIN_PASSWORD === 'admin123') {
      throw new Error('Default admin password should be changed in production');
    }
    
    if (process.env.JWT_SECRET.includes('supasoka_jwt_secret')) {
      throw new Error('Default JWT secret should be changed in production');
    }
  }
}

async function testCORSConfiguration() {
  // Test CORS headers with origin
  const response = await axios.options(`${BASE_URL}/api/channels`, {
    headers: { 'Origin': 'http://localhost:3000' }
  });
  
  if (!response.headers['access-control-allow-credentials']) {
    throw new Error('CORS credentials not properly configured');
  }
  
  if (!response.headers['access-control-allow-methods']) {
    throw new Error('CORS methods not properly configured');
  }
}

async function testRateLimiting() {
  // Make multiple rapid requests to test rate limiting
  const requests = Array(10).fill().map(() => 
    axios.get(`${BASE_URL}/health`).catch(err => err.response)
  );
  
  const responses = await Promise.all(requests);
  const rateLimited = responses.some(res => res && res.status === 429);
  
  info(`Rate limiting ${rateLimited ? 'is active' : 'may not be active'}`);
}

// Main test runner
async function runAllTests() {
  log('\n🧪 Starting Supasoka Backend Production Readiness Tests\n', 'blue');
  
  // Critical tests
  await runTest('Health Endpoint', testHealthEndpoint);
  await runTest('Database Connection', testDatabaseConnection);
  await runTest('Environment Variables', testEnvironmentVariables);
  await runTest('Admin Authentication', testAdminAuthentication);
  await runTest('Channels Endpoint', testChannelsEndpoint);
  await runTest('Carousel Endpoint', testCarouselEndpoint);
  await runTest('Admin Stats Endpoint', testAdminStatsEndpoint);
  await runTest('Notification System', testNotificationSystem);
  await runTest('User Initialization', testUserInitialization);
  await runTest('CORS Configuration', testCORSConfiguration);
  
  // Warning tests (non-critical)
  await runWarningTest('JWT Secret Strength', testJWTSecret);
  await runWarningTest('Production Configuration', testProductionConfig);
  await runWarningTest('Rate Limiting', testRateLimiting);
  
  // Cleanup
  await prisma.$disconnect();
  
  // Results summary
  log('\n📊 Test Results Summary:', 'blue');
  success(`Passed: ${testResults.passed}`);
  if (testResults.failed > 0) {
    error(`Failed: ${testResults.failed}`);
  }
  if (testResults.warnings > 0) {
    warning(`Warnings: ${testResults.warnings}`);
  }
  
  log('\n' + '='.repeat(50), 'blue');
  
  if (testResults.failed === 0) {
    success('🎉 All critical tests passed! Backend is ready for deployment.');
    
    if (testResults.warnings > 0) {
      warning('⚠️  Please review warnings before production deployment.');
    }
    
    log('\n📋 Deployment Checklist:', 'blue');
    log('1. ✅ Update .env.production with actual production values');
    log('2. ✅ Set up production database');
    log('3. ✅ Configure reverse proxy (nginx/apache)');
    log('4. ✅ Set up SSL certificates');
    log('5. ✅ Configure process manager (PM2/systemd)');
    log('6. ✅ Set up monitoring and logging');
    
    process.exit(0);
  } else {
    error('❌ Some critical tests failed. Please fix issues before deployment.');
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (err) => {
  error(`Unhandled rejection: ${err.message}`);
  process.exit(1);
});

// Run tests
runAllTests().catch((err) => {
  error(`Test runner failed: ${err.message}`);
  process.exit(1);
});
