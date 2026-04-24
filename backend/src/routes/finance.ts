import express from "express";
import { authenticateToken, authorizeRole } from "../middleware/auth.js";
import * as feeStructureController from "../controllers/finance/feeStructureController.js";
import * as invoiceController from "../controllers/finance/invoiceController.js";
import * as paymentController from "../controllers/finance/paymentController.js";

const router = express.Router();

// Fee Structure Routes (Admin only)
router.get(
  "/fee-structures",
  authenticateToken,
  feeStructureController.getAllFeeStructures,
);
router.get(
  "/fee-structures/:id",
  authenticateToken,
  feeStructureController.getFeeStructureById,
);
router.post(
  "/fee-structures",
  authenticateToken,
  authorizeRole(["admin"]),
  feeStructureController.createFeeStructure,
);
router.put(
  "/fee-structures/:id",
  authenticateToken,
  authorizeRole(["admin"]),
  feeStructureController.updateFeeStructure,
);
router.delete(
  "/fee-structures/:id",
  authenticateToken,
  authorizeRole(["admin"]),
  feeStructureController.deleteFeeStructure,
);

// Invoice Routes (Admin and Teacher can view, Admin can create/edit)
router.get("/invoices", authenticateToken, invoiceController.getAllInvoices);
router.get(
  "/invoices/:id",
  authenticateToken,
  invoiceController.getInvoiceById,
);
router.post(
  "/invoices",
  authenticateToken,
  authorizeRole(["admin"]),
  invoiceController.createInvoice,
);
router.put(
  "/invoices/:id",
  authenticateToken,
  authorizeRole(["admin"]),
  invoiceController.updateInvoice,
);
router.delete(
  "/invoices/:id",
  authenticateToken,
  authorizeRole(["admin"]),
  invoiceController.deleteInvoice,
);
router.get(
  "/students/:studentId/invoices",
  authenticateToken,
  invoiceController.getInvoicesByStudent,
);

// Payment Routes (Admin can create/edit, all authenticated users can view)
router.get("/payments", authenticateToken, paymentController.getAllPayments);
router.get(
  "/payments/:id",
  authenticateToken,
  paymentController.getPaymentById,
);
router.post(
  "/payments",
  authenticateToken,
  authorizeRole(["admin"]),
  paymentController.createPayment,
);
router.put(
  "/payments/:id",
  authenticateToken,
  authorizeRole(["admin"]),
  paymentController.updatePayment,
);
router.delete(
  "/payments/:id",
  authenticateToken,
  authorizeRole(["admin"]),
  paymentController.deletePayment,
);
router.get(
  "/invoices/:invoiceId/payments",
  authenticateToken,
  paymentController.getPaymentsByInvoice,
);
router.get(
  "/payments/statistics",
  authenticateToken,
  paymentController.getPaymentStatistics,
);

export default router;
