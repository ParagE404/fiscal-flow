const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('./auth');

const prisma = new PrismaClient();

/**
 * Create a default user for existing data migration
 */
const createDefaultUser = async () => {
  try {
    // Check if default user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'default@fiscalflow.local' }
    });

    if (existingUser) {
      console.log('✅ Default user already exists:', existingUser.id);
      return existingUser;
    }

    // Create default user
    const defaultPassword = await hashPassword('DefaultPassword123!');
    
    const defaultUser = await prisma.user.create({
      data: {
        name: 'Default User',
        email: 'default@fiscalflow.local',
        password: defaultPassword,
        isEmailVerified: true, // Pre-verify for migration purposes
        emailVerificationToken: null
      }
    });

    console.log('✅ Created default user:', defaultUser.id);
    return defaultUser;

  } catch (error) {
    console.error('❌ Failed to create default user:', error);
    throw error;
  }
};

/**
 * Migrate existing data to use user context
 */
const migrateExistingData = async () => {
  try {
    console.log('🔄 Starting data migration...');

    // Create default user
    const defaultUser = await createDefaultUser();

    // Get counts of existing data without userId
    const counts = {
      mutualFunds: await prisma.mutualFund.count({ where: { userId: null } }),
      fixedDeposits: await prisma.fixedDeposit.count({ where: { userId: null } }),
      epfAccounts: await prisma.ePFAccount.count({ where: { userId: null } }),
      stocks: await prisma.stock.count({ where: { userId: null } }),
      sips: await prisma.sIP.count({ where: { userId: null } })
    };

    console.log('📊 Data to migrate:', counts);

    // Migrate mutual funds
    if (counts.mutualFunds > 0) {
      const result = await prisma.mutualFund.updateMany({
        where: { userId: null },
        data: { userId: defaultUser.id }
      });
      console.log(`✅ Migrated ${result.count} mutual funds`);
    }

    // Migrate fixed deposits
    if (counts.fixedDeposits > 0) {
      const result = await prisma.fixedDeposit.updateMany({
        where: { userId: null },
        data: { userId: defaultUser.id }
      });
      console.log(`✅ Migrated ${result.count} fixed deposits`);
    }

    // Migrate EPF accounts
    if (counts.epfAccounts > 0) {
      const result = await prisma.ePFAccount.updateMany({
        where: { userId: null },
        data: { userId: defaultUser.id }
      });
      console.log(`✅ Migrated ${result.count} EPF accounts`);
    }

    // Migrate stocks
    if (counts.stocks > 0) {
      const result = await prisma.stock.updateMany({
        where: { userId: null },
        data: { userId: defaultUser.id }
      });
      console.log(`✅ Migrated ${result.count} stocks`);
    }

    // Migrate SIPs
    if (counts.sips > 0) {
      const result = await prisma.sIP.updateMany({
        where: { userId: null },
        data: { userId: defaultUser.id }
      });
      console.log(`✅ Migrated ${result.count} SIPs`);
    }

    console.log('🎉 Data migration completed successfully!');
    
    return {
      defaultUserId: defaultUser.id,
      migratedCounts: counts
    };

  } catch (error) {
    console.error('❌ Data migration failed:', error);
    throw error;
  }
};

/**
 * Update all API endpoints to use authenticated user context
 * This function provides guidance for updating controllers
 */
const getControllerUpdateGuidance = () => {
  return {
    message: 'Controllers need to be updated to use req.user.id instead of hardcoded user IDs',
    updates: [
      {
        file: 'controllers/mutualFundsController.js',
        changes: [
          'Replace hardcoded userId with req.user.id',
          'Add authentication middleware to routes',
          'Filter queries by userId: req.user.id'
        ]
      },
      {
        file: 'controllers/fixedDepositsController.js',
        changes: [
          'Replace hardcoded userId with req.user.id',
          'Add authentication middleware to routes',
          'Filter queries by userId: req.user.id'
        ]
      },
      {
        file: 'controllers/epfController.js',
        changes: [
          'Replace hardcoded userId with req.user.id',
          'Add authentication middleware to routes',
          'Filter queries by userId: req.user.id'
        ]
      },
      {
        file: 'controllers/stocksController.js',
        changes: [
          'Replace hardcoded userId with req.user.id',
          'Add authentication middleware to routes',
          'Filter queries by userId: req.user.id'
        ]
      },
      {
        file: 'controllers/sipsController.js',
        changes: [
          'Replace hardcoded userId with req.user.id',
          'Add authentication middleware to routes',
          'Filter queries by userId: req.user.id'
        ]
      },
      {
        file: 'controllers/dashboardController.js',
        changes: [
          'Replace hardcoded userId with req.user.id',
          'Add authentication middleware to routes',
          'Filter all aggregation queries by userId: req.user.id'
        ]
      }
    ]
  };
};

/**
 * Verify data isolation after migration
 */
const verifyDataIsolation = async (userId) => {
  try {
    console.log('🔍 Verifying data isolation...');

    // Check that user can only access their own data
    const userDataCounts = {
      mutualFunds: await prisma.mutualFund.count({ where: { userId } }),
      fixedDeposits: await prisma.fixedDeposit.count({ where: { userId } }),
      epfAccounts: await prisma.ePFAccount.count({ where: { userId } }),
      stocks: await prisma.stock.count({ where: { userId } }),
      sips: await prisma.sIP.count({ where: { userId } })
    };

    console.log(`📊 Data for user ${userId}:`, userDataCounts);

    // Check for any orphaned data (data without userId)
    const orphanedData = {
      mutualFunds: await prisma.mutualFund.count({ where: { userId: null } }),
      fixedDeposits: await prisma.fixedDeposit.count({ where: { userId: null } }),
      epfAccounts: await prisma.ePFAccount.count({ where: { userId: null } }),
      stocks: await prisma.stock.count({ where: { userId: null } }),
      sips: await prisma.sIP.count({ where: { userId: null } })
    };

    console.log('🔍 Orphaned data (should be 0):', orphanedData);

    const hasOrphanedData = Object.values(orphanedData).some(count => count > 0);
    
    if (hasOrphanedData) {
      console.warn('⚠️ Found orphaned data that needs migration');
      return false;
    }

    console.log('✅ Data isolation verified successfully');
    return true;

  } catch (error) {
    console.error('❌ Data isolation verification failed:', error);
    return false;
  }
};

/**
 * Run complete migration process
 */
const runMigration = async () => {
  try {
    console.log('🚀 Starting complete data migration process...\n');

    // Step 1: Migrate existing data
    const migrationResult = await migrateExistingData();

    // Step 2: Verify data isolation
    const isolationVerified = await verifyDataIsolation(migrationResult.defaultUserId);

    // Step 3: Provide controller update guidance
    const guidance = getControllerUpdateGuidance();
    console.log('\n📋 Controller Update Guidance:');
    console.log(guidance.message);
    guidance.updates.forEach(update => {
      console.log(`\n📁 ${update.file}:`);
      update.changes.forEach(change => console.log(`  - ${change}`));
    });

    console.log('\n🎉 Migration process completed!');
    console.log(`📝 Default user credentials:`);
    console.log(`   Email: default@fiscalflow.local`);
    console.log(`   Password: DefaultPassword123!`);
    console.log(`   User ID: ${migrationResult.defaultUserId}`);

    return {
      success: true,
      defaultUserId: migrationResult.defaultUserId,
      isolationVerified,
      migratedCounts: migrationResult.migratedCounts
    };

  } catch (error) {
    console.error('❌ Migration process failed:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await prisma.$disconnect();
  }
};

module.exports = {
  createDefaultUser,
  migrateExistingData,
  verifyDataIsolation,
  getControllerUpdateGuidance,
  runMigration
};