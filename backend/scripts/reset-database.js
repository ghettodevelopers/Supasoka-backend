const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Database Reset Script - SAFE for Development
 * 
 * This script clears:
 * - All regular users (keeps admin accounts)
 * - All notifications
 * - All user-related data (watch history, points history, etc.)
 * 
 * This script PRESERVES:
 * - Admin accounts
 * - Channels
 * - Categories
 * - Carousel images
 * - Settings
 * - Your code and configuration
 */

async function resetDatabase() {
    console.log('🔄 Starting database reset...\n');

    try {
        // Step 1: Delete all notifications
        console.log('📧 Deleting notifications...');
        const deletedNotifications = await prisma.notification.deleteMany({});
        console.log(`   ✅ Deleted ${deletedNotifications.count} notifications\n`);

        // Step 2: Delete user notifications
        console.log('🔔 Deleting user notifications...');
        const deletedUserNotifications = await prisma.userNotification.deleteMany({});
        console.log(`   ✅ Deleted ${deletedUserNotifications.count} user notifications\n`);

        // Step 3: Delete watch history
        console.log('📺 Deleting watch history...');
        const deletedWatchHistory = await prisma.watchHistory.deleteMany({});
        console.log(`   ✅ Deleted ${deletedWatchHistory.count} watch history entries\n`);

        // Step 4: Delete points history
        console.log('💰 Deleting points history...');
        const deletedPointsHistory = await prisma.pointsHistory.deleteMany({});
        console.log(`   ✅ Deleted ${deletedPointsHistory.count} points history entries\n`);

        // Step 5: Delete downloads
        console.log('📥 Deleting downloads...');
        const deletedDownloads = await prisma.download.deleteMany({});
        console.log(`   ✅ Deleted ${deletedDownloads.count} downloads\n`);

        // Step 6: Delete channel access records
        console.log('🔓 Deleting channel access records...');
        const deletedChannelAccess = await prisma.channelAccess.deleteMany({});
        console.log(`   ✅ Deleted ${deletedChannelAccess.count} channel access records\n`);

        // Step 7: Delete all users (admins are in separate Admin table)
        console.log('👥 Deleting all users...');
        const deletedUsers = await prisma.user.deleteMany({});
        console.log(`   ✅ Deleted ${deletedUsers.count} users\n`);

        // Step 8: Show what's preserved
        console.log('📊 Checking preserved data...');
        const adminCount = await prisma.admin.count();
        const channelCount = await prisma.channel.count();
        const categoryCount = await prisma.category.count();
        const carouselCount = await prisma.carouselImage.count();

        console.log(`   ✅ Preserved ${adminCount} admin accounts`);
        console.log(`   ✅ Preserved ${channelCount} channels`);
        console.log(`   ✅ Preserved ${categoryCount} categories`);
        console.log(`   ✅ Preserved ${carouselCount} carousel images\n`);

        console.log('✅ Database reset completed successfully!\n');
        console.log('🎉 You can now start fresh with clean data!\n');
        console.log('📝 Note: Your admin accounts, channels, and settings are still intact.\n');

    } catch (error) {
        console.error('❌ Error resetting database:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the reset
resetDatabase()
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
