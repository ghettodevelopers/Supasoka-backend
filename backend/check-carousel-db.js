const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCarouselDatabase() {
  console.log('🔍 Checking Carousel Database...\n');
  
  try {
    // Check if table exists and get all carousel images
    const allImages = await prisma.carouselImage.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`📊 Total carousel images in database: ${allImages.length}\n`);
    
    if (allImages.length === 0) {
      console.log('❌ NO CAROUSEL IMAGES FOUND IN DATABASE!');
      console.log('\n💡 Solution: Add carousel images in AdminSupa:\n');
      console.log('   1. Open AdminSupa');
      console.log('   2. Go to Carousel section');
      console.log('   3. Click "Add New Image"');
      console.log('   4. Upload image and save\n');
      return;
    }
    
    // Show all images
    console.log('📸 All Carousel Images:\n');
    allImages.forEach((img, index) => {
      console.log(`${index + 1}. ${img.title || 'Untitled'}`);
      console.log(`   ID: ${img.id}`);
      console.log(`   Image URL: ${img.imageUrl}`);
      console.log(`   Active: ${img.isActive ? '✅ YES' : '❌ NO'}`);
      console.log(`   Order: ${img.order}`);
      console.log(`   Created: ${img.createdAt.toLocaleString()}`);
      console.log(`   Updated: ${img.updatedAt.toLocaleString()}`);
      console.log('');
    });
    
    // Check active images
    const activeImages = allImages.filter(img => img.isActive);
    console.log(`\n✅ Active carousel images: ${activeImages.length}`);
    
    if (activeImages.length === 0) {
      console.log('\n⚠️ WARNING: No active carousel images!');
      console.log('   All images are marked as inactive (isActive: false)');
      console.log('\n💡 Solution: Activate images in AdminSupa:\n');
      console.log('   1. Open AdminSupa → Carousel');
      console.log('   2. Toggle images to Active');
      console.log('   3. Save changes\n');
    } else {
      console.log('\n📋 Active Images:');
      activeImages.forEach((img, index) => {
        console.log(`   ${index + 1}. ${img.title} - ${img.imageUrl}`);
      });
    }
    
    // Check image URLs
    console.log('\n🔗 Checking Image URLs...');
    const invalidUrls = allImages.filter(img => 
      !img.imageUrl || 
      (!img.imageUrl.startsWith('http://') && !img.imageUrl.startsWith('https://'))
    );
    
    if (invalidUrls.length > 0) {
      console.log(`\n⚠️ Found ${invalidUrls.length} images with invalid URLs:`);
      invalidUrls.forEach(img => {
        console.log(`   - ${img.title}: "${img.imageUrl}"`);
      });
      console.log('\n💡 Image URLs must start with http:// or https://');
    } else {
      console.log('✅ All image URLs are valid');
    }
    
  } catch (error) {
    console.error('\n❌ Database Error:', error.message);
    
    if (error.code === 'P2021') {
      console.log('\n⚠️ Table "CarouselImage" does not exist!');
      console.log('\n💡 Solution: Run database migration:\n');
      console.log('   cd backend');
      console.log('   npx prisma migrate dev\n');
    } else {
      console.error('Full error:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkCarouselDatabase()
  .then(() => {
    console.log('\n✅ Database check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
