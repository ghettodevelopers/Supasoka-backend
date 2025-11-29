const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestNotifications() {
  try {
    console.log('📢 Creating test notifications...');

    const testNotifications = [
      {
        title: 'Welcome to Supasoka!',
        message: 'Karibu kwenye jukwaa la kutazama televisheni ya moja kwa moja. Furahia maudhui yetu ya hali ya juu!',
        type: 'general',
        isActive: true,
        sentAt: new Date()
      },
      {
        title: 'New Sports Channel Added',
        message: 'Tumesongeza kituo kipya cha michezo. Tazama mechi za mpira wa miguu, basketball na mengine mengi!',
        type: 'update',
        isActive: true,
        sentAt: new Date()
      },
      {
        title: 'Premium Subscription Available',
        message: 'Jiunge na huduma zetu za premium na upate ufikiaji wa vituo vyote bila matangazo.',
        type: 'subscription',
        isActive: true,
        sentAt: new Date()
      },
      {
        title: 'System Maintenance',
        message: 'Tutafanya matengenezo ya mfumo kesho usiku kuanzia saa 2:00 hadi 4:00. Huduma itakuwa hazipatikani kwa muda huo.',
        type: 'maintenance',
        isActive: true,
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
      }
    ];

    for (const notificationData of testNotifications) {
      const notification = await prisma.notification.create({
        data: notificationData
      });
      console.log(`✅ Created notification: ${notification.title}`);
    }

    console.log('🎉 Test notifications created successfully!');
  } catch (error) {
    console.error('❌ Error creating test notifications:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestNotifications();
