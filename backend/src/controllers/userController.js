const { PrismaClient } = require('@prisma/client');
const { hashPassword, comparePassword, validatePassword } = require('../utils/auth');
const { logProfileEvent, logSecurityEvent } = require('../utils/auditLog');
const { z } = require('zod');

const prisma = new PrismaClient();

// Validation schemas
const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  avatar: z.string().optional().nullable()
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
});

const updatePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  currency: z.object({
    code: z.string().default('INR'),
    symbol: z.string().default('₹'),
    format: z.enum(['indian', 'international']).default('indian')
  }).optional(),
  numberFormat: z.object({
    style: z.enum(['indian', 'international']).default('indian'),
    decimalPlaces: z.number().min(0).max(4).default(2)
  }).optional(),
  autoRefreshPrices: z.boolean().optional(),
  pushNotifications: z.object({
    enabled: z.boolean().default(false),
    sipReminders: z.boolean().default(false),
    fdMaturityAlerts: z.boolean().default(false),
    portfolioUpdates: z.boolean().default(false)
  }).optional(),
  dashboard: z.object({
    defaultView: z.enum(['overview', 'detailed']).default('overview'),
    showWelcomeMessage: z.boolean().default(true),
    compactMode: z.boolean().default(false)
  }).optional(),
  onboarding: z.object({
    completed: z.boolean().default(false),
    skippedSteps: z.array(z.string()).default([]),
    lastCompletedStep: z.string().optional()
  }).optional()
});

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

/**
 * Get user profile
 */
const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        isEmailVerified: true,
        lastLogin: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
        // Include portfolio counts for profile stats
        _count: {
          select: {
            mutualFunds: true,
            fixedDeposits: true,
            epfAccounts: true,
            stocks: true,
            sips: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    // Merge user preferences with defaults
    const userPreferences = user.preferences || {};
    const mergedPreferences = mergePreferences(defaultPreferences, userPreferences);

    res.json({
      user: {
        ...user,
        preferences: mergedPreferences,
        portfolioStats: {
          totalInvestments: user._count.mutualFunds + user._count.fixedDeposits + user._count.epfAccounts + user._count.stocks,
          mutualFunds: user._count.mutualFunds,
          fixedDeposits: user._count.fixedDeposits,
          epfAccounts: user._count.epfAccounts,
          stocks: user._count.stocks,
          activeSIPs: user._count.sips
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get user profile'
    });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    // Validate input
    const validatedData = updateProfileSchema.parse(req.body);
    const updateData = {};

    // Check if there's anything to update
    if (Object.keys(validatedData).length === 0) {
      return res.status(400).json({
        error: 'No data to update',
        message: 'Please provide at least one field to update'
      });
    }

    // Handle name update
    if (validatedData.name) {
      updateData.name = validatedData.name.trim();
    }

    // Handle avatar update
    if (validatedData.hasOwnProperty('avatar')) {
      updateData.avatar = validatedData.avatar;
    }

    // Handle email update
    if (validatedData.email) {
      const newEmail = validatedData.email.toLowerCase();
      
      // Check if email is different from current
      if (newEmail !== req.user.email) {
        // Check if new email is already taken
        const existingUser = await prisma.user.findUnique({
          where: { email: newEmail }
        });

        if (existingUser) {
          return res.status(409).json({
            error: 'Email already exists',
            message: 'An account with this email address already exists'
          });
        }

        updateData.email = newEmail;
        // Reset email verification if email is changed
        updateData.isEmailVerified = false;
        updateData.emailVerificationToken = require('../utils/auth').generateRandomToken();
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        isEmailVerified: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // If email was changed, send verification email
    if (updateData.email && updateData.emailVerificationToken) {
      const { sendVerificationEmail } = require('../utils/emailService');
      await sendVerificationEmail(updateData.email, updatedUser.name, updateData.emailVerificationToken);
      
      // Log email change
      await logProfileEvent.emailChanged(req.user.id, req.user.email, updateData.email, req);
    }

    // Log profile update
    await logProfileEvent.profileUpdated(req.user.id, Object.keys(updateData), req);

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
      emailVerificationRequired: !!updateData.emailVerificationToken
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid input data',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update profile'
    });
  }
};

/**
 * Change password
 */
const changePassword = async (req, res) => {
  try {
    // Validate input
    const validatedData = changePasswordSchema.parse(req.body);
    const { currentPassword, newPassword } = validatedData;

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Password validation failed',
        message: 'New password does not meet requirements',
        details: passwordValidation.errors
      });
    }

    // Get current user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'Invalid current password',
        message: 'The current password you entered is incorrect'
      });
    }

    // Check if new password is different from current
    const isSamePassword = await comparePassword(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        error: 'Same password',
        message: 'New password must be different from your current password'
      });
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        loginAttempts: 0, // Reset login attempts
        lockUntil: null   // Clear any account locks
      }
    });

    // Log password change
    await logProfileEvent.passwordChanged(req.user.id, req);

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid input data',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to change password'
    });
  }
};

/**
 * Export user data for account deletion
 */
const exportUserData = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all user data
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        mutualFunds: true,
        fixedDeposits: true,
        epfAccounts: true,
        stocks: true,
        sips: true
      }
    });

    if (!userData) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    // Remove sensitive data
    const { password, emailVerificationToken, passwordResetToken, ...safeUserData } = userData;

    // Format data for export
    const exportData = {
      profile: {
        name: safeUserData.name,
        email: safeUserData.email,
        isEmailVerified: safeUserData.isEmailVerified,
        lastLogin: safeUserData.lastLogin,
        createdAt: safeUserData.createdAt,
        updatedAt: safeUserData.updatedAt
      },
      investments: {
        mutualFunds: safeUserData.mutualFunds,
        fixedDeposits: safeUserData.fixedDeposits,
        epfAccounts: safeUserData.epfAccounts,
        stocks: safeUserData.stocks,
        sips: safeUserData.sips
      },
      exportedAt: new Date().toISOString()
    };

    res.json({
      message: 'User data exported successfully',
      data: exportData
    });

  } catch (error) {
    console.error('Export user data error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to export user data'
    });
  }
};

/**
 * Delete user account
 */
const deleteAccount = async (req, res) => {
  try {
    const { password, confirmDelete } = req.body;

    if (!password || confirmDelete !== 'DELETE') {
      return res.status(400).json({
        error: 'Confirmation required',
        message: 'Password and confirmation text "DELETE" are required'
      });
    }

    // Get current user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        error: 'Invalid password',
        message: 'The password you entered is incorrect'
      });
    }

    // Log account deletion request
    await logSecurityEvent.accountDeletionRequested(user.id, user.email, req);

    // Delete user account (this will cascade delete all related data)
    await prisma.user.delete({
      where: { id: user.id }
    });

    // Log account deletion completion
    await logSecurityEvent.accountDeleted(user.id, user.email, req);

    res.json({
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete account'
    });
  }
};

/**
 * Get account security info
 */
const getSecurityInfo = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
        lastLogin: true,
        loginAttempts: true,
        lockUntil: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    res.json({
      security: {
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin,
        accountCreated: user.createdAt,
        lastUpdated: user.updatedAt,
        accountStatus: {
          isLocked: user.lockUntil && user.lockUntil > new Date(),
          lockUntil: user.lockUntil,
          failedLoginAttempts: user.loginAttempts
        }
      }
    });

  } catch (error) {
    console.error('Get security info error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get security information'
    });
  }
};

/**
 * Get user preferences
 */
const getPreferences = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        preferences: true
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    // Merge user preferences with defaults
    const userPreferences = user.preferences || {};
    const mergedPreferences = mergePreferences(defaultPreferences, userPreferences);

    res.json({
      preferences: mergedPreferences
    });

  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get user preferences'
    });
  }
};

/**
 * Update user preferences
 */
const updatePreferences = async (req, res) => {
  try {
    // Validate input
    const validatedData = updatePreferencesSchema.parse(req.body);

    // Get current user preferences
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        preferences: true
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    // Merge current preferences with updates
    const currentPreferences = user.preferences || {};
    const updatedPreferences = mergePreferences(currentPreferences, validatedData);

    // Update user preferences
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        preferences: updatedPreferences
      },
      select: {
        preferences: true,
        updatedAt: true
      }
    });

    // Merge with defaults for response
    const finalPreferences = mergePreferences(defaultPreferences, updatedUser.preferences);

    // Log preference update
    await logProfileEvent.preferencesUpdated(req.user.id, Object.keys(validatedData), req);

    res.json({
      message: 'Preferences updated successfully',
      preferences: finalPreferences,
      updatedAt: updatedUser.updatedAt
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid preference data',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    console.error('Update preferences error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update preferences'
    });
  }
};

/**
 * Reset user preferences to defaults
 */
const resetPreferences = async (req, res) => {
  try {
    // Update user preferences to defaults
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        preferences: defaultPreferences
      },
      select: {
        preferences: true,
        updatedAt: true
      }
    });

    // Log preference reset
    await logProfileEvent.preferencesReset(req.user.id, req);

    res.json({
      message: 'Preferences reset to defaults successfully',
      preferences: defaultPreferences,
      updatedAt: updatedUser.updatedAt
    });

  } catch (error) {
    console.error('Reset preferences error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to reset preferences'
    });
  }
};

/**
 * Helper function to deep merge preferences
 */
const mergePreferences = (defaults, userPrefs) => {
  const result = { ...defaults };
  
  for (const key in userPrefs) {
    if (userPrefs[key] !== null && typeof userPrefs[key] === 'object' && !Array.isArray(userPrefs[key])) {
      result[key] = mergePreferences(defaults[key] || {}, userPrefs[key]);
    } else {
      result[key] = userPrefs[key];
    }
  }
  
  return result;
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  getSecurityInfo,
  exportUserData,
  getPreferences,
  updatePreferences,
  resetPreferences
};