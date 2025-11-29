const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupDefaultFreeTrial() {
  try {
    console.log('🔧 Setting up default 15-second free trial...');
    
    const setting = await prisma.appSettings.upsert({
      where: { key: 'free_trial_seconds' },
      update: {
        value: '15',
        description: 'Free trial duration: 0d 0h 0m 15s',
        updatedBy: 'system'
      },
      create: {
        key: 'free_trial_seconds',
        value: '15',
        description: 'Free trial duration: 0d 0h 0m 15s',
        updatedBy: 'system'
      }
    });

    console.log('✅ Default free trial setting created:', setting);
    console.log('📊 Default: 15 seconds for all new users');
    console.log('🎛️ Admin can modify this in the dashboard');
    
  } catch (error) {
    console.error('❌ Error setting up default free trial:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupDefaultFreeTrial();
