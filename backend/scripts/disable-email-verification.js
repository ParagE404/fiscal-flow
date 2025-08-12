const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function disableEmailVerification() {
  try {
    console.log('Updating all users to have email verification enabled...');
    
    const result = await prisma.user.updateMany({
      where: {
        isEmailVerified: false
      },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null
      }
    });

    console.log(`Updated ${result.count} users to have email verification enabled.`);
    
    // Show current user status
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isEmailVerified: true
      }
    });

    console.log('\nCurrent user status:');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}): ${user.isEmailVerified ? 'Verified' : 'Not Verified'}`);
    });

  } catch (error) {
    console.error('Error updating users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

disableEmailVerification();