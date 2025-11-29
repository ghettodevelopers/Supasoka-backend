/**
 * Initialize Contact Settings Table
 * Run this script to create the contact_settings table and add default data
 * 
 * Usage: node scripts/init-contact-settings.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function initializeContactSettings() {
  try {
    console.log('🔄 Initializing contact settings...');

    // Check if settings already exist
    const existing = await prisma.contactSettings.findFirst({
      where: { isActive: true }
    });

    if (existing) {
      console.log('✅ Contact settings already exist:');
      console.log(`   WhatsApp: ${existing.whatsappNumber || 'Not set'}`);
      console.log(`   Call: ${existing.callNumber || 'Not set'}`);
      console.log(`   Email: ${existing.supportEmail || 'Not set'}`);
      return;
    }

    // Create default settings
    const contactSettings = await prisma.contactSettings.create({
      data: {
        whatsappNumber: '+255 XXX XXX XXX',
        callNumber: '+255 XXX XXX XXX',
        supportEmail: 'support@supasoka.com',
        isActive: true,
        updatedBy: 'system'
      }
    });

    console.log('✅ Contact settings initialized successfully!');
    console.log(`   WhatsApp: ${contactSettings.whatsappNumber}`);
    console.log(`   Call: ${contactSettings.callNumber}`);
    console.log(`   Email: ${contactSettings.supportEmail}`);
    console.log('');
    console.log('📝 You can now update these settings from AdminSupa Settings screen');

  } catch (error) {
    console.error('❌ Error initializing contact settings:', error.message);
    console.error('');
    console.error('💡 If you see "Table does not exist" error:');
    console.error('   1. Run: npx prisma db push');
    console.error('   2. Then run this script again');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

initializeContactSettings();
