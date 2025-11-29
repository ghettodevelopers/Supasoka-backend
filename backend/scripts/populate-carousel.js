const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function populateCarousel() {
  try {
    console.log('🎠 Populating carousel images...');

    // Check if carousel images already exist
    const existingImages = await prisma.carouselImage.count();
    if (existingImages > 0) {
      console.log('📸 Carousel images already exist. Skipping...');
      return;
    }

    const carouselImages = [
      {
        title: 'Televisheni ya Moja kwa Moja',
        subtitle: 'Tazama vituo vyako vya kupenda moja kwa moja',
        image: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
        order: 0,
        isActive: true
      },
      {
        title: 'Michezo ya Moja kwa Moja',
        subtitle: 'Usikose mechi zako za kupenda',
        image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2069&q=80',
        order: 1,
        isActive: true
      },
      {
        title: 'Habari za Haraka',
        subtitle: 'Pata habari za hivi karibuni',
        image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2074&q=80',
        order: 2,
        isActive: true
      },
      {
        title: 'Burudani Bora',
        subtitle: 'Furahia maudhui ya burudani ya hali ya juu',
        image: 'https://images.unsplash.com/photo-1489599735734-79b4af9593d2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
        order: 3,
        isActive: true
      }
    ];

    // Create carousel images
    for (const imageData of carouselImages) {
      await prisma.carouselImage.create({
        data: imageData
      });
      console.log(`✅ Created carousel image: ${imageData.title}`);
    }

    console.log('🎉 Carousel images populated successfully!');
  } catch (error) {
    console.error('❌ Error populating carousel images:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateCarousel();
