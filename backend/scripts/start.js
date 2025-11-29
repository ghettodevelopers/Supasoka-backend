const { execSync } = require('child_process');

console.log('🔧 Running database setup...');

try {
  // Run prisma db push to ensure tables exist
  execSync('npx prisma db push --accept-data-loss --skip-generate', {
    stdio: 'inherit',
    cwd: __dirname + '/..'
  });
  
  console.log('✅ Database setup complete!');
  console.log('🚀 Starting server...');
  
  // Start the server
  require('../server.js');
} catch (error) {
  console.error('❌ Database setup failed:', error.message);
  console.log('⚠️  Starting server anyway...');
  require('../server.js');
}
