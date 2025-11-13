import { Router } from 'express';
import disputeController from '../controllers/dispute.controller';
import { authenticate, requireAdmin } from '../middlewares/auth';
import { validate, validatePagination } from '../middlewares/validate';
import {
  createDisputeValidation,
  addEvidenceValidation,
  addMessageValidation,
  disputeIdValidation,
  assignDisputeValidation,
  updatePriorityValidation,
  resolveDisputeValidation,
  getDisputesValidation,
} from '../validations/dispute.validation';

const router = Router();

// ==================== USER DISPUTE ROUTES ====================

/**
 * @route   POST /api/v1/disputes
 * @desc    Create dispute
 * @access  Private (Client or Vendor)
 */
router.post(
  '/',
  authenticate,
  validate(createDisputeValidation),
  disputeController.createDispute
);

/**
 * @route   GET /api/v1/disputes/my-disputes
 * @desc    Get user disputes
 * @access  Private
 */
router.get(
  '/my-disputes',
  authenticate,
  validatePagination,
  validate(getDisputesValidation),
  disputeController.getUserDisputes
);

/**
 * @route   GET /api/v1/disputes/:disputeId
 * @desc    Get dispute by ID
 * @access  Private (Parties involved or Admin)
 */
router.get(
  '/:disputeId',
  authenticate,
  validate(disputeIdValidation),
  disputeController.getDisputeById
);

/**
 * @route   POST /api/v1/disputes/:disputeId/evidence
 * @desc    Add evidence to dispute
 * @access  Private (Parties involved)
 */
router.post(
  '/:disputeId/evidence',
  authenticate,
  validate([...disputeIdValidation, ...addEvidenceValidation]),
  disputeController.addEvidence
);

/**
 * @route   POST /api/v1/disputes/:disputeId/messages
 * @desc    Add message to dispute
 * @access  Private (Parties involved or Admin)
 */
router.post(
  '/:disputeId/messages',
  authenticate,
  validate([...disputeIdValidation, ...addMessageValidation]),
  disputeController.addMessage
);

// ==================== ADMIN DISPUTE ROUTES ====================

/**
 * @route   GET /api/v1/disputes
 * @desc    Get all disputes (Admin)
 * @access  Private (Admin)
 */
router.get(
  '/',
  authenticate,
  requireAdmin,
  validatePagination,
  validate(getDisputesValidation),
  disputeController.getAllDisputes
);

/**
 * @route   GET /api/v1/disputes/stats
 * @desc    Get dispute statistics (Admin)
 * @access  Private (Admin)
 */
router.get(
  '/stats',
  authenticate,
  requireAdmin,
  disputeController.getDisputeStats
);

/**
 * @route   POST /api/v1/disputes/:disputeId/assign
 * @desc    Assign dispute to admin (Admin)
 * @access  Private (Admin)
 */
router.post(
  '/:disputeId/assign',
  authenticate,
  requireAdmin,
  validate([...disputeIdValidation, ...assignDisputeValidation]),
  disputeController.assignDispute
);

/**
 * @route   PUT /api/v1/disputes/:disputeId/priority
 * @desc    Update dispute priority (Admin)
 * @access  Private (Admin)
 */
router.put(
  '/:disputeId/priority',
  authenticate,
  requireAdmin,
  validate([...disputeIdValidation, ...updatePriorityValidation]),
  disputeController.updatePriority
);

/**
 * @route   POST /api/v1/disputes/:disputeId/resolve
 * @desc    Resolve dispute (Admin)
 * @access  Private (Admin)
 */
router.post(
  '/:disputeId/resolve',
  authenticate,
  requireAdmin,
  validate([...disputeIdValidation, ...resolveDisputeValidation]),
  disputeController.resolveDispute
);

/**
 * @route   POST /api/v1/disputes/:disputeId/close
 * @desc    Close dispute (Admin)
 * @access  Private (Admin)
 */
router.post(
  '/:disputeId/close',
  authenticate,
  requireAdmin,
  validate(disputeIdValidation),
  disputeController.closeDispute
);

export default router;
