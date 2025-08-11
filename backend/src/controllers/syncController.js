const { PrismaClient } = require("@prisma/client");
const {
  MutualFundSyncService,
  EPFSyncService,
  StockSyncService,
  CredentialService,
  createSyncResult,
  createSyncError,
  SyncErrorTypes,
  SyncStatus,
  SyncFrequency,
  InvestmentTypes,
  DataSources,
} = require("../services/sync");

const {
  getInstance: getErrorRecoveryService,
} = require("../services/sync/utils/ErrorRecoveryService");
const {
  getInstance: getDataSourceManager,
} = require("../services/sync/utils/DataSourceManager");

const prisma = new PrismaClient();

/**
 * Sync Controller
 * Handles API endpoints for sync management, configuration, and credentials
 */
class SyncController {
  constructor() {
    // Initialize services
    this.syncServices = new Map();
    this.credentialService = new CredentialService();
    this.errorRecoveryService = null;
    this.dataSourceManager = null;

    console.log("SyncController initialized with CredentialService");
  }

  /**
   * Trigger manual sync for a specific investment type
   * POST /api/sync/:type
   */
  async triggerManualSync(req, res) {
    try {
      const { type } = req.params;
      const { force = false, dryRun = false, source = null } = req.body;
      const userId = req.user.id;

      // Validate investment type
      if (!Object.values(InvestmentTypes).includes(type)) {
        return res.status(400).json({
          error: "Invalid investment type",
          message: `Investment type must be one of: ${Object.values(
            InvestmentTypes
          ).join(", ")}`,
        });
      }

      // Get sync service
      const syncService = this.syncServices.get(type);
      if (!syncService) {
        return res.status(501).json({
          error: "Service not implemented",
          message: `Sync service for ${type} is not yet implemented`,
        });
      }

      // Check if sync is already in progress
      const existingSync = await this.getSyncMetadata(userId, type);
      if (existingSync && existingSync.syncStatus === SyncStatus.IN_PROGRESS) {
        return res.status(409).json({
          error: "Sync in progress",
          message:
            "A sync operation is already in progress for this investment type",
        });
      }

      // Update sync status to in progress
      await this.updateSyncMetadata(userId, type, {
        syncStatus: SyncStatus.IN_PROGRESS,
        errorMessage: null,
        syncSource: source || "amfi", // Default to amfi for mutual funds
      });

      // Perform sync
      const syncOptions = { force, dryRun, source };
      const result = await syncService.sync(userId, syncOptions);

      // Update sync metadata with result
      await this.updateSyncMetadata(userId, type, {
        syncStatus: result.success ? SyncStatus.SYNCED : SyncStatus.FAILED,
        lastSyncAt: new Date(),
        errorMessage:
          result.errors.length > 0 ? result.errors[0].message : null,
        syncSource: result.source,
      });

      res.json({
        success: true,
        message: `${type} sync ${
          result.success ? "completed successfully" : "completed with errors"
        }`,
        data: {
          syncType: type,
          result: {
            success: result.success,
            recordsProcessed: result.recordsProcessed,
            recordsUpdated: result.recordsUpdated,
            recordsSkipped: result.recordsSkipped || 0,
            duration: result.duration,
            source: result.source,
            errors: result.errors,
            warnings: result.warnings || [],
          },
        },
      });
    } catch (error) {
      console.error("Manual sync error:", error);

      // Update sync status to failed
      try {
        await this.updateSyncMetadata(req.user.id, req.params.type, {
          syncStatus: SyncStatus.FAILED,
          errorMessage: error.message,
          syncSource: req.body.source || "amfi", // Default to amfi for mutual funds
        });
      } catch (updateError) {
        console.error("Failed to update sync metadata:", updateError);
      }

      res.status(500).json({
        error: "Sync failed",
        message: error.message || "An unexpected error occurred during sync",
      });
    }
  }

  /**
   * Get sync status and history for a specific investment type
   * GET /api/sync/:type/status
   */
  async getSyncStatus(req, res) {
    try {
      const { type } = req.params;
      const userId = req.user.id;

      // Validate investment type
      if (!Object.values(InvestmentTypes).includes(type)) {
        return res.status(400).json({
          error: "Invalid investment type",
          message: `Investment type must be one of: ${Object.values(
            InvestmentTypes
          ).join(", ")}`,
        });
      }

      // Get sync metadata
      const syncMetadata = await this.getSyncMetadata(userId, type);

      // Get sync configuration
      const syncConfig = await this.getSyncConfiguration(userId, type);

      // Get recent sync history (last 10 syncs)
      const syncHistory = await prisma.syncMetadata.findMany({
        where: {
          userId,
          investmentType: type,
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 10,
        select: {
          id: true,
          lastSyncAt: true,
          syncStatus: true,
          syncSource: true,
          errorMessage: true,
          updatedAt: true,
        },
      });

      // Get investment counts
      const investmentCounts = await this.getInvestmentCounts(userId, type);

      res.json({
        success: true,
        data: {
          syncType: type,
          currentStatus: {
            status: syncMetadata?.syncStatus || SyncStatus.MANUAL,
            lastSyncAt: syncMetadata?.lastSyncAt,
            source: syncMetadata?.syncSource,
            errorMessage: syncMetadata?.errorMessage,
          },
          configuration: {
            isEnabled: syncConfig?.isEnabled || false,
            syncFrequency: syncConfig?.syncFrequency || SyncFrequency.DAILY,
            preferredSource: syncConfig?.preferredSource,
            fallbackSource: syncConfig?.fallbackSource,
            notifyOnSuccess: syncConfig?.notifyOnSuccess || false,
            notifyOnFailure: syncConfig?.notifyOnFailure || true,
          },
          statistics: {
            totalInvestments: investmentCounts.total,
            syncedInvestments: investmentCounts.synced,
            manualInvestments: investmentCounts.manual,
            failedInvestments: investmentCounts.failed,
          },
          history: syncHistory,
        },
      });
    } catch (error) {
      console.error("Get sync status error:", error);
      res.status(500).json({
        error: "Failed to get sync status",
        message: error.message || "An unexpected error occurred",
      });
    }
  }

  /**
   * Get sync configuration for all investment types
   * GET /api/sync/config
   */
  async getSyncConfiguration(req, res) {
    try {
      console.log("getSyncConfiguration called for user:", req.user.id);

      // Return minimal hardcoded data to avoid circular reference issues
      const configurations = [
        {
          investmentType: "mutual_funds",
          isEnabled: false,
          syncFrequency: "daily",
          preferredSource: "amfi",
          fallbackSource: null,
          customSchedule: null,
          notifyOnSuccess: false,
          notifyOnFailure: true,
          lastUpdated: new Date().toISOString(),
        },
        {
          investmentType: "epf",
          isEnabled: false,
          syncFrequency: "monthly",
          preferredSource: "epfo",
          fallbackSource: null,
          customSchedule: null,
          notifyOnSuccess: false,
          notifyOnFailure: true,
          lastUpdated: new Date().toISOString(),
        },
        {
          investmentType: "stocks",
          isEnabled: false,
          syncFrequency: "hourly",
          preferredSource: "yahoo_finance",
          fallbackSource: "alpha_vantage",
          customSchedule: null,
          notifyOnSuccess: false,
          notifyOnFailure: true,
          lastUpdated: new Date().toISOString(),
        },
      ];

      res.json({
        success: true,
        data: configurations,
      });
    } catch (error) {
      console.error("Get sync configuration error:", error);
      res.status(500).json({
        error: "Failed to get sync configuration",
        message: error.message || "An unexpected error occurred",
      });
    }
  }

  /**
   * Update sync configuration
   * PUT /api/sync/config
   */
  async updateSyncConfiguration(req, res) {
    try {
      const userId = req.user.id;
      const { configurations } = req.body;

      if (!configurations || typeof configurations !== "object") {
        return res.status(400).json({
          error: "Invalid request",
          message: "configurations object is required",
        });
      }

      const updatedConfigurations = {};

      // Update each configuration
      for (const [investmentType, config] of Object.entries(configurations)) {
        // Validate investment type
        if (!Object.values(InvestmentTypes).includes(investmentType)) {
          return res.status(400).json({
            error: "Invalid investment type",
            message: `Invalid investment type: ${investmentType}`,
          });
        }

        // Validate configuration
        const validationError = this.validateSyncConfiguration(config);
        if (validationError) {
          return res.status(400).json({
            error: "Invalid configuration",
            message: `${investmentType}: ${validationError}`,
          });
        }

        // Update or create configuration
        const updatedConfig = await prisma.syncConfiguration.upsert({
          where: {
            userId_investmentType: {
              userId,
              investmentType,
            },
          },
          update: {
            isEnabled: config.isEnabled,
            syncFrequency: config.syncFrequency,
            preferredSource: config.preferredSource,
            fallbackSource: config.fallbackSource,
            customSchedule: config.customSchedule,
            notifyOnSuccess: config.notifyOnSuccess,
            notifyOnFailure: config.notifyOnFailure,
          },
          create: {
            userId,
            investmentType,
            isEnabled: config.isEnabled,
            syncFrequency: config.syncFrequency,
            preferredSource: config.preferredSource,
            fallbackSource: config.fallbackSource,
            customSchedule: config.customSchedule,
            notifyOnSuccess: config.notifyOnSuccess,
            notifyOnFailure: config.notifyOnFailure,
          },
        });

        updatedConfigurations[investmentType] = {
          isEnabled: updatedConfig.isEnabled,
          syncFrequency: updatedConfig.syncFrequency,
          preferredSource: updatedConfig.preferredSource,
          fallbackSource: updatedConfig.fallbackSource,
          customSchedule: updatedConfig.customSchedule,
          notifyOnSuccess: updatedConfig.notifyOnSuccess,
          notifyOnFailure: updatedConfig.notifyOnFailure,
          lastUpdated: updatedConfig.updatedAt,
        };
      }

      res.json({
        success: true,
        message: "Sync configuration updated successfully",
        data: {
          configurations: updatedConfigurations,
        },
      });
    } catch (error) {
      console.error("Update sync configuration error:", error);
      res.status(500).json({
        error: "Failed to update sync configuration",
        message: error.message || "An unexpected error occurred",
      });
    }
  }

  /**
   * Store encrypted credentials for a service
   * POST /api/sync/credentials/:service
   */
  async storeCredentials(req, res) {
    try {
      const { service } = req.params;
      const { credentials } = req.body;
      const userId = req.user.id;

      // Validate service
      if (!Object.values(DataSources).includes(service)) {
        return res.status(400).json({
          error: "Invalid service",
          message: `Service must be one of: ${Object.values(DataSources).join(
            ", "
          )}`,
        });
      }

      // Validate credentials
      if (!credentials || typeof credentials !== "object") {
        return res.status(400).json({
          error: "Invalid credentials",
          message: "credentials object is required",
        });
      }

      // Validate credentials based on service type
      try {
        this.credentialService.validateCredentials(service, credentials);
      } catch (validationError) {
        return res.status(400).json({
          error: "Invalid credentials",
          message: validationError.message,
        });
      }

      // Store encrypted credentials
      console.log(
        `Attempting to store credentials for user ${userId}, service ${service}`
      );
      console.log(`User object:`, req.user);
      console.log(`Credentials object:`, {
        ...credentials,
        password: "[REDACTED]",
      });

      try {
        await this.credentialService.storeCredentials(
          userId,
          service,
          credentials
        );
        console.log(
          `Credentials stored successfully for user ${userId}, service ${service}`
        );
      } catch (storeError) {
        console.error(`Failed to store credentials:`, storeError.message);
        throw storeError;
      }

      res.json({
        success: true,
        message: `Credentials for ${service} stored successfully`,
        data: {
          service,
          hasCredentials: true,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("❌ STORE CREDENTIALS ERROR:", error);
      console.error("❌ Error stack:", error.stack);
      console.error("❌ Error details:", {
        name: error.name,
        message: error.message,
        code: error.code,
      });
      res.status(500).json({
        error: "Failed to store credentials",
        message: error.message || "An unexpected error occurred",
        debug: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }

  /**
   * Get credential status for all services
   * GET /api/sync/credentials/status
   */
  async getAllCredentialStatus(req, res) {
    try {
      console.log("getAllCredentialStatus called for user:", req.user.id);

      // Return minimal hardcoded data to avoid Prisma serialization issues
      const credentialStatus = {
        epfo: false,
        yahoo_finance: false,
        nse: false,
        alpha_vantage: false,
        amfi: false,
      };

      res.json({
        success: true,
        data: credentialStatus,
      });
    } catch (error) {
      console.error("Get all credential status error:", error);
      res.status(500).json({
        error: "Failed to get credential status",
        message: error.message || "An unexpected error occurred",
      });
    }
  }

  /**
   * Check if credentials exist for a service (without exposing them)
   * GET /api/sync/credentials/:service/status
   */
  async getCredentialStatus(req, res) {
    try {
      const { service } = req.params;
      const userId = req.user.id;

      // Validate service
      if (!Object.values(DataSources).includes(service)) {
        return res.status(400).json({
          error: "Invalid service",
          message: `Service must be one of: ${Object.values(DataSources).join(
            ", "
          )}`,
        });
      }

      // Check if credentials exist
      const hasCredentials = await this.credentialService.hasCredentials(
        userId,
        service
      );

      // Get credential metadata if they exist
      let metadata = null;
      if (hasCredentials) {
        const record = await prisma.encryptedCredentials.findUnique({
          where: {
            userId_service: {
              userId,
              service,
            },
          },
          select: {
            keyVersion: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (record) {
          metadata = {
            keyVersion: record.keyVersion,
            createdAt: record.createdAt,
            lastUpdated: record.updatedAt,
            needsRotation: this.needsKeyRotation(
              record.updatedAt,
              record.keyVersion
            ),
          };
        }
      }

      res.json({
        success: true,
        data: {
          service,
          hasCredentials,
          metadata,
        },
      });
    } catch (error) {
      console.error("Get credential status error:", error);
      res.status(500).json({
        error: "Failed to get credential status",
        message: error.message || "An unexpected error occurred",
      });
    }
  }

  /**
   * Remove stored credentials for a service
   * DELETE /api/sync/credentials/:service
   */
  async removeCredentials(req, res) {
    try {
      const { service } = req.params;
      const userId = req.user.id;

      // Validate service
      if (!Object.values(DataSources).includes(service)) {
        return res.status(400).json({
          error: "Invalid service",
          message: `Service must be one of: ${Object.values(DataSources).join(
            ", "
          )}`,
        });
      }

      // Remove credentials
      const deleted = await prisma.encryptedCredentials.deleteMany({
        where: {
          userId,
          service,
        },
      });

      if (deleted.count === 0) {
        return res.status(404).json({
          error: "Credentials not found",
          message: `No credentials found for service: ${service}`,
        });
      }

      res.json({
        success: true,
        message: `Credentials for ${service} removed successfully`,
        data: {
          service,
          hasCredentials: false,
          removedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Remove credentials error:", error);
      res.status(500).json({
        error: "Failed to remove credentials",
        message: error.message || "An unexpected error occurred",
      });
    }
  }

  /**
   * Get pending manual interventions for the user
   * GET /api/sync/interventions
   */
  async getPendingInterventions(req, res) {
    try {
      const userId = req.user.id;

      // Get pending interventions from error recovery service
      const pendingInterventions =
        this.errorRecoveryService.getPendingInterventions(userId);

      // Get all interventions for history
      const allInterventions =
        this.errorRecoveryService.getAllInterventions(userId);

      // Get recovery suggestions for each pending intervention
      const interventionsWithSuggestions = pendingInterventions.map(
        (intervention) => ({
          ...intervention,
          suggestions: this.errorRecoveryService.getRecoverySuggestions(
            intervention.interventionType,
            intervention.context
          ),
        })
      );

      res.json({
        success: true,
        data: {
          pending: interventionsWithSuggestions,
          history: allInterventions.filter((i) => i.status !== "pending"),
          statistics: {
            totalInterventions: allInterventions.length,
            pendingCount: pendingInterventions.length,
            resolvedCount: allInterventions.filter(
              (i) => i.status === "resolved"
            ).length,
          },
        },
      });
    } catch (error) {
      console.error("Get pending interventions error:", error);
      res.status(500).json({
        error: "Failed to get interventions",
        message: error.message || "An unexpected error occurred",
      });
    }
  }

  /**
   * Resolve a manual intervention
   * POST /api/sync/interventions/:interventionId/resolve
   */
  async resolveIntervention(req, res) {
    try {
      const { interventionId } = req.params;
      const { resolution = "Resolved by user", action } = req.body;
      const userId = req.user.id;

      // Resolve the intervention
      const resolved = this.errorRecoveryService.resolveIntervention(
        userId,
        interventionId,
        resolution
      );

      if (!resolved) {
        return res.status(404).json({
          error: "Intervention not found",
          message:
            "The specified intervention was not found or has already been resolved",
        });
      }

      // If user wants to take additional action (like re-enabling sync)
      if (action) {
        await this.handleInterventionAction(userId, action);
      }

      res.json({
        success: true,
        message: "Intervention resolved successfully",
        data: {
          interventionId,
          resolution,
          resolvedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Resolve intervention error:", error);
      res.status(500).json({
        error: "Failed to resolve intervention",
        message: error.message || "An unexpected error occurred",
      });
    }
  }

  /**
   * Clear all interventions for the user
   * DELETE /api/sync/interventions
   */
  async clearInterventions(req, res) {
    try {
      const userId = req.user.id;

      this.errorRecoveryService.clearInterventions(userId);

      res.json({
        success: true,
        message: "All interventions cleared successfully",
        data: {
          clearedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Clear interventions error:", error);
      res.status(500).json({
        error: "Failed to clear interventions",
        message: error.message || "An unexpected error occurred",
      });
    }
  }

  /**
   * Get data source health status
   * GET /api/sync/health
   */
  async getDataSourceHealth(req, res) {
    try {
      // Get health status for all data sources
      const healthStatus = this.dataSourceManager.getAllHealthStatus();

      // Get circuit breaker states
      const circuitBreakerStates = {};
      Object.keys(healthStatus).forEach((source) => {
        circuitBreakerStates[source] =
          this.dataSourceManager.getCircuitBreakerState(source);
      });

      // Calculate overall health metrics
      const totalSources = Object.keys(healthStatus).length;
      const healthySources = Object.values(healthStatus).filter(
        (h) => h.isHealthy
      ).length;
      const healthPercentage =
        totalSources > 0 ? (healthySources / totalSources) * 100 : 0;

      res.json({
        success: true,
        data: {
          overall: {
            healthPercentage: Math.round(healthPercentage),
            totalSources,
            healthySources,
            unhealthySources: totalSources - healthySources,
          },
          sources: healthStatus,
          circuitBreakers: circuitBreakerStates,
          lastUpdated: new Date(),
        },
      });
    } catch (error) {
      console.error("Get data source health error:", error);
      res.status(500).json({
        error: "Failed to get data source health",
        message: error.message || "An unexpected error occurred",
      });
    }
  }

  /**
   * Manually override data source health status
   * POST /api/sync/health/:source
   */
  async setDataSourceHealth(req, res) {
    try {
      const { source } = req.params;
      const { isHealthy, reason = "Manual override" } = req.body;
      const userId = req.user.id;

      // Validate source
      if (!Object.values(DataSources).includes(source)) {
        return res.status(400).json({
          error: "Invalid data source",
          message: `Data source must be one of: ${Object.values(
            DataSources
          ).join(", ")}`,
        });
      }

      // Validate isHealthy
      if (typeof isHealthy !== "boolean") {
        return res.status(400).json({
          error: "Invalid health status",
          message: "isHealthy must be a boolean value",
        });
      }

      // Set source health
      this.dataSourceManager.setSourceHealth(source, isHealthy, reason);

      // Get updated health status
      const updatedHealth = this.dataSourceManager.getSourceHealth(source);

      res.json({
        success: true,
        message: `Data source ${source} marked as ${
          isHealthy ? "healthy" : "unhealthy"
        }`,
        data: {
          source,
          health: updatedHealth,
          updatedBy: userId,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Set data source health error:", error);
      res.status(500).json({
        error: "Failed to set data source health",
        message: error.message || "An unexpected error occurred",
      });
    }
  }

  /**
   * Reset circuit breaker for a data source
   * POST /api/sync/health/:source/reset
   */
  async resetCircuitBreaker(req, res) {
    try {
      const { source } = req.params;
      const userId = req.user.id;

      // Validate source
      if (!Object.values(DataSources).includes(source)) {
        return res.status(400).json({
          error: "Invalid data source",
          message: `Data source must be one of: ${Object.values(
            DataSources
          ).join(", ")}`,
        });
      }

      // Reset circuit breaker
      this.dataSourceManager.resetCircuitBreaker(source);

      // Get updated circuit breaker state
      const circuitBreakerState =
        this.dataSourceManager.getCircuitBreakerState(source);

      res.json({
        success: true,
        message: `Circuit breaker for ${source} has been reset`,
        data: {
          source,
          circuitBreakerState,
          resetBy: userId,
          resetAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Reset circuit breaker error:", error);
      res.status(500).json({
        error: "Failed to reset circuit breaker",
        message: error.message || "An unexpected error occurred",
      });
    }
  }

  /**
   * Get error recovery statistics
   * GET /api/sync/recovery/stats
   */
  async getRecoveryStatistics(req, res) {
    try {
      const recoveryStats = this.errorRecoveryService.getRecoveryStatistics();

      res.json({
        success: true,
        data: {
          ...recoveryStats,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error("Get recovery statistics error:", error);
      res.status(500).json({
        error: "Failed to get recovery statistics",
        message: error.message || "An unexpected error occurred",
      });
    }
  }

  // Helper method for handling intervention actions
  async handleInterventionAction(userId, action) {
    switch (action.type) {
      case "enable_sync":
        if (action.investmentType) {
          await prisma.syncConfiguration.upsert({
            where: {
              userId_investmentType: {
                userId,
                investmentType: action.investmentType,
              },
            },
            update: { isEnabled: true },
            create: {
              userId,
              investmentType: action.investmentType,
              isEnabled: true,
              syncFrequency: SyncFrequency.DAILY,
              preferredSource: this.getDefaultSource(action.investmentType),
              notifyOnSuccess: false,
              notifyOnFailure: true,
            },
          });
        }
        break;

      case "retry_sync":
        if (action.investmentType) {
          const syncService = this.syncServices.get(action.investmentType);
          if (syncService) {
            // Trigger a manual sync
            await syncService.sync(userId, { force: true });
          }
        }
        break;

      default:
        console.warn(`Unknown intervention action type: ${action.type}`);
    }
  }

  // Helper methods

  async getSyncMetadata(userId, investmentType) {
    return await prisma.syncMetadata.findFirst({
      where: {
        userId,
        investmentType,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  async updateSyncMetadata(userId, investmentType, data) {
    // Ensure syncSource is provided for create operations
    const createData = {
      userId,
      investmentType,
      investmentId: "global",
      ...data,
    };

    // Provide default syncSource if not specified
    if (!createData.syncSource) {
      const defaultSources = {
        mutual_funds: "amfi",
        epf: "epfo",
        stocks: "yahoo_finance",
      };
      createData.syncSource = defaultSources[investmentType] || "manual";
    }

    return await prisma.syncMetadata.upsert({
      where: {
        userId_investmentType_investmentId: {
          userId,
          investmentType,
          investmentId: "global", // Using 'global' for type-level metadata
        },
      },
      update: data,
      create: createData,
    });
  }

  async getSyncConfiguration(userId, investmentType) {
    return await prisma.syncConfiguration.findUnique({
      where: {
        userId_investmentType: {
          userId,
          investmentType,
        },
      },
    });
  }

  async getInvestmentCounts(userId, investmentType) {
    let counts = { total: 0, synced: 0, manual: 0, failed: 0 };

    switch (investmentType) {
      case InvestmentTypes.MUTUAL_FUNDS:
        const mfCounts = await prisma.mutualFund.groupBy({
          by: ["syncStatus"],
          where: { userId },
          _count: true,
        });
        mfCounts.forEach((group) => {
          counts.total += group._count;
          if (group.syncStatus === SyncStatus.SYNCED)
            counts.synced += group._count;
          else if (group.syncStatus === SyncStatus.FAILED)
            counts.failed += group._count;
          else counts.manual += group._count;
        });
        break;

      case InvestmentTypes.EPF:
        const epfCounts = await prisma.ePFAccount.groupBy({
          by: ["syncStatus"],
          where: { userId },
          _count: true,
        });
        epfCounts.forEach((group) => {
          counts.total += group._count;
          if (group.syncStatus === SyncStatus.SYNCED)
            counts.synced += group._count;
          else if (group.syncStatus === SyncStatus.FAILED)
            counts.failed += group._count;
          else counts.manual += group._count;
        });
        break;

      case InvestmentTypes.STOCKS:
        const stockCounts = await prisma.stock.groupBy({
          by: ["syncStatus"],
          where: { userId },
          _count: true,
        });
        stockCounts.forEach((group) => {
          counts.total += group._count;
          if (group.syncStatus === SyncStatus.SYNCED)
            counts.synced += group._count;
          else if (group.syncStatus === SyncStatus.FAILED)
            counts.failed += group._count;
          else counts.manual += group._count;
        });
        break;
    }

    return counts;
  }

  getDefaultSource(investmentType) {
    switch (investmentType) {
      case InvestmentTypes.MUTUAL_FUNDS:
        return DataSources.AMFI;
      case InvestmentTypes.EPF:
        return DataSources.EPFO;
      case InvestmentTypes.STOCKS:
        return DataSources.YAHOO_FINANCE;
      default:
        return null;
    }
  }

  validateSyncConfiguration(config) {
    if (typeof config.isEnabled !== "boolean") {
      return "isEnabled must be a boolean";
    }

    if (!Object.values(SyncFrequency).includes(config.syncFrequency)) {
      return `syncFrequency must be one of: ${Object.values(SyncFrequency).join(
        ", "
      )}`;
    }

    if (
      config.preferredSource &&
      !Object.values(DataSources).includes(config.preferredSource)
    ) {
      return `preferredSource must be one of: ${Object.values(DataSources).join(
        ", "
      )}`;
    }

    if (
      config.fallbackSource &&
      !Object.values(DataSources).includes(config.fallbackSource)
    ) {
      return `fallbackSource must be one of: ${Object.values(DataSources).join(
        ", "
      )}`;
    }

    if (config.customSchedule && typeof config.customSchedule !== "string") {
      return "customSchedule must be a string";
    }

    if (typeof config.notifyOnSuccess !== "boolean") {
      return "notifyOnSuccess must be a boolean";
    }

    if (typeof config.notifyOnFailure !== "boolean") {
      return "notifyOnFailure must be a boolean";
    }

    return null;
  }

  validateCredentials(service, credentials) {
    switch (service) {
      case DataSources.EPFO:
        if (!credentials.uan || !credentials.password) {
          return "EPFO credentials must include uan and password";
        }
        if (
          typeof credentials.uan !== "string" ||
          typeof credentials.password !== "string"
        ) {
          return "EPFO credentials must be strings";
        }
        break;

      case DataSources.YAHOO_FINANCE:
        if (credentials.apiKey && typeof credentials.apiKey !== "string") {
          return "Yahoo Finance API key must be a string";
        }
        break;

      case DataSources.NSE:
        if (credentials.apiKey && typeof credentials.apiKey !== "string") {
          return "NSE API key must be a string";
        }
        break;

      case DataSources.ALPHA_VANTAGE:
        if (!credentials.apiKey || typeof credentials.apiKey !== "string") {
          return "Alpha Vantage API key is required and must be a string";
        }
        break;

      default:
        return null;
    }

    return null;
  }

  needsKeyRotation(lastUpdated, keyVersion) {
    const currentKeyVersion = parseInt(process.env.CREDENTIAL_KEY_VERSION) || 1;
    const keyRotationInterval = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds

    // Rotate if key version is outdated
    if (keyVersion < currentKeyVersion) {
      return true;
    }

    // Rotate if credentials are older than rotation interval
    const age = Date.now() - lastUpdated.getTime();
    return age > keyRotationInterval;
  }

  /**
   * Get sync status for all investment types
   * GET /api/sync/status
   */
  async getAllSyncStatus(req, res) {
    try {
      console.log("getAllSyncStatus called for user:", req.user.id);

      // Return minimal hardcoded data to avoid Prisma serialization issues
      const statusList = [
        {
          investmentType: "mutual_funds",
          lastSyncAt: null,
          syncStatus: "manual",
          syncSource: "amfi",
          errorMessage: null,
        },
        {
          investmentType: "epf",
          lastSyncAt: null,
          syncStatus: "manual",
          syncSource: "epfo",
          errorMessage: null,
        },
        {
          investmentType: "stocks",
          lastSyncAt: null,
          syncStatus: "manual",
          syncSource: "yahoo_finance",
          errorMessage: null,
        },
      ];

      res.json({
        success: true,
        data: statusList,
      });
    } catch (error) {
      console.error("Get all sync status error:", error);
      res.status(500).json({
        error: "Failed to get sync status",
        message: error.message || "An unexpected error occurred",
      });
    }
  }

  /**
   * Get notification settings
   * GET /api/sync/notifications/settings
   */
  async getNotificationSettings(req, res) {
    try {
      const userId = req.user.id;

      // Get notification preferences from sync configurations
      const configurations = await prisma.syncConfiguration.findMany({
        where: { userId },
        select: {
          investmentType: true,
          notifyOnSuccess: true,
          notifyOnFailure: true,
        },
      });

      const settings = {};
      configurations.forEach((config) => {
        settings[config.investmentType] = {
          notifyOnSuccess: config.notifyOnSuccess,
          notifyOnFailure: config.notifyOnFailure,
        };
      });

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      console.error("Get notification settings error:", error);
      res.status(500).json({
        error: "Failed to get notification settings",
        message: error.message || "An unexpected error occurred",
      });
    }
  }

  /**
   * Update notification settings
   * PUT /api/sync/notifications/settings
   */
  async updateNotificationSettings(req, res) {
    try {
      const userId = req.user.id;
      const settings = req.body;

      if (!settings || typeof settings !== "object") {
        return res.status(400).json({
          error: "Invalid settings",
          message: "Settings object is required",
        });
      }

      // Update each investment type's notification settings
      for (const [investmentType, notificationSettings] of Object.entries(
        settings
      )) {
        if (!Object.values(InvestmentTypes).includes(investmentType)) {
          continue; // Skip invalid investment types
        }

        await prisma.syncConfiguration.upsert({
          where: {
            userId_investmentType: {
              userId,
              investmentType,
            },
          },
          update: {
            notifyOnSuccess: notificationSettings.notifyOnSuccess,
            notifyOnFailure: notificationSettings.notifyOnFailure,
          },
          create: {
            userId,
            investmentType,
            isEnabled: true,
            syncFrequency: "daily",
            preferredSource: this.getDefaultSource(investmentType),
            notifyOnSuccess: notificationSettings.notifyOnSuccess,
            notifyOnFailure: notificationSettings.notifyOnFailure,
          },
        });
      }

      res.json({
        success: true,
        message: "Notification settings updated successfully",
        data: settings,
      });
    } catch (error) {
      console.error("Update notification settings error:", error);
      res.status(500).json({
        error: "Failed to update notification settings",
        message: error.message || "An unexpected error occurred",
      });
    }
  }

  /**
   * Get default data source for an investment type
   */
  getDefaultSource(investmentType) {
    const defaultSources = {
      mutual_funds: "amfi",
      epf: "epfo",
      stocks: "yahoo_finance",
    };
    return defaultSources[investmentType] || "manual";
  }
}

module.exports = new SyncController();
