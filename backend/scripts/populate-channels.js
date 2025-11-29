const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function populateChannels() {
  console.log('📺 Populating test channels...');
  
  const channels = [
    {
      name: 'TBC 1',
      logo: 'https://example.com/tbc1-logo.png',
      category: 'General',
      color: { primary: '#FF0000', secondary: '#FFFFFF' },
      hd: true,
      streamUrl: 'https://5856e1a25f71e.streamlock.net/etvonline/etvonline/playlist.m3u8',
      description: 'Tanzania Broadcasting Corporation - Main Channel',
      priority: 1
    },
    {
      name: 'ITV',
      logo: 'https://example.com/itv-logo.png',
      category: 'General',
      color: { primary: '#0066CC', secondary: '#FFFFFF' },
      hd: true,
      streamUrl: 'https://foreveralive-live.hls.adaptive.level3.net/forever/forever_live/playlist.m3u8',
      description: 'Independent Television',
      priority: 2
    },
    {
      name: 'Star TV',
      logo: 'https://example.com/star-logo.png',
      category: 'Entertainment',
      color: { primary: '#FFD700', secondary: '#000000' },
      hd: true,
      streamUrl: 'https://helga.iptv2022.com/sh/STAR_TV/index.m3u8',
      description: 'Star Television - Entertainment Channel',
      priority: 3
    },
    {
      name: 'Azam TV',
      logo: 'https://example.com/azam-logo.png',
      category: 'Sports',
      color: { primary: '#00AA00', secondary: '#FFFFFF' },
      hd: true,
      streamUrl: 'https://bcovlive-a.akamaihd.net/r2d2c4ca5bf57456fb1a3e6ac1f76bc49/us-east-1/6240731308001/playlist.m3u8',
      description: 'Azam TV - Sports and Entertainment',
      priority: 4
    }
  ];

  for (const channelData of channels) {
    try {
      const channel = await prisma.channel.create({
        data: channelData
      });
      console.log(`✅ Created channel: ${channel.name}`);
    } catch (error) {
      console.log(`⚠️ Channel ${channelData.name} might already exist`);
    }
  }

  console.log('🎉 Channels populated successfully!');
}

populateChannels()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
