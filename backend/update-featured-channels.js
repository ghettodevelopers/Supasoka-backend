#!/usr/bin/env node

// Script to update channel priorities for featured channels
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateFeaturedChannels() {
  try {
    console.log('🔄 Updating channel priorities for featured channels...');

    // First, get all channels to find their IDs
    const channels = await prisma.channel.findMany();
    console.log('Found channels:', channels.map(c => `${c.name} (${c.id})`));

    // Find channels by name and update their priorities
    const azamTV = channels.find(c => c.name === 'Azam TV (Test)');
    const sportsChannel = channels.find(c => c.name === 'Sports Channel (Test)');
    const newsChannel = channels.find(c => c.name === 'News Channel (Test)');

    if (azamTV) {
      await prisma.channel.update({
        where: { id: azamTV.id },
        data: { priority: 5 }
      });
      console.log('✅ Updated Azam TV to priority 5 (top featured)');
    }

    if (sportsChannel) {
      await prisma.channel.update({
        where: { id: sportsChannel.id },
        data: { priority: 3 }
      });
      console.log('✅ Updated Sports Channel to priority 3 (second featured)');
    }

    if (newsChannel) {
      await prisma.channel.update({
        where: { id: newsChannel.id },
        data: { priority: 2 }
      });
      console.log('✅ Updated News Channel to priority 2 (third featured)');
    }

    console.log('✅ Test Channel remains priority 0 (regular channel)');

    console.log('\n🎯 Featured channels setup completed!');
    console.log('Featured channels (in order):');
    console.log('1. Azam TV (Test) - Priority 5');
    console.log('2. Sports Channel (Test) - Priority 3');
    console.log('3. News Channel (Test) - Priority 2');
    console.log('4. Test Channel (Working) - Priority 0 (regular)');

  } catch (error) {
    console.error('❌ Error updating channel priorities:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateFeaturedChannels();
