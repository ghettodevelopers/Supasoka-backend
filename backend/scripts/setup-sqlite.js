const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up SQLite database for Supasoka...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!');
  process.exit(1);
}

// Read .env file
const envContent = fs.readFileSync(envPath, 'utf8');

// Check if DATABASE_URL is set to SQLite
if (!envContent.includes('DATABASE_URL="file:./dev.db"')) {
  console.log('⚠️  DATABASE_URL is not set to SQLite. Updating...');
  const updatedEnv = envContent.replace(
    /DATABASE_URL=.*/,
    'DATABASE_URL="file:./dev.db"'
  );
  fs.writeFileSync(envPath, updatedEnv);
  console.log('✅ Updated DATABASE_URL to use SQLite\n');
}

try {
  console.log('📦 Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('✅ Prisma Client generated\n');

  console.log('🗄️  Creating SQLite database and running migrations...');
  execSync('npx prisma migrate dev --name init', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('✅ Database created and migrations applied\n');

  console.log('🎉 SQLite setup complete!');
  console.log('\n📍 Database location: backend/dev.db');
  console.log('🚀 You can now start the server with: npm start\n');
} catch (error) {
  console.error('❌ Error during setup:', error.message);
  console.log('\n💡 Try running these commands manually:');
  console.log('   1. npx prisma generate');
  console.log('   2. npx prisma migrate dev --name init');
  process.exit(1);
}
