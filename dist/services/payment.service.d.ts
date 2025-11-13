import { IPayment } from '../models/Payment';
declare class PaymentService {
    private paystackSecretKey;
    private paystackBaseUrl;
    constructor();
    /**
     * Initialize payment for booking
     */
    initializePayment(userId: string, bookingId: string, metadata?: any): Promise<{
        payment: IPayment;
        authorizationUrl: string;
        accessCode: string;
    }>;
    /**
     * Verify Paystack payment webhook
     */
    verifyWebhookSignature(payload: string, signature: string): boolean;
    /**
     * Handle Paystack webhook
     */
    handlePaystackWebhook(event: any): Promise<void>;
    /**
     * Handle successful payment
     */
    private handleSuccessfulPayment;
    /**
     * Verify payment manually
     */
    verifyPayment(reference: string): Promise<IPayment>;
    /**
     * Release payment to vendor
     */
    releasePayment(bookingId: string): Promise<IPayment>;
    /**
     * Refund payment
     */
    refundPayment(bookingId: string, refundedBy: string, reason?: string): Promise<IPayment>;
    /**
     * Get payment by ID
     */
    getPaymentById(paymentId: string): Promise<IPayment>;
    /**
     * Get user payments
     */
    getUserPayments(userId: string, page?: number, limit?: number): Promise<{
        payments: IPayment[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Handle successful transfer (withdrawal)
     */
    private handleSuccessfulTransfer;
    /**
     * Handle failed transfer
     */
    private handleFailedTransfer;
}
declare const _default: PaymentService;
export default _default;
//# sourceMappingURL=payment.service.d.ts.map