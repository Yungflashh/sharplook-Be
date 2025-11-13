import { EmailTemplate } from '../types';
declare class EmailService {
    private transporter;
    private templates;
    constructor();
    /**
     * Load email templates
     */
    private loadTemplates;
    /**
     * Get or compile template
     */
    private getTemplate;
    /**
     * Get default template HTML
     */
    private getDefaultTemplate;
    /**
     * Send email
     */
    sendEmail(to: string, subject: string, template: EmailTemplate, data: any): Promise<boolean>;
    /**
     * Send welcome email
     */
    sendWelcomeEmail(email: string, firstName: string, verificationToken?: string): Promise<boolean>;
    /**
     * Send email verification
     */
    sendVerificationEmail(email: string, firstName: string, verificationToken: string): Promise<boolean>;
    /**
     * Send password reset email
     */
    sendPasswordResetEmail(email: string, firstName: string, resetToken: string): Promise<boolean>;
    /**
     * Send login notification email
     */
    sendLoginNotification(email: string, firstName: string, ipAddress: string, userAgent: string): Promise<boolean>;
    /**
     * Send account verification success email
     */
    sendVerificationSuccessEmail(email: string, firstName: string): Promise<boolean>;
    /**
     * Verify email configuration
     */
    verifyConnection(): Promise<boolean>;
}
declare const _default: EmailService;
export default _default;
//# sourceMappingURL=email.service.d.ts.map