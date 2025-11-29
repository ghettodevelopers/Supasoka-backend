const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function populateUniqueUserIds() {
  try {
    console.log('🔄 Populating unique user IDs...');
    
    // Get all users without uniqueUserId
    const users = await prisma.user.findMany({
      where: {
        uniqueUserId: null
      }
    });

    console.log(`Found ${users.length} users without unique IDs`);

    // Update each user with a unique ID
    for (const user of users) {
      const uniqueId = `USER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await prisma.user.update({
        where: { id: user.id },
        data: { uniqueUserId: uniqueId }
      });
      
      console.log(`✅ Updated user ${user.deviceId} with unique ID: ${uniqueId}`);
    }

    console.log('✅ All users now have unique IDs');
    
    // Create some sample advertisements
    console.log('🔄 Creating sample advertisements...');
    
    const ads = [
      {
        title: 'Supasoka Premium',
        description: 'Furahia michezo yote bila kikomo',
        adType: 'video',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        duration: 30,
        pointsReward: 10,
        priority: 1
      },
      {
        title: 'Tangazo la Biashara',
        description: 'Bidhaa bora kwa bei nafuu',
        adType: 'video',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        duration: 25,
        pointsReward: 10,
        priority: 2
      }
    ];

    for (const ad of ads) {
      const existingAd = await prisma.advertisement.findFirst({
        where: { title: ad.title }
      });
      
      if (existingAd) {
        await prisma.advertisement.update({
          where: { id: existingAd.id },
          data: ad
        });
        console.log(`✅ Updated advertisement: ${ad.title}`);
      } else {
        await prisma.advertisement.create({
          data: ad
        });
        console.log(`✅ Created advertisement: ${ad.title}`);
      }
    }

    console.log('✅ Sample advertisements created');
    
  } catch (error) {
    console.error('❌ Error populating data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateUniqueUserIds();
