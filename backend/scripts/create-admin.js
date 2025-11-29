const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  console.log('🔐 Creating admin user...');

  try {
    // Admin credentials
    const email = 'Ghettodevelopers@gmail.com';
    const password = 'Chundabadi';
    const name = 'Super Admin';

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Check if admin already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { email }
    });

    if (existingAdmin) {
      console.log('⚠️  Admin already exists. Updating password...');
      
      const updatedAdmin = await prisma.admin.update({
        where: { email },
        data: {
          password: hashedPassword,
          name,
          role: 'super_admin',
          isActive: true,
          lastLogin: new Date()
        }
      });

      console.log('✅ Admin updated successfully!');
      console.log(`   Email: ${updatedAdmin.email}`);
      console.log(`   Name: ${updatedAdmin.name}`);
      console.log(`   Role: ${updatedAdmin.role}`);
    } else {
      const admin = await prisma.admin.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'super_admin',
          isActive: true,
          lastLogin: new Date()
        }
      });

      console.log('✅ Admin created successfully!');
      console.log(`   Email: ${admin.email}`);
      console.log(`   Name: ${admin.name}`);
      console.log(`   Role: ${admin.role}`);
    }

    console.log('\n🎉 You can now login with:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
