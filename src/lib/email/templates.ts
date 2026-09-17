export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export const EmailTemplates = {
  welcome: (userName: string, siteName: string): EmailTemplate => ({
    subject: `Welcome to ${siteName}!`,
    html: `
      <div style="font-family: system-ui, sans-serif; line-height: 1.6; color: #333;">
        <h2>Welcome to ${siteName}, ${userName}!</h2>
        <p>Thank you for signing up. Your account has been created successfully.</p>
        <p>To get started, please check your email for verification instructions.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 0.9em; color: #666;">
          If you didn't create this account, please ignore this email.
        </p>
      </div>
    `,
    text: `Welcome to ${siteName}, ${userName}!\n\nThank you for signing up. Your account has been created successfully.\n\nIf you didn't create this account, please ignore this email.`,
  }),

  resetPassword: (resetUrl: string, siteName: string): EmailTemplate => ({
    subject: `Reset your ${siteName} password`,
    html: `
      <div style="font-family: system-ui, sans-serif; line-height: 1.6; color: #333;">
        <h2>Reset Your Password</h2>
        <p>We received a request to reset your password for your ${siteName} account.</p>
        <p>Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
        <p>This link will expire in 1 hour for security reasons.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 0.9em; color: #666;">
          © ${new Date().getFullYear()} ${siteName}. All rights reserved.
        </p>
      </div>
    `,
    text: `Reset your ${siteName} password\n\nWe received a request to reset your password for your ${siteName} account.\n\nClick the link below to set a new password:\n${resetUrl}\n\nIf you didn't request a password reset, please ignore this email or contact support if you have concerns.\n\nThis link will expire in 1 hour for security reasons.\n\n© ${new Date().getFullYear()} ${siteName}. All rights reserved.`,
  }),

  emailVerification: (verificationUrl: string, siteName: string): EmailTemplate => ({
    subject: `Verify your email for ${siteName}`,
    html: `
      <div style="font-family: system-ui, sans-serif; line-height: 1.6; color: #333;">
        <h2>Verify Your Email Address</h2>
        <p>Thanks for signing up for ${siteName}! Please verify your email address to complete your registration.</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${verificationUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Verify Email Address
          </a>
        </div>
        <p>If you didn't create an account with ${siteName}, please ignore this email.</p>
        <p>This link will expire in 24 hours.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 0.9em; color: #666;">
          © ${new Date().getFullYear()} ${siteName}. All rights reserved.
        </p>
      </div>
    `,
    text: `Verify your email for ${siteName}\n\nThanks for signing up for ${siteName}! Please verify your email address to complete your registration.\n\nClick the link below to verify your email:\n${verificationUrl}\n\nIf you didn't create an account with ${siteName}, please ignore this email.\n\nThis link will expire in 24 hours.\n\n© ${new Date().getFullYear()} ${siteName}. All rights reserved.`,
  }),
};