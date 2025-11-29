const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Supasoka database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@supasoka.com' },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || 'admin@supasoka.com',
      password: hashedPassword,
      role: 'super_admin',
      deviceId: 'admin-device',
      uniqueUserId: 'ADMIN_USER',
      deviceName: 'Admin Dashboard',
      platform: 'web',
      isActivated: true,
      accessLevel: 'admin'
    }
  });

  console.log('✅ Admin user created:', admin.email);

  // Create sample channels
  const channels = [
    {
      name: 'Al Jazeera English',
      streamUrl: 'https://live-hls-web-aje.getaj.net/AJE/01.m3u8',
      category: 'news',
      logo: 'https://upload.wikimedia.org/wikipedia/en/f/f2/Aljazeera_eng.png',
      description: 'International news channel',
      isActive: true
    },
    {
      name: 'BBC World News',
      streamUrl: 'https://vs-hls-push-ww-live.akamaized.net/x=4/i=urn:bbc:pips:service:bbc_world_service/t=3840/v=pv14/b=5070016/main.m3u8',
      category: 'news',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/BBC_World_News_red_logo.svg/1200px-BBC_World_News_red_logo.svg.png',
      description: 'BBC international news',
      isActive: true
    },
    {
      name: 'CNN International',
      streamUrl: 'https://cnn-cnninternational-1-eu.rakuten.wurl.tv/playlist.m3u8',
      category: 'news',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/CNN_International_logo.svg/1200px-CNN_International_logo.svg.png',
      description: 'CNN international coverage',
      isActive: true
    }
  ];

  for (const channelData of channels) {
    const channel = await prisma.channel.upsert({
      where: { name: channelData.name },
      update: {},
      create: channelData
    });
    console.log('✅ Channel created:', channel.name);
  }

  console.log('🎉 Database seeded successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
