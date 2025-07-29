const { PrismaClient } = require('@prisma/client');
const { 
  hashPassword, 
  comparePassword, 
  generateToken, 
  generateRandomToken, 
  validatePassword,
  isAccountLocked,
  getLockDuration
} = require('../utils/auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/emailService');
const { logAuthEvent, logEmailEvent } = require('../utils/auditLog');
const { z } = require('zod');

const prisma = new PrismaClient();

// Validation schemas
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

/**
 * Register a new user
 */
const register = async (req, res) => {
  try {
    // Validate input
    const validatedData = registerSchema.parse(req.body);
    const { name, email, password } = validatedData;

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Password validation failed',
        message: 'Password does not meet requirements',
        details: passwordValidation.errors
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'An account with this email address already exists'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate email verification token
    const emailVerificationToken = generateRandomToken();

    // Create user
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase(),
        password: hashedPassword,
        emailVerificationToken,
        isEmailVerified: false
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        isEmailVerified: true,
        createdAt: true
      }
    });

    // Generate JWT token
    const token = generateToken(user);

    // Send verification email
    await sendVerificationEmail(email, name, emailVerificationToken);

    // Log audit event
    await logAuthEvent.registration(user.id, user.email, req);

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token,
      requiresEmailVerification: true
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

    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to register user'
    });
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  try {
    // Validate input
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Check if account is locked
    if (isAccountLocked(user)) {
      const lockTimeRemaining = Math.ceil((user.lockUntil - new Date()) / (1000 * 60));
      return res.status(423).json({
        error: 'Account locked',
        message: `Account is locked due to multiple failed login attempts. Try again in ${lockTimeRemaining} minutes.`
      });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      // Increment login attempts
      const newAttempts = user.loginAttempts + 1;
      const updateData = { loginAttempts: newAttempts };

      // Lock account if too many attempts
      if (newAttempts >= 3) {
        const lockDuration = getLockDuration(newAttempts);
        updateData.lockUntil = new Date(Date.now() + lockDuration * 60 * 1000);
        
        // Log account lockout
        await logAuthEvent.accountLocked(user.id, user.email, newAttempts, req);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData
      });

      // Log failed login attempt
      await logAuthEvent.loginFailed(email, 'Invalid password', req);

      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password',
        attemptsRemaining: Math.max(0, 3 - newAttempts)
      });
    }

    // Reset login attempts on successful login
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockUntil: null,
        lastLogin: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        isEmailVerified: true,
        lastLogin: true,
        createdAt: true
      }
    });

    // Generate JWT token
    const token = generateToken(updatedUser);

    // Log successful login
    await logAuthEvent.loginSuccess(updatedUser.id, updatedUser.email, req);

    res.json({
      message: 'Login successful',
      user: updatedUser,
      token
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

    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to login'
    });
  }
};

/**
 * Logout user (client-side token invalidation)
 */
const logout = async (req, res) => {
  try {
    // In a JWT-based system, logout is primarily handled client-side
    // by removing the token. We can optionally log the logout event.
    
    if (req.user) {
      // Log logout event
      await logAuthEvent.logout(req.user.id, req);
    }

    res.json({
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to logout'
    });
  }
};

/**
 * Get current user info
 */
const getCurrentUser = async (req, res) => {
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
      user
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get user information'
    });
  }
};

/**
 * Send email verification
 */
const sendEmailVerification = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        error: 'Email already verified',
        message: 'Your email address is already verified'
      });
    }

    // Generate new verification token
    const emailVerificationToken = generateRandomToken();

    // Update user with new token
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationToken }
    });

    // Send verification email
    const emailSent = await sendVerificationEmail(user.email, user.name, emailVerificationToken);

    if (!emailSent) {
      return res.status(500).json({
        error: 'Email sending failed',
        message: 'Failed to send verification email. Please try again later.'
      });
    }

    // Log email verification sent
    await logEmailEvent.verificationSent(user.id, user.email, req);

    res.json({
      message: 'Verification email sent successfully',
      email: user.email
    });

  } catch (error) {
    console.error('Send email verification error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to send verification email'
    });
  }
};

/**
 * Verify email with token
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Verification token is required'
      });
    }

    // Find user with this verification token
    const user = await prisma.user.findFirst({
      where: { 
        emailVerificationToken: token,
        isEmailVerified: false
      }
    });

    if (!user) {
      return res.status(400).json({
        error: 'Invalid or expired token',
        message: 'The verification link is invalid or has expired. Please request a new verification email.'
      });
    }

    // Update user as verified
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        isEmailVerified: true,
        createdAt: true
      }
    });

    // Generate new token with updated verification status
    const newToken = generateToken(updatedUser);

    // Log email verification completed
    await logEmailEvent.emailVerified(updatedUser.id, updatedUser.email, req);

    res.json({
      message: 'Email verified successfully',
      user: updatedUser,
      token: newToken
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to verify email'
    });
  }
};

/**
 * Request password reset
 */
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email required',
        message: 'Email address is required'
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Generate password reset token
    const resetToken = generateRandomToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Update user with reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires
      }
    });

    // Send password reset email
    const emailSent = await sendPasswordResetEmail(user.email, user.name, resetToken);

    if (!emailSent) {
      console.error('Failed to send password reset email to:', user.email);
    } else {
      // Log password reset request
      await logEmailEvent.passwordResetRequested(user.id, user.email, req);
    }

    res.json({
      message: 'If an account with that email exists, a password reset link has been sent'
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process password reset request'
    });
  }
};

/**
 * Reset password with token
 */
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Reset token and new password are required'
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Password validation failed',
        message: 'Password does not meet requirements',
        details: passwordValidation.errors
      });
    }

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        error: 'Invalid or expired token',
        message: 'The password reset link is invalid or has expired. Please request a new one.'
      });
    }

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update user with new password and clear reset token
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        loginAttempts: 0, // Reset login attempts
        lockUntil: null   // Clear any account locks
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        isEmailVerified: true,
        updatedAt: true
      }
    });

    // Generate new JWT token
    const newToken = generateToken(updatedUser);

    // Log password reset completion
    await logEmailEvent.passwordResetCompleted(updatedUser.id, updatedUser.email, req);

    res.json({
      message: 'Password reset successfully',
      user: updatedUser,
      token: newToken
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to reset password'
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
  sendEmailVerification,
  verifyEmail,
  requestPasswordReset,
  resetPassword
};