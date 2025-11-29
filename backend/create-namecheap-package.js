const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

console.log('🚀 Creating Namecheap deployment package...\n');

// Files and folders to exclude
const excludePatterns = [
  'node_modules',
  '.git',
  '.gitignore',
  'README.md',
  'logs',
  '.env',
  '.env.example',
  'test-*.js',
  'create-sample-data.js',
  'health-check.js',
  'setup-default-trial.js',
  'update-featured-channels.js',
  'allow-port-5000.bat',
  'Dockerfile',
  'ecosystem.config.js',
  'CREDENTIALS_UPDATED.md',
  'DEPLOYMENT_GUIDE.md',
  'QUICK_DEPLOYMENT_NAMECHEAP.md',
  'create-namecheap-package.js',
  '*.log',
  'deploy-namecheap.sh'
];

// Create output directory
const outputDir = path.join(__dirname, '..', 'deployment');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'supasoka-backend-namecheap.tar.gz');

// Create archive
const output = fs.createWriteStream(outputPath);
const archive = archiver('tar', {
  gzip: true,
  gzipOptions: {
    level: 9
  }
});

output.on('close', function() {
  const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log('\n✅ Package created successfully!');
  console.log(`📦 File: ${outputPath}`);
  console.log(`📊 Size: ${sizeInMB} MB`);
  console.log(`📁 Total bytes: ${archive.pointer()}`);
  console.log('\n📋 Next steps:');
  console.log('1. Upload this file to a public location (Google Drive, Dropbox, etc.)');
  console.log('2. Get the direct download link');
  console.log('3. SSH into your Namecheap hosting');
  console.log('4. Use wget to download: wget <your-direct-link>');
  console.log('5. Extract: tar -xzf supasoka-backend-namecheap.tar.gz');
  console.log('6. Follow NAMECHEAP_DEPLOYMENT_READY.md for setup\n');
});

archive.on('error', function(err) {
  console.error('❌ Error creating archive:', err);
  throw err;
});

archive.on('warning', function(err) {
  if (err.code === 'ENOENT') {
    console.warn('⚠️  Warning:', err);
  } else {
    throw err;
  }
});

// Pipe archive data to the file
archive.pipe(output);

// Function to check if path should be excluded
function shouldExclude(filePath) {
  const relativePath = path.relative(__dirname, filePath);
  
  for (const pattern of excludePatterns) {
    if (pattern.includes('*')) {
      // Handle wildcard patterns
      const regex = new RegExp(pattern.replace('*', '.*'));
      if (regex.test(relativePath)) {
        return true;
      }
    } else if (relativePath.includes(pattern)) {
      return true;
    }
  }
  
  return false;
}

// Add files to archive
function addDirectory(dirPath, archivePath = '') {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    const archiveFilePath = archivePath ? path.join(archivePath, file) : file;
    
    if (shouldExclude(fullPath)) {
      console.log(`⏭️  Skipping: ${archiveFilePath}`);
      return;
    }
    
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      console.log(`📁 Adding directory: ${archiveFilePath}`);
      addDirectory(fullPath, archiveFilePath);
    } else {
      console.log(`📄 Adding file: ${archiveFilePath}`);
      archive.file(fullPath, { name: archiveFilePath });
    }
  });
}

console.log('📦 Packaging backend files...\n');

// Add all backend files except excluded ones
addDirectory(__dirname);

// Add .env.namecheap as .env for production
console.log('\n📄 Adding production environment file...');
archive.file(path.join(__dirname, '.env.namecheap'), { name: '.env' });

// Finalize the archive
console.log('\n🔄 Finalizing archive...');
archive.finalize();
