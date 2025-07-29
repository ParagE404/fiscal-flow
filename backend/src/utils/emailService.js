const nodemailer = require('nodemailer');

// Email configuration
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
};

// Create transporter
const createTransporter = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('Email service not configured. SMTP credentials missing.');
    return null;
  }

  return nodemailer.createTransporter(EMAIL_CONFIG);
};

/**
 * Send email verification email
 * @param {string} email - User email
 * @param {string} name - User name
 * @param {string} token - Verification token
 * @returns {Promise<boolean>} - Success status
 */
const sendVerificationEmail = async (email, name, token) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      // For development, just log the verification link
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${token}`;
      console.log(`\n📧 Email Verification Required for ${email}`);
      console.log(`🔗 Verification URL: ${verificationUrl}`);
      console.log(`👤 User: ${name}\n`);
      return true;
    }

    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${token}`;

    const mailOptions = {
      from: `"FiscalFlow" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Verify Your Email Address - FiscalFlow',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to FiscalFlow!</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>Thank you for registering with FiscalFlow, your personal finance dashboard.</p>
              <p>To complete your registration and start tracking your investments, please verify your email address by clicking the button below:</p>
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #e2e8f0; padding: 10px; border-radius: 4px;">
                ${verificationUrl}
              </p>
              <p><strong>This verification link will expire in 24 hours.</strong></p>
              <p>If you didn't create an account with FiscalFlow, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2025 FiscalFlow. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to FiscalFlow!
        
        Hi ${name},
        
        Thank you for registering with FiscalFlow, your personal finance dashboard.
        
        To complete your registration and start tracking your investments, please verify your email address by visiting this link:
        
        ${verificationUrl}
        
        This verification link will expire in 24 hours.
        
        If you didn't create an account with FiscalFlow, please ignore this email.
        
        © 2025 FiscalFlow. All rights reserved.
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${email}`);
    return true;

  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
};

/**
 * Send password reset email
 * @param {string} email - User email
 * @param {string} name - User name
 * @param {string} token - Reset token
 * @returns {Promise<boolean>} - Success status
 */
const sendPasswordResetEmail = async (email, name, token) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      // For development, just log the reset link
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;
      console.log(`\n🔐 Password Reset Request for ${email}`);
      console.log(`🔗 Reset URL: ${resetUrl}`);
      console.log(`👤 User: ${name}\n`);
      return true;
    }

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;

    const mailOptions = {
      from: `"FiscalFlow" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Reset Your Password - FiscalFlow',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
            .warning { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>We received a request to reset your password for your FiscalFlow account.</p>
              <p>Click the button below to reset your password:</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #e2e8f0; padding: 10px; border-radius: 4px;">
                ${resetUrl}
              </p>
              <div class="warning">
                <p><strong>⚠️ Important Security Information:</strong></p>
                <ul>
                  <li>This password reset link will expire in 1 hour</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>Your password will remain unchanged until you create a new one</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>© 2025 FiscalFlow. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Password Reset Request
        
        Hi ${name},
        
        We received a request to reset your password for your FiscalFlow account.
        
        Click this link to reset your password:
        ${resetUrl}
        
        Important Security Information:
        - This password reset link will expire in 1 hour
        - If you didn't request this reset, please ignore this email
        - Your password will remain unchanged until you create a new one
        
        © 2025 FiscalFlow. All rights reserved.
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${email}`);
    return true;

  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};