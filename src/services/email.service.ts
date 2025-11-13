import nodemailer, { Transporter } from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import config from '../config';
import logger from '../utils/logger';
import { EmailTemplate } from '../types';

class EmailService {
  private transporter: Transporter;
  private templates: Map<EmailTemplate, handlebars.TemplateDelegate>;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });

    this.templates = new Map();
    this.loadTemplates();
  }

  /**
   * Load email templates
   */
  private loadTemplates(): void {
    const templatesDir = path.join(__dirname, '../templates/email');
    
    // Create templates directory if it doesn't exist
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }
  }

  /**
   * Get or compile template
   */
  private getTemplate(templateName: EmailTemplate): handlebars.TemplateDelegate {
    if (this.templates.has(templateName)) {
      return this.templates.get(templateName)!;
    }

    const templatePath = path.join(__dirname, '../templates/email', `${templateName}.hbs`);
    
    if (fs.existsSync(templatePath)) {
      const templateSource = fs.readFileSync(templatePath, 'utf-8');
      const template = handlebars.compile(templateSource);
      this.templates.set(templateName, template);
      return template;
    }

    // Return default template if file doesn't exist
    return handlebars.compile(this.getDefaultTemplate(templateName));
  }

  /**
   * Get default template HTML
   */
  private getDefaultTemplate(_templateName: EmailTemplate): string {
    const baseTemplate = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>{{subject}}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>{{appName}}</h1>
            </div>
            <div class="content">
              {{body}}
            </div>
            <div class="footer">
              <p>© {{year}} {{appName}}. All rights reserved.</p>
              <p>{{supportEmail}}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return baseTemplate;
  }

  /**
   * Send email
   */
  public async sendEmail(
    to: string,
    subject: string,
    template: EmailTemplate,
    data: any
  ): Promise<boolean> {
    try {
      const compiledTemplate = this.getTemplate(template);
      const html = compiledTemplate({
        ...data,
        appName: config.app.name,
        supportEmail: config.app.supportEmail,
        year: new Date().getFullYear(),
        subject,
      });

      await this.transporter.sendMail({
        from: config.email.from,
        to,
        subject,
        html,
      });

      logger.info(`Email sent successfully to ${to}: ${subject}`);
      return true;
    } catch (error) {
      logger.error('Error sending email:', error);
      return false;
    }
  }

  /**
   * Send welcome email
   */
  public async sendWelcomeEmail(
    email: string,
    firstName: string,
    verificationToken?: string
  ): Promise<boolean> {
    const verificationUrl = verificationToken
      ? `${config.urls.frontend}/verify-email?token=${verificationToken}`
      : null;

    return this.sendEmail(email, 'Welcome to SharpLook!', EmailTemplate.WELCOME, {
      firstName,
      verificationUrl,
      body: `
        <h2>Welcome aboard, ${firstName}! 🎉</h2>
        <p>We're thrilled to have you join the SharpLook community.</p>
        ${
          verificationUrl
            ? `
          <p>To get started, please verify your email address by clicking the button below:</p>
          <a href="${verificationUrl}" class="button">Verify Email</a>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p><small>This link will expire in 24 hours.</small></p>
        `
            : ''
        }
        <p>If you didn't create this account, please ignore this email.</p>
      `,
    });
  }

  /**
   * Send email verification
   */
  public async sendVerificationEmail(
    email: string,
    firstName: string,
    verificationToken: string
  ): Promise<boolean> {
    const verificationUrl = `${config.urls.frontend}/verify-email?token=${verificationToken}`;

    return this.sendEmail(
      email,
      'Verify Your Email Address',
      EmailTemplate.VERIFICATION,
      {
        firstName,
        verificationUrl,
        body: `
         <h2>Verify Your Email Address</h2>
<p>Hi ${firstName},</p>
<p>Please use the following One-Time Password (OTP) to verify your email address:</p>

<div style="font-size: 24px; font-weight: bold; margin: 20px 0; padding: 10px; background-color: #f0f0f0; text-align: center; border-radius: 5px;">
  ${verificationUrl}
</div>

<p>Enter this code in the app to complete your verification.</p>
<p><small>This OTP will expire in 10 minutes.</small></p>

        `,
      }
    );
  }

  /**
   * Send password reset email
   */
  public async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetToken: string
  ): Promise<boolean> {
    const resetUrl = `${config.urls.frontend}/reset-password?token=${resetToken}`;

    return this.sendEmail(email, 'Reset Your Password', EmailTemplate.PASSWORD_RESET, {
      firstName,
      resetUrl,
      body: `
        <h2>Reset Your Password</h2>
        <p>Hi ${firstName},</p>
        <p>We received a request to reset your password. Click the button below to set a new password:</p>
        <a href="${resetUrl}" class="button">Reset Password</a>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p><small>This link will expire in 1 hour.</small></p>
        <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
      `,
    });
  }

  /**
   * Send login notification email
   */
  public async sendLoginNotification(
    email: string,
    firstName: string,
    ipAddress: string,
    userAgent: string
  ): Promise<boolean> {
    return this.sendEmail(email, 'New Login to Your Account', EmailTemplate.LOGIN, {
      firstName,
      ipAddress,
      userAgent,
      timestamp: new Date().toLocaleString(),
      body: `
        <h2>New Login Detected</h2>
        <p>Hi ${firstName},</p>
        <p>We detected a new login to your account:</p>
        <ul>
          <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
          <li><strong>IP Address:</strong> ${ipAddress}</li>
          <li><strong>Device:</strong> ${userAgent}</li>
        </ul>
        <p>If this was you, you can safely ignore this email.</p>
        <p>If you don't recognize this activity, please secure your account immediately by changing your password.</p>
      `,
    });
  }

  /**
   * Send account verification success email
   */
  public async sendVerificationSuccessEmail(
    email: string,
    firstName: string
  ): Promise<boolean> {
    return this.sendEmail(
      email,
      'Email Verified Successfully',
      EmailTemplate.VERIFICATION,
      {
        firstName,
        body: `
          <h2>Email Verified! ✅</h2>
          <p>Hi ${firstName},</p>
          <p>Your email address has been successfully verified. You now have full access to all SharpLook features.</p>
          <a href="${config.urls.frontend}/dashboard" class="button">Go to Dashboard</a>
        `,
      }
    );
  }

  /**
   * Verify email configuration
   */
  public async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('Email service is ready');
      return true;
    } catch (error) {
      logger.error('Email service verification failed:', error);
      return false;
    }
  }
}

export default new EmailService();
