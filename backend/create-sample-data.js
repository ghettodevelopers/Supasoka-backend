#!/usr/bin/env node

/**
 * Create Sample Data for Supasoka Admin App Testing
 * This script populates the database with sample data for testing the admin app
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createSampleData() {
  console.log('🚀 Creating sample data for Supasoka admin app...');

  try {
    // Create sample users
    console.log('👥 Creating sample users...');
    const users = await Promise.all([
      prisma.user.create({
        data: {
          deviceId: 'device_001',
          uniqueUserId: 'user_001',
          email: 'user1@example.com',
          isActivated: true,
          accessLevel: 'premium',
          remainingTime: 3600, // 1 hour
          points: 150,
          totalWatchTime: 7200, // 2 hours
          lastActive: new Date(),
        }
      }),
      prisma.user.create({
        data: {
          deviceId: 'device_002',
          uniqueUserId: 'user_002',
          email: 'user2@example.com',
          isActivated: false,
          accessLevel: 'basic',
          remainingTime: 0,
          points: 50,
          totalWatchTime: 1800, // 30 minutes
          lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        }
      }),
      prisma.user.create({
        data: {
          deviceId: 'device_003',
          uniqueUserId: 'user_003',
          isActivated: true,
          accessLevel: 'vip',
          remainingTime: 86400, // 24 hours
          points: 500,
          totalWatchTime: 14400, // 4 hours
          lastActive: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        }
      })
    ]);
    console.log(`✅ Created ${users.length} sample users`);

    // Create sample channels
    console.log('📺 Creating sample channels...');
    const channels = await Promise.all([
      prisma.channel.create({
        data: {
          name: 'BBC News',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/6/62/BBC_News_2019.svg',
          category: 'news',
          color: { primary: '#bb1919', secondary: '#8b0000' },
          hd: true,
          streamUrl: 'https://vs-hls-push-ww-live.akamaized.net/x=4/i=urn:bbc:pips:service:bbc_news24/t=3840/v=pv14/b=5070016/main.m3u8',
          isActive: true,
          priority: 1,
          description: 'Breaking news and analysis from the BBC',
          isFeatured: true,
          featuredOrder: 1,
          featuredTitle: 'Live Breaking News',
          featuredDesc: 'Stay updated with the latest global news'
        }
      }),
      prisma.channel.create({
        data: {
          name: 'CNN International',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/CNN.svg',
          category: 'news',
          color: { primary: '#cc0000', secondary: '#990000' },
          hd: true,
          streamUrl: 'https://cnn-cnninternational-1-eu.rakuten.wurl.tv/playlist.m3u8',
          isActive: true,
          priority: 2,
          description: 'International news coverage from CNN'
        }
      }),
      prisma.channel.create({
        data: {
          name: 'National Geographic',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Natgeologo.svg',
          category: 'documentary',
          color: { primary: '#ffcc00', secondary: '#ff9900' },
          hd: true,
          streamUrl: 'https://nationalgeographic-playback.samsung.wurl.tv/playlist.m3u8',
          isActive: true,
          priority: 3,
          description: 'Explore the world with National Geographic',
          isFeatured: true,
          featuredOrder: 2,
          featuredTitle: 'Explore Nature',
          featuredDesc: 'Amazing documentaries about our planet'
        }
      }),
      prisma.channel.create({
        data: {
          name: 'MTV Music',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/MTV-2021.svg',
          category: 'music',
          color: { primary: '#ff6600', secondary: '#cc5500' },
          hd: true,
          streamUrl: 'https://mtv-mx.samsung.wurl.tv/playlist.m3u8',
          isActive: true,
          priority: 4,
          description: 'The latest music videos and entertainment'
        }
      }),
      prisma.channel.create({
        data: {
          name: 'Sports Center',
          logo: 'https://example.com/sports-logo.png',
          category: 'sports',
          color: { primary: '#0066cc', secondary: '#004499' },
          hd: true,
          streamUrl: 'https://sports-stream.example.com/playlist.m3u8',
          isActive: false,
          priority: 5,
          description: 'Live sports coverage and highlights'
        }
      })
    ]);
    console.log(`✅ Created ${channels.length} sample channels`);

    // Create sample carousel images
    console.log('🎠 Creating sample carousel images...');
    const carouselImages = await Promise.all([
      prisma.carouselImage.create({
        data: {
          title: 'Welcome to Supasoka',
          subtitle: 'Your premium streaming experience starts here',
          image: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800&h=400&fit=crop',
          order: 1,
          isActive: true,
          actionType: 'none'
        }
      }),
      prisma.carouselImage.create({
        data: {
          title: 'Live News Coverage',
          subtitle: 'Stay informed with 24/7 news channels',
          image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=400&fit=crop',
          order: 2,
          isActive: true,
          actionType: 'channel',
          channelId: channels[0].id // BBC News
        }
      }),
      prisma.carouselImage.create({
        data: {
          title: 'Discover Nature',
          subtitle: 'Explore amazing documentaries',
          image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=400&fit=crop',
          order: 3,
          isActive: true,
          actionType: 'channel',
          channelId: channels[2].id // National Geographic
        }
      })
    ]);
    console.log(`✅ Created ${carouselImages.length} sample carousel images`);

    // Create sample notifications
    console.log('🔔 Creating sample notifications...');
    const notifications = await Promise.all([
      prisma.notification.create({
        data: {
          title: 'Welcome to Supasoka!',
          message: 'Thank you for joining our premium streaming service. Enjoy unlimited access to your favorite channels.',
          type: 'general',
          isActive: true,
          sentAt: new Date()
        }
      }),
      prisma.notification.create({
        data: {
          title: 'New Channels Added',
          message: 'We have added new documentary and music channels to enhance your viewing experience.',
          type: 'update',
          isActive: true,
          sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        }
      })
    ]);
    console.log(`✅ Created ${notifications.length} sample notifications`);

    // Create user notifications
    console.log('📬 Creating user notifications...');
    const userNotifications = [];
    for (const user of users) {
      for (const notification of notifications) {
        userNotifications.push(
          prisma.userNotification.create({
            data: {
              userId: user.id,
              notificationId: notification.id,
              isRead: Math.random() > 0.5 // Randomly mark some as read
            }
          })
        );
      }
    }
    await Promise.all(userNotifications);
    console.log(`✅ Created ${userNotifications.length} user notifications`);

    // Create sample watch history
    console.log('📊 Creating sample watch history...');
    const watchHistory = [];
    for (const user of users) {
      for (let i = 0; i < 3; i++) {
        const randomChannel = channels[Math.floor(Math.random() * channels.length)];
        watchHistory.push(
          prisma.watchHistory.create({
            data: {
              userId: user.id,
              channelId: randomChannel.id,
              watchTime: Math.floor(Math.random() * 3600) + 300, // 5 minutes to 1 hour
              sessionTime: Math.floor(Math.random() * 1800) + 300, // 5 to 30 minutes
              quality: ['HD', '720p', '480p'][Math.floor(Math.random() * 3)],
              createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random time in last 7 days
            }
          })
        );
      }
    }
    await Promise.all(watchHistory);
    console.log(`✅ Created ${watchHistory.length} watch history entries`);

    // Create app settings
    console.log('⚙️ Creating app settings...');
    await prisma.appSettings.upsert({
      where: { key: 'free_trial_seconds' },
      update: {
        value: '900', // 15 minutes
        description: 'Free trial duration in seconds',
        updatedBy: 'system'
      },
      create: {
        key: 'free_trial_seconds',
        value: '900',
        description: 'Free trial duration in seconds',
        updatedBy: 'system'
      }
    });

    // Create contact settings
    console.log('📞 Creating contact settings...');
    await prisma.contactSettings.upsert({
      where: { id: 'default' },
      update: {
        whatsappNumber: '+255123456789',
        callNumber: '+255987654321',
        supportEmail: 'support@supasoka.com',
        updatedBy: 'system'
      },
      create: {
        id: 'default',
        whatsappNumber: '+255123456789',
        callNumber: '+255987654321',
        supportEmail: 'support@supasoka.com',
        isActive: true,
        updatedBy: 'system'
      }
    });

    console.log('✅ Created app settings and contact settings');

    // Summary
    console.log('\n🎉 Sample data creation completed successfully!');
    console.log('📊 Summary:');
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   📺 Channels: ${channels.length}`);
    console.log(`   🎠 Carousel Images: ${carouselImages.length}`);
    console.log(`   🔔 Notifications: ${notifications.length}`);
    console.log(`   📬 User Notifications: ${userNotifications.length}`);
    console.log(`   📊 Watch History: ${watchHistory.length}`);
    console.log('\n🚀 Your admin app now has sample data to work with!');

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  createSampleData();
}

module.exports = { createSampleData };
