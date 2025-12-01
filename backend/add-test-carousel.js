const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addTestCarousel() {
  try {
    console.log('🔄 Adding test carousel image to database...');
    
    // Delete any existing carousel images first
    const deleted = await prisma.carouselImage.deleteMany({});
    console.log(`🗑️ Deleted ${deleted.count} existing carousel images`);
    
    // Add a test carousel image
    const carousel = await prisma.carouselImage.create({
      data: {
        imageUrl: 'https://picsum.photos/800/400?random=1',
        title: 'Test Carousel',
        description: 'This is a test carousel image',
        linkUrl: '',
        order: 0,
        isActive: true
      }
    });
    
    console.log('✅ Test carousel added successfully!');
    console.log('📊 Carousel details:');
    console.log('   ID:', carousel.id);
    console.log('   Title:', carousel.title);
    console.log('   Image URL:', carousel.imageUrl);
    console.log('   Is Active:', carousel.isActive);
    console.log('   Order:', carousel.order);
    
    // Verify it was added
    const allCarousels = await prisma.carouselImage.findMany({
      where: { isActive: true }
    });
    
    console.log(`\n✅ Total active carousel images in database: ${allCarousels.length}`);
    
  } catch (error) {
    console.error('❌ Error adding test carousel:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestCarousel();
