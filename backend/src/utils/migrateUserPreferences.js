const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Default preferences
const defaultPreferences = {
  theme: 'system',
  currency: {
    code: 'INR',
    symbol: '₹',
    format: 'indian'
  },
  numberFormat: {
    style: 'indian',
    decimalPlaces: 2
  },
  autoRefreshPrices: false,
  pushNotifications: {
    enabled: false,
    sipReminders: false,
    fdMaturityAlerts: false,
    portfolioUpdates: false
  },
  dashboard: {
    defaultView: 'overview',
    showWelcomeMessage: true,
    compactMode: false
  },
  onboarding: {
    completed: false,
    skippedSteps: [],
    lastCompletedStep: null
  }
};

async function migrateUserPreferences() {
  try {
    console.log('Starting user preferences migration...');

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        preferences: true
      }
    });

    console.log(`Found ${users.length} users to migrate`);

    for (const user of users) {
      // Only update if preferences are null or empty
      if (!user.preferences || Object.keys(user.preferences).length === 0) {
        console.log(`Migrating preferences for user: ${user.email}`);
        
        await prisma.user.update({
          where: { id: user.id },
          data: {
            preferences: defaultPreferences
          }
        });
      } else {
        console.log(`User ${user.email} already has preferences, skipping`);
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateUserPreferences()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateUserPreferences, defaultPreferences };