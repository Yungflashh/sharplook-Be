import { Router } from 'express';
import { paymentController, walletController } from '../controllers/payment.controller';
import { authenticate, requireVendor, requireFinancialAdmin } from '../middlewares/auth';
import { validate, validatePagination } from '../middlewares/validate';
import {
  initializePaymentValidation,
  paymentReferenceValidation,
  paymentIdValidation,
  withdrawalRequestValidation,
  withdrawalIdValidation,
  rejectWithdrawalValidation,
  getTransactionsValidation,
  getWithdrawalsValidation,
} from '../validations/payment.validation';

const router = Router();

// ==================== PAYMENT ROUTES ====================

/**
 * @route   POST /api/v1/payments/initialize
 * @desc    Initialize payment for booking
 * @access  Private (Client)
 */
router.post(
  '/initialize',
  authenticate,
  validate(initializePaymentValidation),
  paymentController.initializePayment
);

/**
 * @route   GET /api/v1/payments/verify/:reference
 * @desc    Verify payment
 * @access  Public (called by Paystack callback)
 */
router.get(
  '/verify/:reference',
  validate(paymentReferenceValidation),
  paymentController.verifyPayment
);

/**
 * @route   POST /api/v1/payments/webhook
 * @desc    Paystack webhook handler
 * @access  Public (Paystack only)
 */
router.post('/webhook', paymentController.handleWebhook);

/**
 * @route   GET /api/v1/payments/my-payments
 * @desc    Get user payments
 * @access  Private
 */
router.get(
  '/my-payments',
  authenticate,
  validatePagination,
  paymentController.getUserPayments
);

/**
 * @route   GET /api/v1/payments/:paymentId
 * @desc    Get payment by ID
 * @access  Private
 */
router.get(
  '/:paymentId',
  authenticate,
  validate(paymentIdValidation),
  paymentController.getPaymentById
);

// ==================== WALLET ROUTES ====================

/**
 * @route   GET /api/v1/wallet/balance
 * @desc    Get wallet balance
 * @access  Private
 */
router.get('/wallet/balance', authenticate, walletController.getBalance);

/**
 * @route   GET /api/v1/wallet/transactions
 * @desc    Get wallet transactions
 * @access  Private
 */
router.get(
  '/wallet/transactions',
  authenticate,
  validatePagination,
  validate(getTransactionsValidation),
  walletController.getTransactions
);

/**
 * @route   GET /api/v1/wallet/stats
 * @desc    Get wallet statistics
 * @access  Private
 */
router.get('/wallet/stats', authenticate, walletController.getWalletStats);

/**
 * @route   POST /api/v1/wallet/withdraw
 * @desc    Request withdrawal
 * @access  Private (Vendor)
 */
router.post(
  '/wallet/withdraw',
  authenticate,
  requireVendor,
  validate(withdrawalRequestValidation),
  walletController.requestWithdrawal
);

/**
 * @route   GET /api/v1/wallet/withdrawals/my-withdrawals
 * @desc    Get user withdrawals
 * @access  Private (Vendor)
 */
router.get(
  '/wallet/withdrawals/my-withdrawals',
  authenticate,
  requireVendor,
  validatePagination,
  walletController.getUserWithdrawals
);

/**
 * @route   GET /api/v1/wallet/withdrawals/:withdrawalId
 * @desc    Get withdrawal by ID
 * @access  Private
 */
router.get(
  '/wallet/withdrawals/:withdrawalId',
  authenticate,
  validate(withdrawalIdValidation),
  walletController.getWithdrawalById
);

// ==================== ADMIN WITHDRAWAL ROUTES ====================

/**
 * @route   GET /api/v1/wallet/withdrawals
 * @desc    Get all withdrawals (Admin)
 * @access  Private (Financial Admin)
 */
router.get(
  '/wallet/withdrawals',
  authenticate,
  requireFinancialAdmin,
  validatePagination,
  validate(getWithdrawalsValidation),
  walletController.getAllWithdrawals
);

/**
 * @route   POST /api/v1/wallet/withdrawals/:withdrawalId/process
 * @desc    Process withdrawal (Admin)
 * @access  Private (Financial Admin)
 */
router.post(
  '/wallet/withdrawals/:withdrawalId/process',
  authenticate,
  requireFinancialAdmin,
  validate(withdrawalIdValidation),
  walletController.processWithdrawal
);

/**
 * @route   POST /api/v1/wallet/withdrawals/:withdrawalId/reject
 * @desc    Reject withdrawal (Admin)
 * @access  Private (Financial Admin)
 */
router.post(
  '/wallet/withdrawals/:withdrawalId/reject',
  authenticate,
  requireFinancialAdmin,
  validate([...withdrawalIdValidation, ...rejectWithdrawalValidation]),
  walletController.rejectWithdrawal
);

export default router;
