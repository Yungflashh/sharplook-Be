"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nodemailer_1 = __importDefault(require("nodemailer"));
const handlebars_1 = __importDefault(require("handlebars"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../utils/logger"));
const types_1 = require("../types");
class EmailService {
    constructor() {
        this.transporter = nodemailer_1.default.createTransport({
            host: config_1.default.email.host,
            port: config_1.default.email.port,
            secure: config_1.default.email.secure,
            auth: {
                user: config_1.default.email.user,
                pass: config_1.default.email.password,
            },
        });
        this.templates = new Map();
        this.loadTemplates();
    }
    /**
     * Load email templates
     */
    loadTemplates() {
        const templatesDir = path_1.default.join(__dirname, '../templates/email');
        // Create templates directory if it doesn't exist
        if (!fs_1.default.existsSync(templatesDir)) {
            fs_1.default.mkdirSync(templatesDir, { recursive: true });
        }
    }
    /**
     * Get or compile template
     */
    getTemplate(templateName) {
        if (this.templates.has(templateName)) {
            return this.templates.get(templateName);
        }
        const templatePath = path_1.default.join(__dirname, '../templates/email', `${templateName}.hbs`);
        if (fs_1.default.existsSync(templatePath)) {
            const templateSource = fs_1.default.readFileSync(templatePath, 'utf-8');
            const template = handlebars_1.default.compile(templateSource);
            this.templates.set(templateName, template);
            return template;
        }
        // Return default template if file doesn't exist
        return handlebars_1.default.compile(this.getDefaultTemplate(templateName));
    }
    /**
     * Get default template HTML
     */
    getDefaultTemplate(_templateName) {
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
    async sendEmail(to, subject, template, data) {
        try {
            const compiledTemplate = this.getTemplate(template);
            const html = compiledTemplate({
                ...data,
                appName: config_1.default.app.name,
                supportEmail: config_1.default.app.supportEmail,
                year: new Date().getFullYear(),
                subject,
            });
            await this.transporter.sendMail({
                from: config_1.default.email.from,
                to,
                subject,
                html,
            });
            logger_1.default.info(`Email sent successfully to ${to}: ${subject}`);
            return true;
        }
        catch (error) {
            logger_1.default.error('Error sending email:', error);
            return false;
        }
    }
    /**
     * Send welcome email
     */
    async sendWelcomeEmail(email, firstName, verificationToken) {
        const verificationUrl = verificationToken
            ? `${config_1.default.urls.frontend}/verify-email?token=${verificationToken}`
            : null;
        return this.sendEmail(email, 'Welcome to SharpLook!', types_1.EmailTemplate.WELCOME, {
            firstName,
            verificationUrl,
            body: `
        <h2>Welcome aboard, ${firstName}! 🎉</h2>
        <p>We're thrilled to have you join the SharpLook community.</p>
        ${verificationUrl
                ? `
          <p>To get started, please verify your email address by clicking the button below:</p>
          <a href="${verificationUrl}" class="button">Verify Email</a>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p><small>This link will expire in 24 hours.</small></p>
        `
                : ''}
        <p>If you didn't create this account, please ignore this email.</p>
      `,
        });
    }
    /**
     * Send email verification
     */
    async sendVerificationEmail(email, firstName, verificationToken) {
        const verificationUrl = `${config_1.default.urls.frontend}/verify-email?token=${verificationToken}`;
        return this.sendEmail(email, 'Verify Your Email Address', types_1.EmailTemplate.VERIFICATION, {
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
        });
    }
    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(email, firstName, resetToken) {
        const resetUrl = `${config_1.default.urls.frontend}/reset-password?token=${resetToken}`;
        return this.sendEmail(email, 'Reset Your Password', types_1.EmailTemplate.PASSWORD_RESET, {
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
    async sendLoginNotification(email, firstName, ipAddress, userAgent) {
        return this.sendEmail(email, 'New Login to Your Account', types_1.EmailTemplate.LOGIN, {
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
    async sendVerificationSuccessEmail(email, firstName) {
        return this.sendEmail(email, 'Email Verified Successfully', types_1.EmailTemplate.VERIFICATION, {
            firstName,
            body: `
          <h2>Email Verified! ✅</h2>
          <p>Hi ${firstName},</p>
          <p>Your email address has been successfully verified. You now have full access to all SharpLook features.</p>
          <a href="${config_1.default.urls.frontend}/dashboard" class="button">Go to Dashboard</a>
        `,
        });
    }
    /**
     * Verify email configuration
     */
    async verifyConnection() {
        try {
            await this.transporter.verify();
            logger_1.default.info('Email service is ready');
            return true;
        }
        catch (error) {
            logger_1.default.error('Email service verification failed:', error);
            return false;
        }
    }
}
exports.default = new EmailService();
//# sourceMappingURL=email.service.js.map