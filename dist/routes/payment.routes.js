"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_controller_1 = require("../controllers/payment.controller");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const payment_validation_1 = require("../validations/payment.validation");
const router = (0, express_1.Router)();
// ==================== PAYMENT ROUTES ====================
/**
 * @route   POST /api/v1/payments/initialize
 * @desc    Initialize payment for booking
 * @access  Private (Client)
 */
router.post('/initialize', auth_1.authenticate, (0, validate_1.validate)(payment_validation_1.initializePaymentValidation), payment_controller_1.paymentController.initializePayment);
/**
 * @route   GET /api/v1/payments/verify/:reference
 * @desc    Verify payment
 * @access  Public (called by Paystack callback)
 */
router.get('/verify/:reference', (0, validate_1.validate)(payment_validation_1.paymentReferenceValidation), payment_controller_1.paymentController.verifyPayment);
/**
 * @route   POST /api/v1/payments/webhook
 * @desc    Paystack webhook handler
 * @access  Public (Paystack only)
 */
router.post('/webhook', payment_controller_1.paymentController.handleWebhook);
/**
 * @route   GET /api/v1/payments/my-payments
 * @desc    Get user payments
 * @access  Private
 */
router.get('/my-payments', auth_1.authenticate, validate_1.validatePagination, payment_controller_1.paymentController.getUserPayments);
/**
 * @route   GET /api/v1/payments/:paymentId
 * @desc    Get payment by ID
 * @access  Private
 */
router.get('/:paymentId', auth_1.authenticate, (0, validate_1.validate)(payment_validation_1.paymentIdValidation), payment_controller_1.paymentController.getPaymentById);
// ==================== WALLET ROUTES ====================
/**
 * @route   GET /api/v1/wallet/balance
 * @desc    Get wallet balance
 * @access  Private
 */
router.get('/wallet/balance', auth_1.authenticate, payment_controller_1.walletController.getBalance);
/**
 * @route   GET /api/v1/wallet/transactions
 * @desc    Get wallet transactions
 * @access  Private
 */
router.get('/wallet/transactions', auth_1.authenticate, validate_1.validatePagination, (0, validate_1.validate)(payment_validation_1.getTransactionsValidation), payment_controller_1.walletController.getTransactions);
/**
 * @route   GET /api/v1/wallet/stats
 * @desc    Get wallet statistics
 * @access  Private
 */
router.get('/wallet/stats', auth_1.authenticate, payment_controller_1.walletController.getWalletStats);
/**
 * @route   POST /api/v1/wallet/withdraw
 * @desc    Request withdrawal
 * @access  Private (Vendor)
 */
router.post('/wallet/withdraw', auth_1.authenticate, auth_1.requireVendor, (0, validate_1.validate)(payment_validation_1.withdrawalRequestValidation), payment_controller_1.walletController.requestWithdrawal);
/**
 * @route   GET /api/v1/wallet/withdrawals/my-withdrawals
 * @desc    Get user withdrawals
 * @access  Private (Vendor)
 */
router.get('/wallet/withdrawals/my-withdrawals', auth_1.authenticate, auth_1.requireVendor, validate_1.validatePagination, payment_controller_1.walletController.getUserWithdrawals);
/**
 * @route   GET /api/v1/wallet/withdrawals/:withdrawalId
 * @desc    Get withdrawal by ID
 * @access  Private
 */
router.get('/wallet/withdrawals/:withdrawalId', auth_1.authenticate, (0, validate_1.validate)(payment_validation_1.withdrawalIdValidation), payment_controller_1.walletController.getWithdrawalById);
// ==================== ADMIN WITHDRAWAL ROUTES ====================
/**
 * @route   GET /api/v1/wallet/withdrawals
 * @desc    Get all withdrawals (Admin)
 * @access  Private (Financial Admin)
 */
router.get('/wallet/withdrawals', auth_1.authenticate, auth_1.requireFinancialAdmin, validate_1.validatePagination, (0, validate_1.validate)(payment_validation_1.getWithdrawalsValidation), payment_controller_1.walletController.getAllWithdrawals);
/**
 * @route   POST /api/v1/wallet/withdrawals/:withdrawalId/process
 * @desc    Process withdrawal (Admin)
 * @access  Private (Financial Admin)
 */
router.post('/wallet/withdrawals/:withdrawalId/process', auth_1.authenticate, auth_1.requireFinancialAdmin, (0, validate_1.validate)(payment_validation_1.withdrawalIdValidation), payment_controller_1.walletController.processWithdrawal);
/**
 * @route   POST /api/v1/wallet/withdrawals/:withdrawalId/reject
 * @desc    Reject withdrawal (Admin)
 * @access  Private (Financial Admin)
 */
router.post('/wallet/withdrawals/:withdrawalId/reject', auth_1.authenticate, auth_1.requireFinancialAdmin, (0, validate_1.validate)([...payment_validation_1.withdrawalIdValidation, ...payment_validation_1.rejectWithdrawalValidation]), payment_controller_1.walletController.rejectWithdrawal);
exports.default = router;
//# sourceMappingURL=payment.routes.js.map